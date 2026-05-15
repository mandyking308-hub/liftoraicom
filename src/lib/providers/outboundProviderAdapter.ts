/**
 * Outbound Provider Adapter — v1 interface.
 *
 * Liftor's queue logic talks to this adapter, never directly to a sending
 * provider. Concrete adapters (IONOS proof, future scale provider) implement
 * this interface.
 *
 * IMPORTANT: This file defines the interface only. `sendOne` is intentionally
 * NOT wired to any live provider in this build — it must throw until a
 * concrete adapter is registered AND a separate, founder-controlled apply
 * gate calls it. The Bulk Outbound Provider Integration Layer v1 task does
 * not call `sendOne` from anywhere.
 */

export type ProviderMode = "proof" | "scale" | "disabled";
export type ProviderStatus =
  | "not_configured"
  | "configured"
  | "connected"
  | "error"
  | "disabled";

export interface OutboundProviderRecord {
  id: string;
  provider_name: string;
  provider_type: string;
  mode: ProviderMode;
  status: ProviderStatus;
  from_email: string | null;
  from_name: string | null;
  sending_domain: string | null;
  reply_to: string | null;
  daily_send_cap: number | null;
  hourly_send_cap: number | null;
  mailbox_send_cap: number | null;
  warmup_status: string | null;
  provider_health: string;
  credentials_present: boolean;
  webhook_configured: boolean;
  last_test_at: string | null;
  last_error: string | null;
  inbox_id?: string | null;
  notes?: string | null;
}

export interface RenderedMessage {
  to: string;
  from_email: string;
  from_name: string | null;
  reply_to: string | null;
  subject: string;
  body: string;
  unresolved_placeholders: string[];
  unsubscribe_link_present: boolean;
}

export interface SendEligibility {
  eligible: boolean;
  blockers: string[];
}

export interface ProviderEvent {
  queue_id: string;
  provider_id: string;
  event_type: "test" | "preview" | "send_attempt" | "send_success" | "send_failure" | "webhook";
  provider_message_id?: string | null;
  detail?: Record<string, unknown>;
}

export interface ProviderError {
  queue_id?: string;
  provider_id: string;
  code: string;
  message: string;
  retriable?: boolean;
}

export interface OutboundProviderAdapter {
  testConnection(provider_id: string): Promise<{ ok: boolean; detail?: string }>;
  renderMessage(queue_id: string): Promise<RenderedMessage>;
  validateSendEligibility(
    queue_id: string,
    provider_id: string,
  ): Promise<SendEligibility>;
  previewSend(
    queue_id: string,
    provider_id: string,
  ): Promise<{ rendered: RenderedMessage; eligibility: SendEligibility }>;
  /**
   * Live send. NEVER called by the v1 Provider Integration Layer task.
   * Founder-controlled apply gates are the only legitimate caller.
   */
  sendOne(
    queue_id: string,
    provider_id: string,
  ): Promise<{ ok: boolean; provider_message_id?: string; error?: string }>;
  mapProviderResponse(raw: unknown): {
    provider_message_id: string | null;
    accepted: boolean;
    raw: unknown;
  };
  recordProviderEvent(event: ProviderEvent): Promise<void>;
  recordProviderError(error: ProviderError): Promise<void>;
}

/**
 * Default null adapter — every concrete provider should extend or replace this.
 * Throws on `sendOne` so accidental calls during the foundation build cannot
 * trigger a real provider request.
 */
export class NullOutboundProviderAdapter implements OutboundProviderAdapter {
  async testConnection() {
    return { ok: false, detail: "No adapter registered." };
  }
  async renderMessage(): Promise<RenderedMessage> {
    throw new Error("renderMessage not implemented (no adapter registered).");
  }
  async validateSendEligibility(): Promise<SendEligibility> {
    return { eligible: false, blockers: ["no_adapter_registered"] };
  }
  async previewSend(): Promise<{ rendered: RenderedMessage; eligibility: SendEligibility }> {
    throw new Error("previewSend not implemented (no adapter registered).");
  }
  async sendOne(): Promise<{ ok: boolean; error?: string }> {
    throw new Error(
      "sendOne disabled — Bulk Outbound Provider Integration Layer v1 does not perform sends.",
    );
  }
  mapProviderResponse(raw: unknown) {
    return { provider_message_id: null, accepted: false, raw };
  }
  async recordProviderEvent() {
    /* no-op */
  }
  async recordProviderError() {
    /* no-op */
  }
}

/**
 * Adapter registry — concrete adapters register themselves here.
 * Currently empty; the IONOS proof adapter and future scale adapter will be
 * added in subsequent build tasks.
 */
const REGISTRY = new Map<string, OutboundProviderAdapter>();

export function registerOutboundProviderAdapter(
  provider_type: string,
  adapter: OutboundProviderAdapter,
) {
  REGISTRY.set(provider_type, adapter);
}

export function getOutboundProviderAdapter(
  provider_type: string,
): OutboundProviderAdapter {
  return REGISTRY.get(provider_type) ?? new NullOutboundProviderAdapter();
}