/**
 * Smartlead Outbound Provider Adapter — v1 (foundation only).
 *
 * IMPORTANT:
 *  - This adapter does NOT send emails.
 *  - `sendOne` is a stub that throws "send disabled in v1".
 *  - Only a read-only connection test is permitted, and it runs server-side
 *    in the `smartlead-test-connection` edge function (the API key never
 *    leaves the backend).
 *  - Render / preview / eligibility logic is Liftor-side only and makes no
 *    Smartlead calls.
 */

import {
  OutboundProviderAdapter,
  ProviderError,
  ProviderEvent,
  RenderedMessage,
  SendEligibility,
  registerOutboundProviderAdapter,
} from "./outboundProviderAdapter";

export const SMARTLEAD_SECRET_NAME = "SMARTLEAD_API_KEY";
export const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";
export const SMARTLEAD_AUTH_METHOD = "api_key_query_param" as const;

/** Read-only Smartlead endpoints used by adapter v1. */
export const SMARTLEAD_READ_ONLY_ENDPOINTS = {
  campaigns: "/campaigns/?include_tags=true",
  email_accounts: "/email-accounts/?offset=0&limit=100",
  webhooks: "/webhooks",
  analytics_overview: "/analytics/overview",
} as const;

/** Future mutation endpoints — referenced for documentation only. NOT called in v1. */
export const SMARTLEAD_MUTATION_ENDPOINTS_FUTURE = [
  "POST /campaigns/create",
  "POST /campaigns/{campaign_id}/sequences",
  "POST /campaigns/{campaign_id}/leads",
  "POST /campaigns/{campaign_id}/email-accounts",
  "POST /email-accounts/save",
  "POST /email-accounts/{email_account_id}/warmup",
  "POST /webhooks",
] as const;

export const SMARTLEAD_WEBHOOK_BLUEPRINT_EVENTS = [
  "email_reply_received",
  "email_bounced",
  "lead_unsubscribed",
  "campaign_completed",
  "lead_status_changed",
  "email_opened",
  "link_clicked",
  "account_error",
] as const;

export class SmartleadOutboundProviderAdapter implements OutboundProviderAdapter {
  readonly providerType = "smartlead";
  readonly baseUrl = SMARTLEAD_BASE_URL;
  readonly authMethod = SMARTLEAD_AUTH_METHOD;

  async testConnection(provider_id: string) {
    // Browser-side caller delegates the real read-only test to the
    // `smartlead-test-connection` edge function so SMARTLEAD_API_KEY never
    // reaches the client. The edge function calls only:
    //   GET /campaigns/?include_tags=true
    //   GET /email-accounts/?offset=0&limit=100
    //   GET /webhooks
    //   GET /analytics/overview
    return {
      ok: false,
      detail:
        "Call edge function `smartlead-test-connection` for provider " +
        provider_id +
        " (read-only campaigns + email-accounts + webhooks + analytics/overview).",
    };
  }

  async renderMessage(_queue_id: string): Promise<RenderedMessage> {
    // Liftor-side render only — no Smartlead call.
    throw new Error(
      "renderMessage(smartlead) v1 not wired — assemble from queue/contact/sequence/footer in a follow-up build step.",
    );
  }

  async validateSendEligibility(
    _queue_id: string,
    _provider_id: string,
  ): Promise<SendEligibility> {
    // Liftor-side eligibility only. No Smartlead call.
    return {
      eligible: false,
      blockers: [
        "smartlead_adapter_v1_no_send",
        "scale_sending_not_enabled",
      ],
    };
  }

  async previewSend(_queue_id: string, _provider_id: string) {
    // Returns shape only — no provider call. v1 keeps this as a not-ready stub
    // until renderMessage is wired and a campaign mapping exists.
    return {
      rendered: {
        to: "",
        from_email: "",
        from_name: null,
        reply_to: null,
        subject: "",
        body: "",
        unresolved_placeholders: ["smartlead_render_pending"],
        unsubscribe_link_present: false,
      } satisfies RenderedMessage,
      eligibility: {
        eligible: false,
        blockers: ["smartlead_adapter_v1_no_send"],
      } satisfies SendEligibility,
    };
  }

  async sendOne(): Promise<{ ok: boolean; error?: string }> {
    throw new Error("Smartlead send disabled in adapter v1.");
  }

  mapProviderResponse(raw: unknown) {
    // Placeholder mapping for future Smartlead webhook + send responses.
    // Not called by anything in v1.
    const r = (raw ?? {}) as Record<string, unknown>;
    const message_id =
      (r["message_id"] as string | undefined) ??
      (r["smartlead_message_id"] as string | undefined) ??
      (r["email_message_id"] as string | undefined) ??
      null;
    const eventType = String(r["event"] ?? r["event_type"] ?? "").toLowerCase();
    const eventMap: Record<string, string> = {
      email_sent: "email_sent",
      email_opened: "opened",
      open: "opened",
      link_clicked: "clicked",
      click: "clicked",
      email_reply_received: "replied",
      reply: "replied",
      email_bounced: "bounced",
      bounce: "bounced",
      lead_unsubscribed: "unsubscribed",
      unsubscribe: "unsubscribed",
      campaign_completed: "campaign_completed",
      account_error: "account_error",
    };
    const mapped_event = eventMap[eventType] ?? null;
    const accepted = !!(r["ok"] || r["success"] || r["accepted"]);
    return { provider_message_id: message_id, accepted, mapped_event, raw } as ReturnType<
      OutboundProviderAdapter["mapProviderResponse"]
    > & { mapped_event: string | null };
  }

  async recordProviderEvent(_event: ProviderEvent) {
    // No-op in v1 — Smartlead webhook endpoint not created yet.
  }

  async recordProviderError(_error: ProviderError) {
    // No-op in v1 — local provider_error sink not wired yet. No secret values
    // would ever be persisted from this adapter.
  }
}

// Self-register so getOutboundProviderAdapter("smartlead") returns this instance.
registerOutboundProviderAdapter("smartlead", new SmartleadOutboundProviderAdapter());
