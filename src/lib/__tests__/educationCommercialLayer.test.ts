import { describe, it, expect } from "vitest";
import {
  EDUCATION_BUSINESSES,
  EDUCATION_BUSINESS_NAMES,
  isProtectedNonEducationBusiness,
} from "@/lib/education/educationBusinesses";
import {
  buildRelationshipUpserts,
  relevantEducationBusinesses,
  scoreBusinessRelevance,
  RELEVANCE_ENGINE_VERSION,
} from "@/lib/education/educationBusinessRelevance";
import { selectFirstProposition } from "@/lib/education/campaignPrioritisation";
import {
  cooldownFrom,
  evaluateCollision,
  DEFAULT_CROSS_BRAND_COOLDOWN_DAYS,
  HARD_BLOCK_REASON_CODES,
  OwnershipRow,
} from "@/lib/education/portfolioCollision";
import { evaluateOutreachEligibility } from "@/lib/education/outreachEligibilityGate";
import { EDUCATION_CAMPAIGN_SHELLS, shellFor } from "@/lib/education/educationCampaignShells";
import { EDUCATION_CAMPAIGN_COPY } from "@/lib/education/educationCampaignCopy";
import { BUSINESS_MANUALS, manualsForBusiness } from "@/lib/businessManuals/registry";

const SEN_DIRECTOR = { role: "Director of SEN and Inclusion", seniority: "director" };
const DIGITAL_DIRECTOR = { role: "Digital Learning Director", seniority: "director" };
const WELLBEING_LEAD = { role: "Head of Wellbeing and Pastoral Care", seniority: "head" };
const INTERNATIONAL_EXEC = { role: "International Partnerships Executive", seniority: "executive" };

const BILLY = "Billy and the Wild Forest";

function activeOwner(business: string): OwnershipRow {
  return { contact_id: "c1", business_name: business, status: "active", campaign_key: "k" };
}

describe("education businesses", () => {
  it("has exactly the four canonical businesses with exact names", () => {
    expect(EDUCATION_BUSINESS_NAMES).toEqual([
      "Billy and the Wild Forest",
      "Aurelia",
      "Kindnesss",
      "Kingsbridge Global",
    ]);
  });

  it("keeps Neon Candy protected and out of the education portfolio", () => {
    expect(isProtectedNonEducationBusiness("Neon Candy")).toBe(true);
    expect(EDUCATION_BUSINESS_NAMES).not.toContain("Neon Candy");
    // No education campaign shell or copy may reference Neon Candy.
    const blob = JSON.stringify(EDUCATION_CAMPAIGN_COPY);
    expect(blob).not.toMatch(/Neon Candy/i);
    for (const shell of EDUCATION_CAMPAIGN_SHELLS) {
      expect(shell.business_name).not.toBe("Neon Candy");
    }
  });
});

describe("business relevance scoring", () => {
  it("scores SEN especially strongly for Billy", () => {
    const billy = scoreBusinessRelevance(SEN_DIRECTOR, "billy-and-the-wild-forest");
    expect(billy.categories).toContain("sen");
    expect(billy.level).toBe("high");
    expect(billy.score).toBeGreaterThanOrEqual(60);
    expect(billy.engine_version).toBe(RELEVANCE_ENGINE_VERSION);

    const kingsbridge = scoreBusinessRelevance(SEN_DIRECTOR, "kingsbridge-global");
    expect(billy.score).toBeGreaterThan(kingsbridge.score);
  });

  it("returns zero and not_relevant for an unrelated role", () => {
    const r = scoreBusinessRelevance({ role: "Groundskeeper" }, "aurelia");
    expect(r.score).toBe(0);
    expect(r.level).toBe("not_relevant");
  });

  it("maps ONE contact to MULTIPLE businesses without duplicating the contact", () => {
    const contact = {
      id: "contact-1",
      role: "Director of Inclusion, Wellbeing and Digital Learning",
      seniority: "director",
    };
    const upserts = buildRelationshipUpserts("contact-1", contact);
    expect(upserts.length).toBeGreaterThan(1);
    // exactly one relationship row per business, all pointing at the SAME contact row
    const contactIds = new Set(upserts.map((u) => u.contact_id));
    expect(contactIds.size).toBe(1);
    const businesses = upserts.map((u) => u.business_name);
    expect(new Set(businesses).size).toBe(businesses.length);
    // relevance never implies campaign eligibility
    expect(upserts.every((u) => u.campaign_eligible === false)).toBe(true);
  });

  it("can produce up to four relationship rows for one contact", () => {
    const rows = relevantEducationBusinesses(
      { role: "Group Director of Education, Inclusion, Digital, Wellbeing and International Partnerships", seniority: "c_suite" },
      1,
    );
    expect(rows).toHaveLength(4);
  });
});

