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

export const SMARTLEAD_WEBHOOK_BLUEPRINT_EVENTS = [
  "email_sent",
  "email_opened",
  "link_clicked",
  "reply_received",
  "email_bounced",
  "lead_unsubscribed",
  "campaign_completed",
  "account_error",
] as const;

export class SmartleadOutboundProviderAdapter implements OutboundProviderAdapter {
  readonly providerType = "smartlead";

  async testConnection(provider_id: string) {
    // Browser-side caller delegates the real test to the
    // `smartlead-test-connection` edge function so the API key stays server-side.
    return {
      ok: false,
      detail:
        "Call edge function `smartlead-test-connection` to perform the read-only connection test for provider " +
        provider_id +
        ".",
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
    throw new Error("send disabled in v1");
  }

  mapProviderResponse(raw: unknown) {
    // Placeholder mapping for future Smartlead lead-push / send responses.
    const r = (raw ?? {}) as Record<string, unknown>;
    const message_id =
      (r["message_id"] as string | undefined) ??
      (r["smartlead_message_id"] as string | undefined) ??
      null;
    const accepted = !!(r["ok"] || r["success"] || r["accepted"]);
    return { provider_message_id: message_id, accepted, raw };
  }

  async recordProviderEvent(_event: ProviderEvent) {
    // No-op until the smartlead-webhook edge function is added.
  }

  async recordProviderError(_error: ProviderError) {
    // No-op until provider_error sink is wired.
  }
}

// Self-register so getOutboundProviderAdapter("smartlead") returns this instance.
registerOutboundProviderAdapter("smartlead", new SmartleadOutboundProviderAdapter());
