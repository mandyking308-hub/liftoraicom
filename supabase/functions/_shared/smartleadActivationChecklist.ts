/**
 * Canonical 12-key Smartlead activation checklist.
 *
 * PURE. No IO. Given the current Liftor state for a business/campaign, returns
 * the truthful status of each checklist item. The caller decides whether to
 * persist it to public.smartlead_activation_checklist.
 *
 * Canonical machine-readable keys (mandated, do not rename):
 *   1.  provider_connection
 *   2.  webhook_configured
 *   3.  campaign_mapping_ready
 *   4.  lead_mapping_ready
 *   5.  event_return_ready
 *   6.  sending_domains_ready
 *   7.  mailbox_estate_ready
 *   8.  warmup_ready
 *   9.  sender_caps_ready
 *   10. suppression_sync_ready
 *   11. first_end_to_end_test_ready
 *   12. live_launch_approval
 *
 * Smartlead is the delivery engine only. Liftor CRM remains the source of
 * truth for contacts, suppression and compliance.
 */

export const CHECKLIST_VERSION = "smartlead-activation-checklist-2.0.0";

export const SMARTLEAD_CHECKLIST_KEYS = [
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

export type SmartleadChecklistKey = (typeof SMARTLEAD_CHECKLIST_KEYS)[number];

export interface ChecklistInput {
  business_name: string;
  business_id?: string | null;
  liftor_campaign_id?: string | null;
  provider_campaign_id?: string | null;

  /** Provider row state */
  provider_connected: boolean;
  provider_credentials_present: boolean;
  provider_health_ok: boolean;
  webhook_configured: boolean;
  /** Liftor-side webhook receiver function is deployed and authenticated */
  webhook_receiver_deployed: boolean;

  /** Mapping state */
  campaign_mapped: boolean;
  campaign_mapping_ambiguous: boolean;
  lead_mapping_schema_ready: boolean;
  eligible_lead_count: number;

  /** Estate state */
  sending_domain_count: number;
  mailbox_count: number;
  provider_ready_mailbox_count: number;
  warmup_ready_mailbox_count: number;
  mailboxes_with_effective_cap_count: number;

  /** Compliance + gates */
  suppression_sync_enforced: boolean;
  dry_run_passed: boolean;
  founder_live_launch_approved: boolean;
}

export type ChecklistStatus = "ready" | "not_ready" | "blocked";

export interface ChecklistItem {
  key: SmartleadChecklistKey;
  label: string;
  status: ChecklistStatus;
  blocker_reason: string | null;
  metadata: Record<string, unknown>;
}

const LABELS: Record<SmartleadChecklistKey, string> = {
  provider_connection: "Smartlead provider connection",
  webhook_configured: "Smartlead webhook configured (external)",
  campaign_mapping_ready: "Campaign mapping ready",
  lead_mapping_ready: "Lead mapping ready",
  event_return_ready: "Event return loop ready",
  sending_domains_ready: "Sending domains ready",
  mailbox_estate_ready: "Mailbox estate ready",
  warmup_ready: "Mailbox warmup ready",
  sender_caps_ready: "Sender caps and ramp ready",
  suppression_sync_ready: "Suppression sync ready",
  first_end_to_end_test_ready: "First end-to-end dry run passed",
  live_launch_approval: "Founder live launch approval",
};

export function computeActivationChecklist(input: ChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const push = (
    key: SmartleadChecklistKey,
    status: ChecklistStatus,
    blocker: string | null,
    meta: Record<string, unknown> = {},
  ) => {
    items.push({ key, label: LABELS[key], status, blocker_reason: blocker, metadata: meta });
  };

  const providerOk = input.provider_connected && input.provider_credentials_present && input.provider_health_ok;
  push(
    "provider_connection",
    providerOk ? "ready" : "blocked",
    providerOk ? null : "smartlead_provider_not_connected",
    {
      connected: input.provider_connected,
      credentials_present: input.provider_credentials_present,
      provider_health_ok: input.provider_health_ok,
    },
  );

  push(
    "webhook_configured",
    input.webhook_configured ? "ready" : "not_ready",
    input.webhook_configured ? null : "smartlead_webhook_not_configured_externally",
  );

  push(
    "campaign_mapping_ready",
    input.campaign_mapping_ambiguous ? "blocked" : input.campaign_mapped ? "ready" : "not_ready",
    input.campaign_mapping_ambiguous
      ? "ambiguous_provider_campaign_resolution"
      : input.campaign_mapped
        ? null
        : "no_active_smartlead_campaign_mapping",
    { provider_campaign_id: input.provider_campaign_id ?? null },
  );

  const leadReady = input.lead_mapping_schema_ready && input.eligible_lead_count > 0;
  push(
    "lead_mapping_ready",
    leadReady ? "ready" : input.lead_mapping_schema_ready ? "not_ready" : "blocked",
    leadReady ? null : input.lead_mapping_schema_ready ? "no_eligible_leads" : "lead_mapping_schema_missing",
    { eligible_lead_count: input.eligible_lead_count },
  );

  const eventReady = input.webhook_receiver_deployed && input.webhook_configured;
  push(
    "event_return_ready",
    eventReady ? "ready" : input.webhook_receiver_deployed ? "not_ready" : "blocked",
    eventReady
      ? null
      : input.webhook_receiver_deployed
        ? "provider_webhook_not_pointed_at_liftor"
        : "liftor_webhook_receiver_not_deployed",
    { webhook_receiver_deployed: input.webhook_receiver_deployed },
  );

  push(
    "sending_domains_ready",
    input.sending_domain_count > 0 ? "ready" : "not_ready",
    input.sending_domain_count > 0 ? null : "no_sending_domain_registered",
    { sending_domain_count: input.sending_domain_count },
  );

  const estateReady = input.mailbox_count > 0 && input.provider_ready_mailbox_count >= input.mailbox_count;
  push(
    "mailbox_estate_ready",
    input.mailbox_count === 0 ? "blocked" : estateReady ? "ready" : "not_ready",
    input.mailbox_count === 0
      ? "zero_mailboxes_registered_for_business"
      : estateReady
        ? null
        : "mailboxes_not_provider_ready",
    { mailbox_count: input.mailbox_count, provider_ready_mailbox_count: input.provider_ready_mailbox_count },
  );

  const warmupReady = input.mailbox_count > 0 && input.warmup_ready_mailbox_count >= input.mailbox_count;
  push(
    "warmup_ready",
    input.mailbox_count === 0 ? "blocked" : warmupReady ? "ready" : "not_ready",
    input.mailbox_count === 0 ? "zero_mailboxes_registered_for_business" : warmupReady ? null : "mailboxes_not_warmup_ready",
    { warmup_ready_mailbox_count: input.warmup_ready_mailbox_count, mailbox_count: input.mailbox_count },
  );

  const capsReady =
    input.mailbox_count > 0 && input.mailboxes_with_effective_cap_count >= input.mailbox_count;
  push(
    "sender_caps_ready",
    input.mailbox_count === 0 ? "blocked" : capsReady ? "ready" : "not_ready",
    input.mailbox_count === 0
      ? "zero_mailboxes_registered_for_business"
      : capsReady
        ? null
        : "mailboxes_missing_effective_daily_cap_or_ramp",
    { mailboxes_with_effective_cap_count: input.mailboxes_with_effective_cap_count },
  );

  push(
    "suppression_sync_ready",
    input.suppression_sync_enforced ? "ready" : "blocked",
    input.suppression_sync_enforced ? null : "crm_suppression_gate_not_enforced",
  );

  push(
    "first_end_to_end_test_ready",
    input.dry_run_passed ? "ready" : "not_ready",
    input.dry_run_passed ? null : "zero_mutation_dry_run_not_passed",
  );

  push(
    "live_launch_approval",
    input.founder_live_launch_approved ? "ready" : "blocked",
    input.founder_live_launch_approved ? null : "founder_live_launch_approval_missing",
  );

  return items;
}
