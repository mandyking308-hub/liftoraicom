# Smartlead Standard Webhooks compatibility checklist — review only

- **Review date:** 16 November 2026
- **Status:** NOT IMPLEMENTED IN THE ACTIVE RECEIVER. Source-only contract and synthetic fixture.
- **Smartlead source:** https://helpcenter.smartlead.ai/en/articles/470-secure-your-smartlead-webhooks-with-signing-hmac
- **Protocol source:** https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
- **Runtime effect:** none. No secret, connection, provider, deployment or feature flag was changed.

## Confirmed mismatch

Smartlead's current documentation specifies `webhook-id`, `webhook-timestamp` and `webhook-signature`, using the Standard Webhooks `v1` HMAC-SHA256 format and a base64-decoded `whsec_` key. The active Liftor source in `supabase/functions/_shared/smartleadWebhookAuth.ts` instead accepts only `X-Smartlead-Signature: sha256=<64 hex characters>` and HMACs the raw body with the secret's literal UTF-8 bytes. `supabase/functions/smartlead-webhook/index.ts` reads only `x-smartlead-signature` and uses `x-request-id` as its preferred retry key.

The synthetic Standard Webhooks fixture therefore fails the existing verifier. This is the required fail-closed result, not a working compatibility implementation.

## Required separately reviewed implementation contract

- [ ] Verify the exact raw request bytes before JSON parsing; do not reconstruct or normalise the body.
- [ ] Require all three Standard Webhooks headers. Decode the `whsec_` suffix as base64 and require a 24–64 byte key.
- [ ] Verify `v1,<base64>` HMAC-SHA256 over `<webhook-id>.<webhook-timestamp>.<raw-body>` using constant-time comparison.
- [ ] Parse the space-delimited signature list explicitly for secret rotation; never select an unverified signature scheme.
- [ ] Enforce a documented timestamp tolerance and reject stale or invalid timestamps before any event mutation.
- [ ] Use the stable `webhook-id` for connection-scoped idempotency and replay handling; do not rely on `x-request-id` for the new protocol.
- [ ] Preserve exactly-one matching business-owned provider connection and its connection-owned secret. Ambiguous matches remain rejected.
- [ ] Return `401` for missing or invalid authentication. Never convert authentication failures into accepted/quarantined events.
- [ ] Update CORS/header handling only as part of the reviewed receiver patch; no runtime header change is made here.
- [ ] Test missing headers, malformed base64, wrong key lengths, bad signatures, altered raw bytes, stale timestamps, replay, rotation, ambiguous tenants and cross-tenant secrets.
- [ ] Keep all existing campaign, lead, contact, suppression, approval and send gates unchanged.

## Activation gate

Do not enable `SMARTLEAD_WEBHOOK_RECEIVER_ENABLED` or a connection's `inbound_receiver_enabled` for the Standard Webhooks protocol until the reviewed implementation has passed isolated tests and a signed Smartlead **Send Test** delivery has been verified against the exact saved receiver URL. Smartlead documents that test requests contain `"is_test": true`, are sent once and are not retried; the saved URL must match or the test may be unsigned.

No unsigned, legacy-header or alternate-protocol fallback may be added silently. Until that signed test delivery and read-back are verified, activation remains blocked and the existing receiver remains unchanged and default-off.

## Synthetic fixture

`src/lib/__tests__/fixtures/smartleadStandardWebhookContract.ts` contains only a deterministic repeated-byte test key, a synthetic test event and a fixed expected signature. It contains no real credential, customer data or provider identifier. `src/lib/__tests__/smartleadStandardWebhookCompatibility.test.ts` independently recomputes the fixture and proves the unchanged legacy verifier rejects it.