describe("campaign prioritisation", () => {
  it("SEN Director -> Billy first", () => {
    expect(selectFirstProposition(SEN_DIRECTOR).selected_business).toBe(BILLY);
  });
  it("Digital Learning Director -> Aurelia first", () => {
    expect(selectFirstProposition(DIGITAL_DIRECTOR).selected_business).toBe("Aurelia");
  });
  it("Wellbeing/Pastoral leader -> Kindnesss first", () => {
    expect(selectFirstProposition(WELLBEING_LEAD).selected_business).toBe("Kindnesss");
  });
  it("International/Partnerships executive -> Kingsbridge Global first", () => {
    expect(selectFirstProposition(INTERNATIONAL_EXEC).selected_business).toBe("Kingsbridge Global");
  });
  it("selects nothing when no business is above threshold", () => {
    const r = selectFirstProposition({ role: "Groundskeeper" });
    expect(r.selected_business).toBeNull();
    expect(r.selection_reason).toContain("no_business_above_threshold");
  });
  it("founder override changes the selection and records the reason", () => {
    const r = selectFirstProposition(SEN_DIRECTOR, {
      founderOverrideSlug: "kingsbridge-global",
      founderOverrideReason: "existing group relationship",
    });
    expect(r.selected_business).toBe("Kingsbridge Global");
    expect(r.founder_override).toBe(true);
    expect(r.selection_reason).toContain("founder_override");
  });
});

