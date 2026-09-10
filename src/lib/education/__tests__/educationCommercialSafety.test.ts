import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  EDUCATION_BUSINESSES,
  EDUCATION_BUSINESS_NAMES,
  isProtectedNonEducationBusiness,
} from "../educationBusinesses";
import {
  RELEVANCE_QUALIFICATION_THRESHOLD,
  buildRelationshipUpserts,
  relevantEducationBusinesses,
  scoreBusinessRelevance,
} from "../educationBusinessRelevance";
import { rankEducationBusinesses, selectFirstProposition } from "../campaignPrioritisation";
import {
  CollisionDecision,
  DEFAULT_CROSS_BRAND_COOLDOWN_DAYS,
  HARD_BLOCK_REASON_CODES,
  cooldownFrom,
  evaluateCollision,
} from "../portfolioCollision";
import { evaluateOutreachEligibility } from "../outreachEligibilityGate";
import { EDUCATION_CAMPAIGN_SHELLS, shellFor, shellToDraftRow } from "../educationCampaignShells";
import { EDUCATION_CAMPAIGN_COPY } from "../educationCampaignCopy";

const NOW = new Date("2026-09-10T12:00:00Z");

const allowedCollision: CollisionDecision = {
  decision: "allowed",
  reason_codes: ["no_conflict"],
  hard_blocked: false,
  overridable: true,
  founder_override_applied: false,
  current_owner_business: null,
  current_owner_campaign_key: null,
  cooldown_until: null,
  engine_version: "edu-collision-1.0.0",
  explanation: "No portfolio collision.",
};

// ---------------------------------------------------------------- businesses
describe("education businesses", () => {
  it("contains exactly the four canonical brands with exact names", () => {
    expect(EDUCATION_BUSINESS_NAMES).toEqual([
      "Billy and the Wild Forest",
      "Aurelia",
      "Kindnesss",
      "Kingsbridge Global",
    ]);
  });

  it("treats Neon Candy as a protected non-education business", () => {
    expect(isProtectedNonEducationBusiness("Neon Candy")).toBe(true);
    EDUCATION_BUSINESS_NAMES.forEach((n) => expect(isProtectedNonEducationBusiness(n)).toBe(false));
  });
});

