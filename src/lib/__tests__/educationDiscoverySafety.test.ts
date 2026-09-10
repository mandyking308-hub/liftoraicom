import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Strip comments so prose like "no /people/match" cannot mask a real call.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (p: string) => stripComments(readFileSync(resolve(process.cwd(), p), "utf8"));

const discovery = read("supabase/functions/apollo-education-discovery/index.ts");
const importer = read("supabase/functions/apollo-education-account-import/index.ts");
const syncEnrich = read("supabase/functions/apollo-sync-enrich/index.ts");
const unlockSelected = read("supabase/functions/apollo-unlock-selected/index.ts");
const autopilot = read("supabase/functions/autopilot-orchestrator/index.ts");

describe("education discovery — free search only", () => {
  it("references only the credit-free People Search endpoint", () => {
    expect(discovery).toContain("mixed_people/api_search");
  });

  it("never references a paid Apollo endpoint", () => {
    expect(discovery).not.toContain("people/match");
    expect(discovery).not.toContain("bulk_match");
    expect(discovery).not.toContain("reveal_phone");
    expect(discovery).not.toContain("waterfall");
  });

  it("defaults to dry-run and reports zero provider calls in that mode", () => {
    expect(discovery).toContain("body.dry_run !== false && body.confirm !== true");
    expect(discovery).toContain("provider_calls: 0");
  });

  it("writes research candidates into the master CRM, not Relationship Intelligence", () => {
    expect(discovery).toContain('from("contacts")');
    expect(discovery).toContain("organisation_id");
    expect(discovery).not.toContain("relationship_intelligence_contacts");
    expect(discovery).not.toContain("email_queue");
    expect(discovery).not.toContain("smartlead.ai");
  });

  it("creates CRM research candidates as non-sendable with no email", () => {
    expect(discovery).toContain('sendable_status: "not_sendable"');
    expect(discovery).toContain('reveal_status: "not_revealed"');
    expect(discovery).toContain("is_research_candidate: true");
  });

  it("dedupes by Apollo person id and never writes email or suppression fields", () => {
    expect(discovery).toContain('eq("apollo_person_id", apolloId)');
    expect(discovery).not.toContain("is_globally_suppressed:");
    expect(discovery).not.toContain("hard_bounced:");
    expect(discovery).not.toContain("email:");
  });

  it("defaults to 10 candidates per account with a configurable maximum of 25", () => {
    expect(discovery).toContain("const DEFAULT_CANDIDATES_PER_ACCOUNT = 10;");
    expect(discovery).toContain("const MAX_CANDIDATES_PER_ACCOUNT = 25;");
  });

  it("requires a founder or admin role", () => {
    expect(discovery).toContain("founder_role_required");
  });
});

describe("education account import — safe by default", () => {
  it("is dry-run unless explicitly confirmed", () => {
    expect(importer).toContain("body.confirm !== true");
    expect(importer).toContain("founder_confirm_required");
  });

  it("makes no Apollo or Smartlead call and creates no contacts", () => {
    expect(importer).not.toContain("api.apollo.io");
    expect(importer).not.toContain("smartlead.ai");
    expect(importer).not.toContain("functions.invoke");
    expect(importer).not.toContain("from(\"contacts\")");
    expect(importer).not.toContain("email_queue");
  });

  it("writes only to the existing strategic account and CRM organisation tables", () => {
    expect(importer).toContain("strategic_target_accounts");
    expect(importer).toContain("strategic_account_lists");
    expect(importer).toContain('from("organisations")');
  });

  it("resolves the canonical CRM organisation before linking the strategic account", () => {
    const orgIndex = importer.indexOf('from("organisations")');
    const staWrite = importer.indexOf('from("strategic_target_accounts").update');
    expect(orgIndex).toBeGreaterThan(-1);
    expect(orgIndex).toBeLessThan(staWrite);
    expect(importer).toContain("existing_organisation_id");
  });
});

describe("paid Apollo paths are firewalled", () => {
  it.each([
    ["apollo-sync-enrich", syncEnrich],
    ["apollo-unlock-selected", unlockSelected],
    ["autopilot-orchestrator", autopilot],
  ])("%s imports and uses the shared credit firewall", (_name, source) => {
    expect(source).toContain("_shared/apolloCreditFirewall.ts");
    expect(source).toContain("reserveCredits");
    expect(source).toContain("settleCredits");
    expect(source).toContain("getFirewallStatus");
  });

  it("apollo-sync-enrich cannot re-charge a person already covered by a bulk batch", () => {
    expect(syncEnrich).toContain("bulkChargedIds");
    expect(syncEnrich).toContain("already_charged_in_bulk_skipped");
  });

  it("all paid paths skip people previously returning no email", () => {
    for (const source of [syncEnrich, unlockSelected, autopilot]) {
      expect(source).toContain("loadNoEmailPersonIds");
    }
  });
});

describe("founder-selected education reveal — CRM-native and firewalled", () => {
  const reveal = read("supabase/functions/apollo-education-reveal-selected/index.ts");

  it("operates on CRM contact ids", () => {
    expect(reveal).toContain("contact_ids");
    expect(reveal).toContain('from("contacts")');
  });

  it("routes every paid call through the shared firewall", () => {
    expect(reveal).toContain("_shared/apolloCreditFirewall.ts");
    expect(reveal).toContain("reserveCredits");
    expect(reveal).toContain("settleCredits");
    expect(reveal).toContain("releaseCredits");
    expect(reveal).toContain("loadNoEmailPersonIds");
  });

  it("is business email only — no phone, personal email or waterfall", () => {
    expect(reveal).toContain("reveal_personal_emails: false");
    expect(reveal).toContain("reveal_phone_number: false");
    expect(reveal).not.toContain("waterfall");
    expect(reveal).not.toContain("bulk_match");
  });

  it("fails closed while the portfolio firewall is locked", () => {
    expect(reveal).toContain("paid_enrichment_enabled");
    expect(reveal).toContain("hard_credit_limit <= 0");
    expect(reveal).toContain("apollo_credit_firewall_blocked");
  });

  it("blocks duplicate business emails instead of merging", () => {
    expect(reveal).toContain('reveal_status: "duplicate_email_blocked"');
    expect(reveal).toContain('sendable_status: "duplicate"');
  });

  it("never sends, queues or auto-assigns a portfolio business", () => {
    expect(reveal).not.toContain("assigned_business:");
    expect(reveal).not.toContain("email_queue");
    expect(reveal).not.toContain("smartlead.ai");
    expect(reveal).toContain("emails_sent: 0");
  });

  it("requires founder confirmation and defaults to dry-run", () => {
    expect(reveal).toContain("founder_confirm_required");
    expect(reveal).toContain("founder_role_required");
  });
});