describe("cross-brand collision and ownership", () => {
  const clean = { id: "c1" };

  it("allows a clean uncontested claim", () => {
    const d = evaluateCollision({ contact: clean, requestingBusiness: BILLY });
    expect(d.decision).toBe("allowed");
    expect(d.reason_codes).toContain("no_conflict");
  });

  it("blocks a competing brand while another brand actively owns the contact", () => {
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      activeOwnership: activeOwner(BILLY),
    });
    expect(d.decision).toBe("blocked");
    expect(d.reason_codes).toContain("owned_by_other_brand");
    expect(d.overridable).toBe(true);
    expect(d.current_owner_business).toBe(BILLY);
  });

  it("treats a re-claim by the owning brand as allowed", () => {
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: BILLY,
      activeOwnership: activeOwner(BILLY),
    });
    expect(d.decision).toBe("allowed");
    expect(d.reason_codes).toContain("already_owned_by_requesting_brand");
  });

  it("blocks competing brands when a conversation/reply is active", () => {
    const d = evaluateCollision({
      contact: { id: "c1", conversation_active: true, last_replied_at: new Date().toISOString() },
      requestingBusiness: "Aurelia",
      activeOwnership: activeOwner(BILLY),
    });
    expect(d.decision).toBe("blocked");
    expect(d.hard_blocked).toBe(true);
    expect(d.reason_codes).toContain("active_conversation_block");
  });

  it("enforces a cross-brand cooldown after release", () => {
    const releasedAt = new Date();
    const cooldown = cooldownFrom(releasedAt);
    expect(Math.round((cooldown.getTime() - releasedAt.getTime()) / 86400000)).toBe(
      DEFAULT_CROSS_BRAND_COOLDOWN_DAYS,
    );
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      releasedOwnerships: [
        { contact_id: "c1", business_name: BILLY, status: "released", cooldown_until: cooldown.toISOString() },
      ],
    });
    expect(d.decision).toBe("blocked");
    expect(d.reason_codes).toContain("cross_brand_cooldown");
  });

  it("lets an expired cooldown through", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      releasedOwnerships: [
        { contact_id: "c1", business_name: BILLY, status: "released", cooldown_until: past },
      ],
    });
    expect(d.decision).toBe("allowed");
  });

  it.each([
    ["global suppression", { id: "c1", is_globally_suppressed: true }, "global_suppression"],
    ["hard bounce", { id: "c1", hard_bounced: true }, "hard_bounce"],
    ["unsubscribe", { id: "c1", unsubscribed_at: new Date().toISOString() }, "unsubscribed"],
    ["do-not-contact", { id: "c1", do_not_contact_at: new Date().toISOString() }, "do_not_contact"],
  ])("blocks every brand on %s", (_label, contact, code) => {
    for (const b of EDUCATION_BUSINESSES) {
      const d = evaluateCollision({ contact: contact as any, requestingBusiness: b.name });
      expect(d.decision).toBe("blocked");
      expect(d.hard_blocked).toBe(true);
      expect(d.reason_codes).toContain(code as any);
    }
  });

  it("founder override beats ownership and cooldown", () => {
    const d = evaluateCollision({
      contact: clean,
      requestingBusiness: "Kindnesss",
      activeOwnership: activeOwner(BILLY),
      founderOverride: true,
      founderOverrideReason: "deliberate reassignment",
    });
    expect(d.decision).toBe("allowed");
    expect(d.founder_override_applied).toBe(true);
  });

  it("founder override NEVER beats suppression, unsubscribe, DNC, bounce or an active reply", () => {
    const hardContacts = [
      { id: "c1", is_globally_suppressed: true },
      { id: "c1", hard_bounced: true },
      { id: "c1", unsubscribed_at: new Date().toISOString() },
      { id: "c1", do_not_contact_at: new Date().toISOString() },
      { id: "c1", conversation_active: true },
    ];
    for (const contact of hardContacts) {
      const d = evaluateCollision({
        contact,
        requestingBusiness: "Kindnesss",
        activeOwnership: activeOwner(BILLY),
        founderOverride: true,
        founderOverrideReason: "trying to force it",
      });
      expect(d.decision).toBe("blocked");
      expect(d.hard_blocked).toBe(true);
      expect(d.founder_override_applied).toBe(false);
      expect(d.reason_codes.some((c) => HARD_BLOCK_REASON_CODES.includes(c))).toBe(true);
    }
  });
});

describe("campaign shells", () => {
  it("has one shell per education business", () => {
    expect(EDUCATION_CAMPAIGN_SHELLS).toHaveLength(4);
  });

  it("Billy is configured for a controlled 25-50 batch but NOT live", () => {
    const billy = shellFor("billy-and-the-wild-forest");
    expect(billy.status).toBe("configured_not_live");
    expect(billy.is_live).toBe(false);
    expect(billy.external_send_blocked).toBe(true);
    expect(billy.smartlead_campaign_id).toBeNull();
    expect(billy.founder_approval_state).toBe("not_requested");
    expect(billy.batch_min).toBe(25);
    expect(billy.batch_max).toBe(50);
    expect(billy.target_role_families).toContain("sen");
    expect(billy.target_account_cohort.exclude).toContain("nurseries");
  });

  it("the other three shells are prepared but non-live", () => {
    for (const shell of EDUCATION_CAMPAIGN_SHELLS.filter((s) => s.business_slug !== "billy-and-the-wild-forest")) {
      expect(shell.status).toBe("prepared_not_live");
      expect(shell.is_live).toBe(false);
      expect(shell.external_send_blocked).toBe(true);
      expect(shell.smartlead_campaign_id).toBeNull();
      expect(shell.founder_approval_state).toBe("not_requested");
    }
  });

  it("every brand has a three-step sequence with an unsubscribe requirement", () => {
    for (const b of EDUCATION_BUSINESSES) {
      const copy = EDUCATION_CAMPAIGN_COPY[b.slug];
      expect(copy.sequence).toHaveLength(3);
      expect(copy.unsubscribe_required).toBe(true);
      copy.sequence.forEach((s) => expect(s.body).toContain("{{unsubscribe_link}}"));
    }
  });

  it("Billy copy foregrounds SEN, inclusion and artwork", () => {
    const primary = EDUCATION_CAMPAIGN_COPY["billy-and-the-wild-forest"].sequence[0];
    expect(`${primary.subject} ${primary.body}`).toMatch(/SEN/);
    expect(EDUCATION_CAMPAIGN_COPY["billy-and-the-wild-forest"].sequence.map((s) => s.body).join(" "))
      .toMatch(/artwork|illustration/i);
  });
});

