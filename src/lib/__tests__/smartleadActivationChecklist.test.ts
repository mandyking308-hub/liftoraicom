import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SMARTLEAD_CHECKLIST_KEYS,
  computeActivationChecklist,
  type ChecklistInput,
} from "../../../supabase/functions/_shared/smartleadActivationChecklist.ts";

const refresh = readFileSync(
  resolve(process.cwd(), "supabase/functions/smartlead-activation-refresh/index.ts"),
  "utf8",
);

const MANDATED = [
  "provider_connection",
  "webhook_configured",
  "campaign_mapping_ready",
  "lead_mapping_ready",
  "event_return_ready",
  "sending_domains_ready",
  "mailbox_estate_ready",
  "warmup_ready",
  "sender_caps_ready",
  "suppression_sync_ready",
  "first_end_to_end_test_ready",
  "live_launch_approval",
];

const baseInput = (over: Partial<ChecklistInput> = {}): ChecklistInput => ({
  business_name: "Billy the Wild Forest",
  business_id: "b-1",
  liftor_campaign_id: "c-1",
  provider_campaign_id: null,
  provider_connected: true,
  provider_credentials_present: true,
  provider_health_ok: true,
  webhook_configured: false,
  webhook_receiver_deployed: true,
  campaign_mapped: false,
  campaign_mapping_ambiguous: false,
  lead_mapping_schema_ready: true,
  eligible_lead_count: 0,
  sending_domain_count: 0,
  mailbox_count: 0,
  provider_ready_mailbox_count: 0,
  warmup_ready_mailbox_count: 0,
  mailboxes_with_effective_cap_count: 0,
  suppression_sync_enforced: true,
  dry_run_passed: false,
  founder_live_launch_approved: false,
  ...over,
});

const byKey = (input: ChecklistInput) =>
  Object.fromEntries(computeActivationChecklist(input).map((i) => [i.key, i]));

describe("smartlead activation checklist keys", () => {
  it("exposes exactly the 12 mandated canonical keys in order", () => {
    expect([...SMARTLEAD_CHECKLIST_KEYS]).toEqual(MANDATED);
  });

  it("returns exactly 12 items with labels", () => {
    const items = computeActivationChecklist(baseInput());
    expect(items).toHaveLength(12);
    items.forEach((i) => expect(i.label.length).toBeGreaterThan(0));
  });
});

describe("smartlead activation checklist truth today", () => {
  it("reports the provider connected but everything downstream unready", () => {
    const c = byKey(baseInput());
    expect(c.provider_connection.status).toBe("ready");
    expect(c.webhook_configured.status).toBe("not_ready");
    expect(c.event_return_ready.status).toBe("not_ready");
    expect(c.sending_domains_ready.status).toBe("not_ready");
    expect(c.mailbox_estate_ready.status).toBe("blocked");
    expect(c.warmup_ready.status).toBe("blocked");
    expect(c.sender_caps_ready.status).toBe("blocked");
    expect(c.first_end_to_end_test_ready.status).toBe("not_ready");
    expect(c.live_launch_approval.status).toBe("blocked");
  });

  it("blocks the provider check when credentials or health are missing", () => {
    expect(byKey(baseInput({ provider_credentials_present: false })).provider_connection.status).toBe("blocked");
    expect(byKey(baseInput({ provider_health_ok: false })).provider_connection.status).toBe("blocked");
  });

  it("fails closed when campaign mapping is ambiguous", () => {
    const c = byKey(baseInput({ campaign_mapped: true, campaign_mapping_ambiguous: true }));
    expect(c.campaign_mapping_ready.status).toBe("blocked");
    expect(c.campaign_mapping_ready.blocker_reason).toBe("ambiguous_provider_campaign_resolution");
  });

  it("requires eligible leads before lead mapping is ready", () => {
    expect(byKey(baseInput({ eligible_lead_count: 0 })).lead_mapping_ready.status).toBe("not_ready");
    expect(byKey(baseInput({ eligible_lead_count: 5 })).lead_mapping_ready.status).toBe("ready");
  });

  it("requires both the Liftor receiver and the external webhook for event return", () => {
    expect(byKey(baseInput({ webhook_receiver_deployed: false })).event_return_ready.status).toBe("blocked");
    expect(byKey(baseInput({ webhook_configured: true })).event_return_ready.status).toBe("ready");
  });

  it("only marks estate, warmup and caps ready when every mailbox qualifies", () => {
    const partial = byKey(
      baseInput({
        mailbox_count: 50,
        provider_ready_mailbox_count: 49,
        warmup_ready_mailbox_count: 10,
        mailboxes_with_effective_cap_count: 50,
      }),
    );
    expect(partial.mailbox_estate_ready.status).toBe("not_ready");
    expect(partial.warmup_ready.status).toBe("not_ready");
    expect(partial.sender_caps_ready.status).toBe("ready");

    const full = byKey(
      baseInput({
        mailbox_count: 50,
        provider_ready_mailbox_count: 50,
        warmup_ready_mailbox_count: 50,
        mailboxes_with_effective_cap_count: 50,
      }),
    );
    expect(full.mailbox_estate_ready.status).toBe("ready");
    expect(full.warmup_ready.status).toBe("ready");
  });

  it("blocks suppression sync when the CRM gate is not enforced", () => {
    expect(byKey(baseInput({ suppression_sync_enforced: false })).suppression_sync_ready.status).toBe("blocked");
  });

  it("only marks live launch ready on explicit founder approval", () => {
    expect(byKey(baseInput({ founder_live_launch_approved: true })).live_launch_approval.status).toBe("ready");
  });
});

describe("smartlead activation refresh function", () => {
  it("reads the canonical schema columns that exist live", () => {
    expect(refresh).toContain('.select("id, name")');
    expect(refresh).toContain("outreach_campaign_drafts");
    expect(refresh).toContain("credentials_present");
    expect(refresh).toContain("mailbox_allocation_audit");
  });

  it("excludes the Neon Candy legacy estate", () => {
    expect(refresh).toContain("neon candy");
    expect(refresh).toContain("neon-candy-legacy");
  });

  it("makes no provider calls", () => {
    expect(refresh).not.toContain("api.smartlead.ai");
    expect(refresh).not.toContain("fetch(");
  });

  it("is founder/admin gated", () => {
    expect(refresh).toContain("user_roles");
    expect(refresh).toContain("founder");
    expect(refresh).toContain("forbidden");
  });
});