// ------------------------------------------------- multi-brand relevance/BCR
describe("multi-brand relevance without duplicating contacts", () => {
  const senWellbeingLead = {
    id: "c-1",
    role: "Director of Inclusion, SEND and Student Wellbeing",
    seniority: "director",
    organisation_name: "Northbridge Education Trust",
  };

  it("can qualify one contact for multiple brands", () => {
    const relevant = relevantEducationBusinesses(senWellbeingLead);
    expect(relevant.length).toBeGreaterThan(1);
  });

  it("emits exactly one relationship row per brand and never duplicates the contact", () => {
    const rows = buildRelationshipUpserts("c-1", senWellbeingLead);
    const contactIds = new Set(rows.map((r) => r.contact_id));
    const businesses = rows.map((r) => r.business_name);
    expect(contactIds.size).toBe(1);
    expect(new Set(businesses).size).toBe(businesses.length);
    rows.forEach((r) => expect(EDUCATION_BUSINESS_NAMES).toContain(r.business_name));
  });

  it("never marks a relationship campaign_eligible from relevance alone", () => {
    buildRelationshipUpserts("c-1", senWellbeingLead).forEach((r) =>
      expect(r.campaign_eligible).toBe(false),
    );
  });

  it("persists a deterministic reason and category set", () => {
    const a = buildRelationshipUpserts("c-1", senWellbeingLead);
    const b = buildRelationshipUpserts("c-1", senWellbeingLead);
    expect(a).toEqual(b);
    expect(a[0].business_relevance_reasons.length).toBeGreaterThan(0);
    expect(a[0].business_relevance_categories.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------ brand weighting
describe("brand relevance weighting", () => {
  it("Billy scores SEN/inclusion roles highest of the four", () => {
    const senco = { role: "SENCo and Inclusion Lead", seniority: "head" };
    const ranked = rankEducationBusinesses(senco);
    expect(ranked[0].business_slug).toBe("billy-and-the-wild-forest");
    expect(ranked[0].categories).toContain("sen");
  });

  it("Aurelia leads on digital learning / safeguarding technology", () => {
    const ranked = rankEducationBusinesses({ role: "Director of Digital Learning and EdTech", seniority: "director" });
    expect(ranked[0].business_slug).toBe("aurelia");
  });

  it("Kindnesss leads on wellbeing / pastoral / PSHE", () => {
    const ranked = rankEducationBusinesses({ role: "Head of Pastoral Care and PSHE", seniority: "head" });
    expect(ranked[0].business_slug).toBe("kindnesss");
  });

  it("Kingsbridge Global leads on international / partnerships", () => {
    const ranked = rankEducationBusinesses({
      role: "Group Director of International Partnerships",
      seniority: "director",
    });
    expect(ranked[0].business_slug).toBe("kingsbridge-global");
  });

  it("is separate from the campaign-neutral Apollo education_role_score", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/education/educationBusinessRelevance.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/educationRoleScorer|education_role_score\s*=/);
  });

  it("returns not_relevant for an unrelated role", () => {
    const r = scoreBusinessRelevance({ role: "Groundskeeper" }, "billy-and-the-wild-forest");
    expect(r.score).toBe(0);
    expect(r.level).toBe("not_relevant");
  });
});

// ------------------------------------------------------------- prioritisation
describe("deterministic first-proposition selection", () => {
  const contact = { role: "Director of Inclusion and Wellbeing", seniority: "director" };

  it("is stable across repeated evaluation", () => {
    const a = selectFirstProposition(contact);
    const b = selectFirstProposition(contact);
    expect(a.selected_slug).toBe(b.selected_slug);
    expect(a.selection_reason).toBe(b.selection_reason);
  });

  it("selects nothing when no brand clears the threshold", () => {
    const r = selectFirstProposition({ role: "Groundskeeper" });
    expect(r.selected_slug).toBeNull();
    expect(r.selection_reason).toContain("no_business_above_threshold");
  });

  it("honours a founder override of prioritisation and records the reason", () => {
    const r = selectFirstProposition(contact, {
      founderOverrideSlug: "kingsbridge-global",
      founderOverrideReason: "founder relationship",
    });
    expect(r.selected_slug).toBe("kingsbridge-global");
    expect(r.founder_override).toBe(true);
    expect(r.selection_reason).toContain("founder_override");
  });

  it("uses the documented tie-break order when scores are equal", () => {
    const ranked = rankEducationBusinesses(contact);
    for (let i = 1; i < ranked.length; i++) {
      if (ranked[i].score === ranked[i - 1].score) {
        const order = EDUCATION_BUSINESSES.map((b) => b.slug);
        expect(order.indexOf(ranked[i - 1].business_slug)).toBeLessThan(order.indexOf(ranked[i].business_slug));
      }
    }
  });
});

// ------------------------------------------------------- collision / ownership
describe("portfolio collision and ownership safety", () => {
  const clean = { id: "c-9" };

  it("allows a clean uncontested claim", () => {
    const d = evaluateCollision({ contact: clean, requestingBusiness: "Aurelia", now: NOW });
    expect(d.decision).toBe("allowed");
    expect(d.reason_codes).toEqual(["no_conflict"]);
  });

  it("blocks a competing brand while another brand actively owns the contact", () => {
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Aurelia",
      activeOwnership: {
        contact_id: "c-9",
        business_name: "Billy and the Wild Forest",
        campaign_key: "edu-billy-2026-q4-controlled",
        status: "active",
      },
      now: NOW,
    });
    expect(d.decision).toBe("blocked");
    expect(d.reason_codes).toContain("owned_by_other_brand");
    expect(d.current_owner_business).toBe("Billy and the Wild Forest");
    expect(d.current_owner_campaign_key).toBe("edu-billy-2026-q4-controlled");
  });

  it("allows the owning brand to continue with its own contact", () => {
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Billy and the Wild Forest",
      activeOwnership: {
        contact_id: "c-9",
        business_name: "Billy and the Wild Forest",
        status: "active",
      },
      now: NOW,
    });
    expect(d.decision).toBe("allowed");
    expect(d.reason_codes).toContain("already_owned_by_requesting_brand");
  });

  it("hard-blocks a competing brand when a conversation is active", () => {
    const d = evaluateCollision({
      contact: { id: "c-9", conversation_active: true },
      requestingBusiness: "Kindnesss",
      activeOwnership: { contact_id: "c-9", business_name: "Aurelia", status: "active" },
      now: NOW,
    });
    expect(d.hard_blocked).toBe(true);
    expect(d.reason_codes).toContain("active_conversation_block");
  });

  it("enforces the 30-day configurable cross-brand cooldown", () => {
    expect(DEFAULT_CROSS_BRAND_COOLDOWN_DAYS).toBe(30);
    const released = new Date("2026-09-01T00:00:00Z");
    const cooldownUntil = cooldownFrom(released).toISOString();
    const inside = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      releasedOwnerships: [
        { contact_id: "c-9", business_name: "Aurelia", status: "released", cooldown_until: cooldownUntil },
      ],
      now: NOW,
    });
    expect(inside.decision).toBe("blocked");
    expect(inside.reason_codes).toContain("cross_brand_cooldown");

    const after = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      releasedOwnerships: [
        { contact_id: "c-9", business_name: "Aurelia", status: "released", cooldown_until: cooldownUntil },
      ],
      now: new Date("2026-10-20T00:00:00Z"),
    });
    expect(after.decision).toBe("allowed");
  });

  it.each([
    ["global_suppression", { is_globally_suppressed: true }],
    ["hard_bounce", { hard_bounced: true }],
    ["unsubscribed", { unsubscribed_at: "2026-08-01T00:00:00Z" }],
    ["do_not_contact", { do_not_contact_at: "2026-08-01T00:00:00Z" }],
  ])("hard-blocks every brand on %s", (code, patch) => {
    const d = evaluateCollision({
      contact: { id: "c-9", ...(patch as Record<string, unknown>) },
      requestingBusiness: "Billy and the Wild Forest",
      now: NOW,
    });
    expect(d.decision).toBe("blocked");
    expect(d.hard_blocked).toBe(true);
    expect(d.reason_codes).toContain(code);
    expect(HARD_BLOCK_REASON_CODES).toContain(code as never);
  });

  it("lets a founder override beat ownership and cooldown, with an audit trail", () => {
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      activeOwnership: { contact_id: "c-9", business_name: "Aurelia", status: "active" },
      founderOverride: true,
      founderOverrideReason: "founder knows this head personally",
      now: NOW,
    });
    expect(d.decision).toBe("allowed");
    expect(d.founder_override_applied).toBe(true);
    expect(d.explanation).toContain("founder knows this head personally");
  });

  it.each([
    ["global suppression", { is_globally_suppressed: true }],
    ["hard bounce", { hard_bounced: true }],
    ["unsubscribe", { unsubscribed_at: "2026-08-01T00:00:00Z" }],
    ["do-not-contact", { do_not_contact_at: "2026-08-01T00:00:00Z" }],
    ["active conversation", { conversation_active: true }],
  ])("never lets a founder override bypass %s", (_label, patch) => {
    const d = evaluateCollision({
      contact: { id: "c-9", ...(patch as Record<string, unknown>) },
      requestingBusiness: "Kindnesss",
      activeOwnership: { contact_id: "c-9", business_name: "Aurelia", status: "active" },
      founderOverride: true,
      founderOverrideReason: "founder insists",
      now: NOW,
    });
    expect(d.decision).toBe("blocked");
    expect(d.hard_blocked).toBe(true);
    expect(d.founder_override_applied).toBe(false);
    expect(d.overridable).toBe(false);
  });
});

