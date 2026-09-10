/**
 * Canonical Smartlead activation checklist — the 12 controls that must be true
 * before Liftor may send anything through Smartlead.
 *
 * PURE. No IO. Writes go to the EXISTING public.smartlead_activation_checklist
 * table; there is no parallel checklist table anywhere in Liftor.
 *
 * TRUTH RULE: this never reports green from an assumption. Anything unproven is
 * `not_ready` or `blocked` with a machine-readable blocker reason.
 */

export const ACTIVATION_CHECKLIST_VERSION = "smartlead-activation-checklist-1.0.0";

export const CANONICAL_CHECKLIST_KEYS = [
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
] as const;

export type ChecklistKey = (typeof CANONICAL_CHECKLIST_KEYS)[number];

export type ChecklistStatus = "ready" | "not_ready" | "blocked";

export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  provider_connection: "Smartlead provider connected and credentials present",
  webhook_configured: "Smartlead webhook pointed at Liftor and verified",
  campaign_mapping_ready: "At least one Liftor campaign mapped to a Smartlead campaign",
  lead_mapping_ready: "Lead mapping path proven with a mapped campaign",
  event_return_ready: "Smartlead events returning into Liftor and processed",
  sending_domains_ready: "Sending domains registered and authenticated",
  mailbox_estate_ready: "Mailbox estate registered for the sending business",
  warmup_ready: "Mailbox warm-up complete on the sending estate",
  sender_caps_ready: "Per-mailbox daily caps and ramp ceilings configured",
  suppression_sync_ready: "Suppression, unsubscribe and bounce return path proven",
  first_end_to_end_test_ready: "Full dry-run test passed end to end",
  live_launch_approval: "Founder approval captured for live sending",
};

export interface ChecklistInputs {
  provider: {
    exists: boolean;
    status?: string | null;
    credentials_present?: boolean | null;
    provider_health?: string | null;
    webhook_configured?: boolean | null;
    last_test_at?: string | null;
  } | null;
  webhook_secret_present: boolean;
  /** Count of provider events actually received from Smartlead. */
  received_event_count: number;
  /** Count of provider events successfully processed. */
  processed_event_count: number;
  /** Count of suppression-bearing events (bounce/unsubscribe) processed. */
  suppression_event_count: number;
  campaign_mapping_count: number;
  active_campaign_mapping_count: number;
  lead_mapping_count: number;
  /** Mailboxes in the estate this checklist scope is about (legacy excluded). */
  estate_mailbox_count: number;
  estate_mailbox_provider_ready_count: number;
  estate_mailbox_warmed_count: number;
  estate_mailbox_with_caps_count: number;
  sending_domain_count: number;
  /** True only when a real dry-run test completed without blockers. */
  dry_run_test_passed: boolean;
  /** True only when a founder approval record exists. Never inferred. */
  founder_live_approval: boolean;
}

export interface ChecklistItem {
  checklist_key: ChecklistKey;
  checklist_label: string;
  status: ChecklistStatus;
  blocker_reason: string | null;
  metadata: Record<string, unknown>;
}

export interface ChecklistReport {
  items: ChecklistItem[];
  ready_count: number;
  blocked_count: number;
  not_ready_count: number;
  /** ALWAYS false unless every control is ready. Never optimistic. */
  ready_for_live_send: boolean;
  blockers: ChecklistKey[];
  version: string;
}

function item(
  key: ChecklistKey,
  status: ChecklistStatus,
  blocker: string | null,
  metadata: Record<string, unknown> = {},
): ChecklistItem {
  return {
    checklist_key: key,
    checklist_label: CHECKLIST_LABELS[key],
    status,
    blocker_reason: status === "ready" ? null : blocker,
    metadata,
  };
}