describe("outreach eligibility gate", () => {
  const readyContact = {
    id: "c1",
    organisation_id: "org-1",
    email: "head@school.example",
    sendable_status: "sendable",
    email_verified_status: "valid",
  };
  const readyRelationship = {
    business_name: BILLY,
    campaign_eligible: true,
    do_not_contact: false,
    business_relevance_score: 80,
  };
  const approvedLiveCampaign = {
    campaign_key: "edu-billy-2026-q4-controlled",
    business_name: BILLY,
    founder_approval_state: "approved",
    founder_approved_at: new Date().toISOString(),
    is_live: true,
    external_send_blocked: false,
    qualification_threshold: 60,
  };
  const cleanCollision = evaluateCollision({ contact: { id: "c1" }, requestingBusiness: BILLY });
  const readyInfra = { smartlead_mapping_ready: true, sender_infrastructure_ready: true };

  it("is eligible only when every gate passes", () => {
    const r = evaluateOutreachEligibility({
      contact: readyContact,
      relationship: readyRelationship,
      campaign: approvedLiveCampaign,
      collision: cleanCollision,
      infrastructure: readyInfra,
    });
    expect(r.eligible).toBe(true);
    expect(r.blockers).toEqual([]);
  });

  it("blocks when the Smartlead mapping is not ready", () => {
    const r = evaluateOutreachEligibility({
      contact: readyContact,
      relationship: readyRelationship,
      campaign: approvedLiveCampaign,
      collision: cleanCollision,
      infrastructure: { smartlead_mapping_ready: false, sender_infrastructure_ready: true },
    });
    expect(r.eligible).toBe(false);
    expect(r.blockers).toContain("smartlead_mapping_not_ready");
  });

  it("blocks when sender infrastructure is not ready", () => {
    const r = evaluateOutreachEligibility({
      contact: readyContact,
      relationship: readyRelationship,
      campaign: approvedLiveCampaign,
      collision: cleanCollision,
      infrastructure: { smartlead_mapping_ready: true, sender_infrastructure_ready: false },
    });
    expect(r.eligible).toBe(false);
    expect(r.blockers).toContain("sender_infrastructure_not_ready");
  });

  it("blocks without a usable work email", () => {
    for (const contact of [
      { ...readyContact, email: null },
      { ...readyContact, sendable_status: "not_sendable" },
      { ...readyContact, email_verified_status: "invalid" },
    ]) {
      const r = evaluateOutreachEligibility({
        contact,
        relationship: readyRelationship,
        campaign: approvedLiveCampaign,
        collision: cleanCollision,
        infrastructure: readyInfra,
      });
      expect(r.eligible).toBe(false);
      expect(r.blockers).toContain("no_usable_work_email");
    }
  });

  it("blocks without a canonical organisation link", () => {
    const r = evaluateOutreachEligibility({
      contact: { ...readyContact, organisation_id: null },
      relationship: readyRelationship,
      campaign: approvedLiveCampaign,
      collision: cleanCollision,
      infrastructure: readyInfra,
    });
    expect(r.blockers).toContain("missing_organisation_link");
  });

  it("blocks when a collision decision is not allowed", () => {
    const blocked = evaluateCollision({
      contact: { id: "c1" },
      requestingBusiness: "Kindnesss",
      activeOwnership: activeOwner(BILLY),
    });
    const r = evaluateOutreachEligibility({
      contact: readyContact,
      relationship: { ...readyRelationship, business_name: "Kindnesss" },
      campaign: { ...approvedLiveCampaign, business_name: "Kindnesss" },
      collision: blocked,
      infrastructure: readyInfra,
    });
    expect(r.blockers).toContain("collision_blocked");
  });

  it("keeps today's shipped shells un-sendable", () => {
    const billyShell = shellFor("billy-and-the-wild-forest");
    const r = evaluateOutreachEligibility({
      contact: readyContact,
      relationship: readyRelationship,
      campaign: {
        campaign_key: billyShell.campaign_key,
        business_name: billyShell.business_name,
        founder_approval_state: billyShell.founder_approval_state,
        is_live: billyShell.is_live,
        external_send_blocked: billyShell.external_send_blocked,
        qualification_threshold: billyShell.qualification_threshold,
      },
      collision: cleanCollision,
      infrastructure: { smartlead_mapping_ready: false, sender_infrastructure_ready: false },
    });
    expect(r.send_allowed).toBe(false);
    expect(r.blockers).toEqual(
      expect.arrayContaining([
        "campaign_not_approved",
        "campaign_not_live",
        "external_send_blocked",
        "smartlead_mapping_not_ready",
        "sender_infrastructure_not_ready",
      ]),
    );
  });
});