// ---------------------------------------------------------- eligibility gate
describe("outreach eligibility preflight", () => {
  const readyCampaign = {
    campaign_key: "edu-billy-2026-q4-controlled",
    business_name: "Billy and the Wild Forest",
    founder_approval_state: "approved",
    founder_approved_at: "2026-09-09T00:00:00Z",
    is_live: true,
    external_send_blocked: false,
    qualification_threshold: 40,
  };
  const readyContact = {
    id: "c-2",
    organisation_id: "org-1",
    email: "senco@northbridge.ac.uk",
    sendable_status: "sendable",
    email_verified_status: "valid",
  };
  const readyRelationship = {
    business_name: "Billy and the Wild Forest",
    campaign_eligible: true,
    business_relevance_score: 72,
  };
  const readyInfra = { smartlead_mapping_ready: true, sender_infrastructure_ready: true };

  const evaluate = (over: Record<string, unknown> = {}) =>
    evaluateOutreachEligibility({
      contact: readyContact,
      relationship: readyRelationship,
      campaign: readyCampaign,
      collision: allowedCollision,
      infrastructure: readyInfra,
      ...(over as never),
    });

  it("is eligible only when every gate passes", () => {
    const r = evaluate();
    expect(r.eligible).toBe(true);
    expect(r.send_allowed).toBe(true);
    expect(r.blockers).toEqual([]);
  });

  it("blocks a contact with no canonical organisation", () => {
    const r = evaluate({ contact: { ...readyContact, organisation_id: null } });
    expect(r.blockers).toContain("missing_organisation_link");
  });

  it("blocks when there is no eligible business relationship", () => {
    expect(evaluate({ relationship: null }).blockers).toContain("no_business_relationship");
    expect(
      evaluate({ relationship: { ...readyRelationship, campaign_eligible: false } }).blockers,
    ).toContain("relationship_not_eligible");
    expect(
      evaluate({ relationship: { ...readyRelationship, business_relevance_score: 10 } }).blockers,
    ).toContain("relationship_not_eligible");
  });

  it.each([
    ["globally_suppressed", { is_globally_suppressed: true }],
    ["hard_bounced", { hard_bounced: true }],
    ["unsubscribed_or_dnc", { unsubscribed_at: "2026-08-01T00:00:00Z" }],
    ["unsubscribed_or_dnc", { do_not_contact_at: "2026-08-01T00:00:00Z" }],
  ])("blocks on %s", (code, patch) => {
    const r = evaluate({ contact: { ...readyContact, ...(patch as Record<string, unknown>) } });
    expect(r.blockers).toContain(code);
    expect(r.eligible).toBe(false);
  });

  it("blocks when the collision engine blocks", () => {
    const r = evaluate({
      collision: { ...allowedCollision, decision: "blocked", reason_codes: ["owned_by_other_brand"] },
    });
    expect(r.blockers).toContain("collision_blocked");
  });

  it("requires a usable work email for live sending", () => {
    expect(evaluate({ contact: { ...readyContact, email: null } }).blockers).toContain("no_usable_work_email");
    expect(
      evaluate({ contact: { ...readyContact, sendable_status: "not_sendable" } }).blockers,
    ).toContain("no_usable_work_email");
    expect(
      evaluate({ contact: { ...readyContact, email_verified_status: "invalid" } }).blockers,
    ).toContain("no_usable_work_email");
  });

  it("requires founder approval, a live campaign and no external send block", () => {
    expect(
      evaluate({ campaign: { ...readyCampaign, founder_approval_state: "not_requested", founder_approved_at: null } })
        .blockers,
    ).toContain("campaign_not_approved");
    expect(evaluate({ campaign: { ...readyCampaign, is_live: false } }).blockers).toContain("campaign_not_live");
    expect(evaluate({ campaign: { ...readyCampaign, external_send_blocked: true } }).blockers).toContain(
      "external_send_blocked",
    );
  });

  it("requires provider mapping and sender readiness", () => {
    const r = evaluate({ infrastructure: { smartlead_mapping_ready: false, sender_infrastructure_ready: false } });
    expect(r.blockers).toContain("smartlead_mapping_not_ready");
    expect(r.blockers).toContain("sender_infrastructure_not_ready");
    expect(r.send_allowed).toBe(false);
  });

  it("blocks today's real shell state for every brand", () => {
    EDUCATION_CAMPAIGN_SHELLS.forEach((shell) => {
      const r = evaluateOutreachEligibility({
        contact: readyContact,
        relationship: { ...readyRelationship, business_name: shell.business_name, campaign_eligible: true },
        campaign: {
          campaign_key: shell.campaign_key,
          business_name: shell.business_name,
          founder_approval_state: shell.founder_approval_state,
          is_live: shell.is_live,
          external_send_blocked: shell.external_send_blocked,
          qualification_threshold: shell.qualification_threshold,
        },
        collision: allowedCollision,
        infrastructure: { smartlead_mapping_ready: false, sender_infrastructure_ready: false },
      });
      expect(r.send_allowed).toBe(false);
    });
  });
});

