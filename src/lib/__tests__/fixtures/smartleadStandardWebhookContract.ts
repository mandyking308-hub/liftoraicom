/**
 * Synthetic Standard Webhooks vector for the source-only compatibility review.
 * The key is 32 repeated bytes and must never be used for a real connection.
 * Protocol references are recorded in docs/candidates/smartlead-standard-webhooks-compatibility-2026-11-16.md.
 */
export const SMARTLEAD_STANDARD_WEBHOOK_FIXTURE = {
  secret: "whsec_BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=",
  rawBody: "{\"is_test\":true,\"event_type\":\"EMAIL_REPLY\",\"event_id\":\"synthetic-event-001\"}",
  headers: {
    "webhook-id": "msg_synthetic_phase1_001",
    "webhook-timestamp": "1794841200",
    "webhook-signature": "v1,8hNChOmK/JQVgvvWHd6HznGtlCZkfrOVwpc7paECkZw=",
  },
} as const;
