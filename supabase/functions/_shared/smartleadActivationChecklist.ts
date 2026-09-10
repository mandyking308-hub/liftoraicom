/**
 * Canonical 12-key Smartlead activation checklist.
 *
 * PURE. No IO. Given the current Liftor state for a business/campaign, returns
 * the truthful status of each checklist item. The caller decides whether to
 * persist it.
 *
 * The 12 keys mirror the operational reality of sending infrastructure:
 *   1. business_identity_confirmed
 *   2. sending_domain_registered
 *   3. mailbox_estate_registered
 *   4. mailboxes_provider_ready
 *   5. mailboxes_warmup_ready
 *   6. smartlead_provider_connected
 *   7. smartlead_webhook_configured
 *   8. liftor_campaign_approved
 *   9. smartlead_campaign_mapped
 *  10. lead_list_prepared
 *  11. sendability_preview_passed
 *  12. founder_final_approval_recorded
 */

export const CHECKLIST_VERSION = "smartlead-activation-checklist-1.0.0";

export const SMARTLEAD_CHECKLIST_KEYS = [
  "business_identity_confirmed",
  "sending_domain_registered",
  "mailbox_estate_registered",
  "mailboxes_provider_ready",
  "mailboxes_warmup_ready",
  "smartlead_provider_connected",
  "smartlead_webhook_configured",
  "liftor_campaign_approved",
  "smartlead_campaign_mapped",
  "lead_list_prepared",
  "sendability_preview_passed",
  "founder_final_approval_recorded",
] as const;

export type SmartleadChecklistKey = (typeof SMARTLEAD_CHECKLIST_KEYS)[number];

export interface ChecklistInput {
  business_name: string;
  business_id?: string | null;
  liftor_campaign_id?: string | null;
  provider_campaign_id?: string | null;
  has_sending_domain: boolean;
  mailbox_count: number;
  provider_ready_mailbox_count: number;
  warmup_ready_mailbox_count: number;
  smartlead_provider_connected: boolean;
  smartlead_webhook_configured: boolean;
  liftor_campaign_approved: boolean;
  smartlead_campaign_mapped: boolean;
  eligible_lead_count: number;
  founder_final_approval_recorded: boolean;
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
  business_identity_confirmed: "Business identity confirmed",
  sending_domain_registered: "Sending domain registered",
  mailbox_estate_registered: "Mailbox estate registered",
  mailboxes_provider_ready: "Mailboxes provider-ready (SMTP/IMAP)",
  mailboxes_warmup_ready: "Mailboxes warmup-ready",
  smartlead_provider_connected: "Smartlead provider connected",
  smartlead_webhook_configured: "Smartlead webhook configured",
  liftor_campaign_approved: "Liftor campaign approved",
  smartlead_campaign_mapped: "Smartlead campaign mapped",
  lead_list_prepared: "Lead list prepared",
  sendability_preview_passed: "Sendability preview passed",
  founder_final_approval_recorded: "Founder final approval recorded",
};

export function computeActivationChecklist(input: ChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  const push = (key: SmartleadChecklistKey, status: ChecklistStatus, blocker: string | null, meta: Record<string, unknown> = {}) => {
    items.push({ key, label: LABELS[key], status, blocker_reason: blocker, metadata: meta });
  };

  push(
    "business_identity_confirmed",
    input.business_id ? "ready" : "not_ready",
    input.business_id ? null : "business_not_onboarded",
    { business_id: input.business_id },
  );

  push(
    "sending_domain_registered",
    input.has_sending_domain ? "ready" : "not_ready",
    input.has_sending_domain ? null : "no_sending_domain_registered",
  );

  push(
    "mailbox_estate_registered",
    input.mailbox_count > 0 ? "ready" : "blocked",
    input.mailbox_count > 0 ? null : "zero_mailboxes_registered",
    { mailbox_count: input.mailbox_count },
  );

  push(
    "mailboxes_provider_ready",
    input.mailbox_count > 0 && input.provider_ready_mailbox_count >= input.mailbox_count
      ? "ready"
      : input.mailbox_count === 0
        ? "blocked"
        : "not_ready",
    input.provider_ready_mailbox_count >= input.mailbox_count ? null : "mailboxes_not_provider_ready",
    { provider_ready_mailbox_count: input.provider_ready_mailbox_count, mailbox_count: input.mailbox_count },
  );

  push(
    "mailboxes_warmup_ready",
    input.mailbox_count > 0 && input.warmup_ready_mailbox_count >= input.mailbox_count
      ? "ready"
      : input.mailbox_count === 0
        ? "blocked"
        : "not_ready",
    input.warmup_ready_mailbox_count >= input.mailbox_count ? null : "mailboxes_not_warmup_ready",
    { warmup_ready_mailbox_count: input.warmup_ready_mailbox_count, mailbox_count: input.mailbox_count },
  );

  push(
    "smartlead_provider_connected",
    input.smartlead_provider_connected ? "ready" : "blocked",
    input.smartlead_provider_connected ? null : "smartlead_provider_not_connected",
  );

  push(
    "smartlead_webhook_configured",
    input.smartlead_webhook_configured ? "ready" : "not_ready",
    input.smartlead_webhook_configured ? null : "smartlead_webhook_not_configured",
  );

  push(
    "liftor_campaign_approved",
    input.liftor_campaign_approved ? "ready" : "not_ready",
    input.liftor_campaign_approved ? null : "liftor_campaign_not_approved",
  );

  push(
    "smartlead_campaign_mapped",
    input.smartlead_campaign_mapped ? "ready" : "not_ready",
    input.smartlead_campaign_mapped ? null : "smartlead_campaign_not_mapped",
    { provider_campaign_id: input.provider_campaign_id },
  );

  push(
    "lead_list_prepared",
    input.eligible_lead_count > 0 ? "ready" : "not_ready",
    input.eligible_lead_count > 0 ? null : "no_eligible_leads",
    { eligible_lead_count: input.eligible_lead_count },
  );

  push(
    "sendability_preview_passed",
    input.eligible_lead_count > 0 ? "ready" : "not_ready",
    input.eligible_lead_count > 0 ? null : "sendability_preview_not_run_or_zero_eligible",
  );

  push(
    "founder_final_approval_recorded",
    input.founder_final_approval_recorded ? "ready" : "blocked",
    input.founder_final_approval_recorded ? null : "founder_final_approval_missing",
  );

  return items;
}