// -------------------------------------------------------------- campaign shells
describe("education campaign shells", () => {
  it("defines exactly four shells, one per brand", () => {
    expect(EDUCATION_CAMPAIGN_SHELLS).toHaveLength(4);
    expect(EDUCATION_CAMPAIGN_SHELLS.map((s) => s.business_name)).toEqual(EDUCATION_BUSINESS_NAMES);
  });

  it("keeps Billy configured but NOT live and send-blocked", () => {
    const billy = shellFor("billy-and-the-wild-forest");
    expect(billy.is_live).toBe(false);
    expect(billy.external_send_blocked).toBe(true);
    expect(billy.smartlead_campaign_id).toBeNull();
    expect(billy.smartlead_mapping_status).toBe("not_mapped");
    expect(billy.founder_approval_state).toBe("not_requested");
    expect(billy.batch_min).toBe(25);
    expect(billy.batch_max).toBe(50);
    expect(billy.target_role_families).toContain("sen");
  });

  it("keeps the other three brands as non-live prepared shells", () => {
    EDUCATION_CAMPAIGN_SHELLS.filter((s) => s.business_slug !== "billy-and-the-wild-forest").forEach((s) => {
      expect(s.is_live).toBe(false);
      expect(s.external_send_blocked).toBe(true);
      expect(s.smartlead_campaign_id).toBeNull();
      expect(s.founder_approval_state).toBe("not_requested");
    });
  });

  it("targets large groups, primary, secondary and sixth form and excludes nurseries", () => {
    EDUCATION_CAMPAIGN_SHELLS.forEach((s) => {
      const include = s.target_account_cohort.include.join(" ").toLowerCase();
      const exclude = s.target_account_cohort.exclude.join(" ").toLowerCase();
      expect(include).toContain("primary");
      expect(include).toContain("secondary");
      expect(include).toContain("sixth form");
      expect(exclude).toContain("nurser");
      expect(s.exclusions.join(" ")).toContain("Neon Candy");
    });
  });

  it("writes a draft row that can never imply an approved live send", () => {
    const row = shellToDraftRow(shellFor("aurelia"), "biz-1");
    expect(row.external_send_blocked).toBe(true);
    expect(row.is_live).toBe(false);
    expect(row.founder_approved_at).toBeNull();
    expect(row.smartlead_campaign_id).toBeNull();
    expect(row.collision_protection_enabled).toBe(true);
    expect(row.unsubscribe_required).toBe(true);
    expect(row.email_sequence).toHaveLength(3);
  });
});