export function computeActivationChecklist(inp: ChecklistInputs): ChecklistReport {
  const items: ChecklistItem[] = [];

  // 1. Provider connection
  const p = inp.provider;
  const providerOk =
    !!p &&
    p.exists &&
    String(p.status ?? "").toLowerCase() === "connected" &&
    p.credentials_present === true &&
    String(p.provider_health ?? "").toLowerCase() === "ok";
  items.push(
    item(
      "provider_connection",
      providerOk ? "ready" : "not_ready",
      !p ? "smartlead_provider_row_missing" : "provider_not_connected_or_credentials_missing",
      { status: p?.status ?? null, provider_health: p?.provider_health ?? null, last_test_at: p?.last_test_at ?? null },
    ),
  );

  // 2. Webhook configured — requires BOTH a secret and Smartlead physically
  //    pointed at Liftor. Stays not_ready until events actually arrive.
  const webhookOk = inp.webhook_secret_present && p?.webhook_configured === true && inp.received_event_count > 0;
  items.push(
    item(
      "webhook_configured",
      webhookOk ? "ready" : "not_ready",
      !inp.webhook_secret_present
        ? "smartlead_webhook_secret_missing"
        : p?.webhook_configured !== true
          ? "smartlead_webhook_not_pointed_at_liftor"
          : "no_webhook_events_received_yet",
      { webhook_secret_present: inp.webhook_secret_present, received_event_count: inp.received_event_count },
    ),
  );

  // 3. Campaign mapping
  const mappingOk = inp.active_campaign_mapping_count > 0;
  items.push(
    item("campaign_mapping_ready", mappingOk ? "ready" : "not_ready", "no_active_smartlead_campaign_mapping", {
      campaign_mapping_count: inp.campaign_mapping_count,
      active_campaign_mapping_count: inp.active_campaign_mapping_count,
    }),
  );

  // 4. Lead mapping — needs a campaign mapping first.
  const leadOk = mappingOk && inp.lead_mapping_count > 0;
  items.push(
    item(
      "lead_mapping_ready",
      leadOk ? "ready" : "not_ready",
      !mappingOk ? "blocked_by_campaign_mapping" : "no_lead_mappings_recorded",
      { lead_mapping_count: inp.lead_mapping_count },
    ),
  );

  // 5. Event return
  const eventOk = inp.received_event_count > 0 && inp.processed_event_count > 0;
  items.push(
    item(
      "event_return_ready",
      eventOk ? "ready" : "not_ready",
      inp.received_event_count === 0 ? "no_provider_events_received" : "provider_events_received_but_none_processed",
      { received: inp.received_event_count, processed: inp.processed_event_count },
    ),
  );

  // 6. Sending domains
  const domainsOk = inp.sending_domain_count > 0;
  items.push(
    item("sending_domains_ready", domainsOk ? "ready" : "not_ready", "no_sending_domains_registered", {
      sending_domain_count: inp.sending_domain_count,
    }),
  );

  // 7. Mailbox estate
  const estateOk = inp.estate_mailbox_count > 0 && inp.estate_mailbox_provider_ready_count > 0;
  items.push(
    item(
      "mailbox_estate_ready",
      estateOk ? "ready" : "not_ready",
      inp.estate_mailbox_count === 0
        ? "no_mailboxes_registered_for_this_estate"
        : "registered_mailboxes_not_confirmed_by_provider",
      {
        estate_mailbox_count: inp.estate_mailbox_count,
        provider_ready: inp.estate_mailbox_provider_ready_count,
      },
    ),
  );

  // 8. Warmup
  const warmupOk = inp.estate_mailbox_count > 0 && inp.estate_mailbox_warmed_count === inp.estate_mailbox_count;
  items.push(
    item(
      "warmup_ready",
      warmupOk ? "ready" : "not_ready",
      inp.estate_mailbox_count === 0 ? "no_mailboxes_to_warm" : "warmup_incomplete_on_one_or_more_mailboxes",
      { warmed: inp.estate_mailbox_warmed_count, total: inp.estate_mailbox_count },
    ),
  );

  // 9. Sender caps
  const capsOk = inp.estate_mailbox_count > 0 && inp.estate_mailbox_with_caps_count === inp.estate_mailbox_count;
  items.push(
    item(
      "sender_caps_ready",
      capsOk ? "ready" : "not_ready",
      inp.estate_mailbox_count === 0 ? "no_mailboxes_registered" : "one_or_more_mailboxes_missing_daily_cap_or_ramp",
      { with_caps: inp.estate_mailbox_with_caps_count, total: inp.estate_mailbox_count },
    ),
  );

  // 10. Suppression sync
  const suppressionOk = eventOk && inp.suppression_event_count > 0;
  items.push(
    item(
      "suppression_sync_ready",
      suppressionOk ? "ready" : "not_ready",
      !eventOk ? "blocked_by_event_return" : "no_bounce_or_unsubscribe_event_processed_yet",
      { suppression_event_count: inp.suppression_event_count },
    ),
  );

  // 11. First end-to-end test
  items.push(
    item("first_end_to_end_test_ready", inp.dry_run_test_passed ? "ready" : "not_ready", "dry_run_test_not_passed", {
      dry_run_test_passed: inp.dry_run_test_passed,
    }),
  );

  // 12. Live launch approval — BLOCKED, never inferred, always founder-supplied.
  items.push(
    item("live_launch_approval", inp.founder_live_approval ? "ready" : "blocked", "founder_live_send_approval_not_captured", {
      founder_live_approval: inp.founder_live_approval,
    }),
  );

  const blockers = items.filter((i) => i.status !== "ready").map((i) => i.checklist_key);

  return {
    items,
    ready_count: items.filter((i) => i.status === "ready").length,
    blocked_count: items.filter((i) => i.status === "blocked").length,
    not_ready_count: items.filter((i) => i.status === "not_ready").length,
    ready_for_live_send: blockers.length === 0,
    blockers,
    version: ACTIVATION_CHECKLIST_VERSION,
  };
}
