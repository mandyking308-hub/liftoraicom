import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

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

  it("writes research candidates only to Relationship Intelligence", () => {
    expect(discovery).toContain("relationship_intelligence_contacts");
    expect(discovery).not.toContain("email_queue");
    expect(discovery).not.toContain("smartlead");
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
    expect(importer).not.toContain("smartlead");
    expect(importer).not.toContain("from(\"contacts\")");
    expect(importer).not.toContain("email_queue");
  });

  it("writes only to the existing strategic account tables", () => {
    expect(importer).toContain("strategic_target_accounts");
    expect(importer).toContain("strategic_account_lists");
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