// ------------------------------------------------------------------ brand copy
describe("campaign copy", () => {
  it("gives every brand a distinct 3-step sequence", () => {
    const subjects = new Set<string>();
    EDUCATION_BUSINESSES.forEach((b) => {
      const copy = EDUCATION_CAMPAIGN_COPY[b.slug];
      expect(copy.sequence).toHaveLength(3);
      copy.sequence.forEach((s) => {
        expect(s.body.length).toBeGreaterThan(80);
        subjects.add(s.subject);
      });
    });
    expect(subjects.size).toBe(12);
  });

  it("Billy copy leads on SEN, inclusion, emotional understanding, literacy and illustration", () => {
    const text = EDUCATION_CAMPAIGN_COPY["billy-and-the-wild-forest"].sequence
      .map((s) => `${s.subject} ${s.body}`)
      .join(" ")
      .toLowerCase();
    expect(text).toContain("sen");
    expect(text).toContain("inclusion");
    expect(text).toContain("emotional");
    expect(text).toMatch(/reading|literacy/);
    expect(text).toMatch(/illustrat|artwork/);
  });

  it("makes no measurable outcome claims", () => {
    Object.values(EDUCATION_CAMPAIGN_COPY).forEach((copy) => {
      const text = copy.sequence.map((s) => `${s.subject} ${s.body}`).join(" ").toLowerCase();
      expect(text).not.toMatch(/guarantee|proven to|% improvement|\d+% (increase|uplift|better)|raises attainment/);
    });
  });

  it("keeps unsubscribe required for every brand", () => {
    Object.values(EDUCATION_CAMPAIGN_COPY).forEach((c) => expect(c.unsubscribe_required).toBe(true));
  });
});

