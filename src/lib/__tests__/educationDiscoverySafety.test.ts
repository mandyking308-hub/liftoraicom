import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (p: string) => stripComments(readFileSync(resolve(process.cwd(), p), "utf8"));

const discovery = read("supabase/functions/apollo-education-discovery/index.ts");
const importer = read("supabase/functions/apollo-education-account-import/index.ts");
const reveal = read("supabase/functions/apollo-education-reveal/index.ts");
const syncEnrich = read("supabase/functions/apollo-sync-enrich/index.ts");
const unlockSelected = read("supabase/functions/apollo-unlock-selected/index.ts");
const autopilot = read("supabase/functions/autopilot-orchestrator/index.ts");

describe("education discovery — free search only and CRM-native", () => {
  it("references the credit-free People Search endpoint", () => {
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

  it("writes canonical candidates to contacts, not Relationship Intelligence", () => {
    expect(discovery).toContain('from("contacts")');
    expect(discovery).not.toContain("relationship_intelligence_contacts");
    expect(discovery).toContain("organisation_id");
    expect(discovery).not.toContain("email_queue");
    expect(discovery).not.toContain("smartlead.ai");
  });

  it("defaults to 10 candidates per account and caps at 25", () => {
    expect(discovery).toContain("DEFAULT_CANDIDATES_PER_ACCOUNT = 10");
    expect(discovery).toContain("MAX_CANDIDATES_PER_ACCOUNT = 25");
  });

  it("defaults to the 60-style International operator cohort", () => {
    expect(discovery).toContain('DEFAULT_QUALIFICATIONS = ["International operator"]');
  });

  it("uses canonical organisation linkage before any candidate write", () => {
    expect(discovery).toContain("existing_organisation_id");
    expect(discovery).toContain("canonical_crm_organisation_missing");
  });
});

describe("education account import — CRM organisations first", () => {
  it("is dry-run unless explicitly confirmed", () => {
    expect(importer).toContain("body.confirm !== true");
    expect(importer).toContain("founder_confirm_required");
  });

  it("recognises the reviewed CSV Account Website (Domain) header", () => {
    expect(importer).toContain("Account Website (Domain)");
  });

  it("makes no Apollo or Smartlead call and creates no contacts", () => {
    expect(importer).not.toContain("api.apollo.io");
    expect(importer).not.toContain("smartlead.ai");
    expect(importer).not.toContain("functions.invoke");
    expect(importer).not.toContain('from("contacts")');
    expect(importer).not.toContain("email_queue");
  });

  it("writes the company into organisations and links the strategic mirror", () => {
    expect(importer).toContain('from("organisations")');
    expect(importer).toContain("existing_organisation_id");
    expect(importer).toContain("canonical_company_table");
  });
});

describe("selected education reveal — same CRM contact, firewalled", () => {
  it("operates on contact ids and requires canonical organisation linkage", () => {
    expect(reveal).toContain("contact_ids");
    expect(reveal).toContain("organisation_id");
    expect(reveal).toContain("education_group_id");
  });

  it("uses the shared credit firewall before the provider call", () => {
    expect(reveal).toContain("getFirewallStatus");
    expect(reveal).toContain("reserveCredits");
    expect(reveal).toContain("settleCredits");
    expect(reveal).toContain("apollo_credit_firewall_blocked");
  });

  it("requests business email only and contains no phone/waterfall path", () => {
    expect(reveal).toContain("reveal_personal_emails=false");
    expect(reveal).not.toContain("reveal_phone");
    expect(reveal).not.toContain("bulk_match");
    expect(reveal).not.toContain("waterfall_enrichment");
  });

  it("updates the same contacts table and does not touch Smartlead or email queue", () => {
    expect(reveal).toContain('from("contacts")');
    expect(reveal).not.toContain("smartlead.ai");
    expect(reveal).not.toContain("email_queue");
  });
});

describe("legacy paid Apollo paths remain firewalled", () => {
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

  it("all legacy paid paths skip people previously returning no email", () => {
    for (const source of [syncEnrich, unlockSelected, autopilot]) {
      expect(source).toContain("loadNoEmailPersonIds");
    }
  });
});
