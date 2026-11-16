# Smartlead webhook protocol compatibility — source implementation, activation blocked

- **Review and implementation date:** 16 November 2026
- **Status:** SOURCE IMPLEMENTED; NOT DEPLOYED OR ACTIVATED.
- **Smartlead signing source:** https://helpcenter.smartlead.ai/en/articles/470-secure-your-smartlead-webhooks-with-signing-hmac
- **Smartlead legacy/testing source:** https://helpcenter.smartlead.ai/en/articles/403-quick-tips-for-testing-with-sample-webhook-payloads
- **Protocol source:** https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
- **Runtime effect:** none. No secret, connection, provider, deployment or feature flag was changed.

## Confirmed dual-protocol requirement

Smartlead's current signing document specifies Standard Webhooks headers `webhook-id`, `webhook-timestamp` and `webhook-signature`, using `v1` HMAC-SHA256 and a base64-decoded `whsec_` key. Its sample-payload document still specifies `X-Smartlead-Signature: sha256=<hex>` over the raw body and `X-Request-Id` for idempotency. Both are therefore supported only as explicitly configured, distinct modes; there is no auto-detection or downgrade.

`supabase/functions/_shared/smartleadWebhookAuth.ts` now implements:

- `legacy_hex`: literal-secret raw-body HMAC with the legacy hex header and `X-Request-Id` when supplied;
- `standard_webhooks`: exact raw-byte signed content `<webhook-id>.<webhook-timestamp>.<raw-body>`, a 24–64-byte decoded `whsec_` key, constant-time `v1` comparison, a ±300-second timestamp window, and `webhook-id` as the retry identity;
- explicit `settings.webhook_protocol` values `legacy_hex` or `standard_webhooks` on each business-owned `outbound_provider_connections` row. Missing, ambiguous or other values fail closed.

`supabase/functions/smartlead-webhook/index.ts` reads the required headers, verifies before JSON parsing, preserves connection-owned secret resolution and exactly-one matching connection, and includes the new headers in CORS. It remains behind `SMARTLEAD_WEBHOOK_RECEIVER_ENABLED` and each connection's existing enablement controls.

## Implemented source contract

- [x] Verify exact raw request bytes before JSON parsing.
- [x] Require the explicitly configured protocol; no unsigned or alternate-protocol fallback.
- [x] Standard Webhooks `whsec_` decoding, `v1` HMAC-SHA256, timestamp tolerance and stable `webhook-id` idempotency.
- [x] Space-delimited signature parsing for rotation; only verified `v1` candidates are accepted.
- [x] Legacy raw-body hex HMAC and existing request/event idempotency preserved.
- [x] Exactly-one matching business-owned connection and connection-owned secret; ambiguous matches rejected.
- [x] Missing/invalid authentication rejected before durable event or CRM mutation.
- [x] Existing campaign, lead, contact, suppression, approval and send gates unchanged.
- [x] Synthetic fixtures cover valid bytes, tampering, stale timestamps, malformed/missing identity, wrong keys and downgrade attempts.

## Activation gate

Do not enable `SMARTLEAD_WEBHOOK_RECEIVER_ENABLED` or a connection's `inbound_receiver_enabled` for either protocol until the candidate schema has been reviewed/applied through the protected release process and a signed Smartlead **Send Test** delivery has been verified against the exact saved receiver URL. Smartlead documents that Standard Webhooks test requests contain `"is_test": true`, are sent once and are not retried; the saved URL must match or the test may be unsigned.

No unsigned, legacy-header or alternate-protocol fallback may be added silently. Legacy mode has no documented transport timestamp header, so its replay defence is the existing connection-scoped `X-Request-Id`/provider-event idempotency rather than an invented timestamp requirement. Actual signed delivery, secret availability, provider configuration and production deployment remain UNVERIFIED.

## Synthetic fixture

`src/lib/__tests__/fixtures/smartleadStandardWebhookContract.ts` contains only a deterministic repeated-byte test key, a synthetic test event and a fixed expected signature. It contains no real credential, customer data or provider identifier. `src/lib/__tests__/smartleadStandardWebhookCompatibility.test.ts` independently recomputes the fixture and exercises the real verifier. The disposable PostgreSQL suite separately exercises durable replay and tenant isolation.