describe("business manual registry parity", () => {
  it("registers exactly 12 manuals", () => {
    expect(BUSINESS_MANUALS).toHaveLength(12);
  });

  it("registers exactly three manuals per business with no duplicates", () => {
    for (const b of EDUCATION_BUSINESSES) {
      const manuals = manualsForBusiness(b.slug);
      expect(manuals).toHaveLength(3);
      expect(new Set(manuals.map((m) => m.kind)).size).toBe(3);
    }
    expect(new Set(BUSINESS_MANUALS.map((m) => m.github_path)).size).toBe(12);
  });

  it("every manual points at its canonical GitHub path and has real content", () => {
    for (const m of BUSINESS_MANUALS) {
      expect(m.github_path).toBe(`docs/business-manuals/${m.business_slug}/${m.kind}.md`);
      expect(m.content.length).toBeGreaterThan(400);
      expect(m.content.trimStart().startsWith("#")).toBe(true);
    }
  });

  it("customer-facing manuals expose no internal technical detail", () => {
    const forbidden = [/public\./, /RLS/, /supabase/i, /Apollo/i, /Smartlead/i, /firewall/i, /service_role/];
    for (const m of BUSINESS_MANUALS.filter((x) => x.kind === "customer-facing-manual")) {
      for (const rx of forbidden) expect(m.content).not.toMatch(rx);
    }
  });

  it("carries each brand's positioning line", () => {
    const aurelia = BUSINESS_MANUALS.find((m) => m.business_slug === "aurelia" && m.kind === "customer-facing-manual")!;
    expect(aurelia.content).toContain("Create. Learn. Achieve. Safely.");
    const kind = BUSINESS_MANUALS.find((m) => m.business_slug === "kindnesss" && m.kind === "customer-facing-manual")!;
    expect(kind.content).toContain("Small acts. Big hearts.");
    const kb = BUSINESS_MANUALS.find((m) => m.business_slug === "kingsbridge-global" && m.kind === "customer-facing-manual")!;
    expect(kb.content).toContain("Education Without Borders");
    const billy = BUSINESS_MANUALS.find((m) => m.business_slug === "billy-and-the-wild-forest" && m.kind === "customer-facing-manual")!;
    expect(billy.content).toMatch(/SEN/);
    expect(billy.content).toMatch(/artwork|illustrat/i);
  });
});