// ------------------------------------------------------- Neon Candy protection
describe("Neon Candy segregation", () => {
  const sources = [
    "educationBusinesses.ts",
    "educationBusinessRelevance.ts",
    "campaignPrioritisation.ts",
    "portfolioCollision.ts",
    "outreachEligibilityGate.ts",
    "educationCampaignShells.ts",
    "educationCampaignCopy.ts",
    "educationFunnelAnalytics.ts",
  ].map((f) => fs.readFileSync(path.join(process.cwd(), "src/lib/education", f), "utf8"));

  it("never targets, writes to or references Neon Candy except as a protected exclusion", () => {
    sources.forEach((src) => {
      src.split("\n").forEach((line) => {
        if (!line.includes("Neon Candy")) return;
        expect(line).toMatch(/protected|exclusion|never|NON_EDUCATION/i);
      });
    });
  });

  it("never calls Apollo, Smartlead or any send path from the commercial layer", () => {
    sources.forEach((src) => {
      expect(src).not.toMatch(/apollo\.io|api\.smartlead|functions\.invoke\(\s*["'](apollo|smartlead)/i);
      expect(src).not.toMatch(/sendEmail|send_email|\.send\(/);
    });
  });

  it("does not modify the Apollo credit firewall", () => {
    sources.forEach((src) => {
      expect(src).not.toMatch(/apollo_portfolio_credit_policy|hard_credit_limit|paid_enrichment_enabled/);
    });
  });
});

// -------------------------------------------------------------- funnel reuse
describe("funnel analytics", () => {
  it("reads the shared funnel view rather than creating a silo table", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/education/educationFunnelAnalytics.ts"),
      "utf8",
    );
    expect(src).toContain("education_commercial_funnel");
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});

// ---------------------------------------------------- relevance threshold sanity
describe("qualification threshold", () => {
  it("exposes a single shared threshold used by the shells", () => {
    EDUCATION_CAMPAIGN_SHELLS.forEach((s) =>
      expect(s.qualification_threshold).toBeGreaterThanOrEqual(RELEVANCE_QUALIFICATION_THRESHOLD),
    );
  });
});
