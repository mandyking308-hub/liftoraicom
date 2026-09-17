# Section I — Provider map

For every provider: the credential **name** (never a value), where it may be read, what the code can do, and what is actually switched on today.

Rule enforced throughout the codebase: provider credentials are read with `Deno.env.get()` inside edge functions only. No provider secret is ever returned in a response, written to a table, logged, or exposed to the browser.

| Provider | Host | Credential names | Boundary | Code capability | Live status (17 Sep 2026) |
|---|---|---|---|---|---|
| **Apollo** (discovery/enrichment) | `api.apollo.io` | `APOLLO_API_KEY`, `APOLLO_ENCRYPTION_KEY` / `APOLLO_ENC_KEY` / `APOLLO_KEY_ENC` | server only | search, enrich, reveal, unlock, education discovery/recovery | Only the Neon Candy connection row is verified. Not configured business-by-business. All three Apollo gates disabled |
| **Smartlead** (cold email delivery) | `server.smartlead.ai` | `SMARTLEAD_API_KEY`, `SMARTLEAD_WEBHOOK_SECRET` | server only | read campaigns/email-accounts, map campaigns/leads, push leads, start campaigns, receive webhooks | Provider row connected/healthy; 10 mailboxes connected (GHAT only); webhook **not** configured; 0 campaign mappings, 0 lead mappings, 0 events |
| **Winnr** (mailbox/domain estate + warm-up) | `https://api.winnr.app/v1` (`_shared/winnrClient.ts` — the only place endpoint paths exist) | `WINNR_API_TOKEN` | server only | read `/account`, `/domains`, `/email-users`, `/warming`, `/warming/overview`, `/export`; enable warming | Enterprise plan active. 39 domains, 200 mailboxes, all warming |
| **Lovable AI Gateway** | `https://ai.gateway.lovable.dev/v1/chat/completions` | `LOVABLE_API_KEY` | server only, and only inside `_shared/aiGateway.ts` | all model calls, leases, cost ledger | In use, 6 logged gateway requests to date |
| **OpenAI** | — | `OPENAI_API_KEY` | server only | legacy/cosmetic references in some historical acceptance functions; the runtime path is the gateway | Not the live path |
| **Google / Gmail (PR desk)** | `oauth2.googleapis.com`, `gmail.googleapis.com`, `accounts.google.com` | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `PR_GMAIL_ACCOUNT` | server only | OAuth connect, create **drafts**, ingest opportunity email | Draft-only by design; no send path |
| **Native/IONOS mail (inbox estate)** | IMAP/SMTP hosts stored per inbox | `INBOX_CREDENTIALS_KEY` (encrypts `inbox_credentials`), `OUTREACH_WEBHOOK_SECRET` | server only | inbound polling, IMAP test, native send | `native_email_send_gate` disabled; superseded as the cold-outreach lane by the two-lane Smartlead/Winnr model |
| **Stripe** | Stripe API | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | server only | payments + `stripe-webhook` receiver | Receiver deployed with `verify_jwt=false`; signature-verified |
| **Social providers** (Metricool, ManyChat, Buffer, Unipile, Tubular) | provider APIs via adapters in `_shared/social*.ts`, `bufferClient.ts` | `SOCIAL_DISPATCH_SECRET`, `SOCIAL_RELATIONSHIP_WEBHOOK_SECRET`, `SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET`, `UNIPILE_WEBHOOK_HMAC_SECRET` | server only | scheduling, DM, relationship events, viral signals | `metricool_schedule_post_gate` and `manychat_dm_send_gate` disabled. `social-engagement-provider-event-receiver` is a hard 403 shell. Tubular viral adapter is a safe-off shell |
| **Voice** | voice provider webhooks (`_shared/voiceProviderShared.ts`) | provider secret via env | server only | inbound call/transcript webhooks | Receivers exist with `verify_jwt=false`; no outbound calling |
| **Forbes / GitHub raw** | `www.forbes.com`, `raw.githubusercontent.com` | none | server only | wealth snapshot import (public data) | Read-only research import |

## I1. Apollo credit firewall

`supabase/functions/_shared/apolloCreditFirewall.ts` is a thin client; **enforcement lives in Postgres** (`apollo_credit_reserve`, `apollo_credit_settle`, `apollo_credit_release`, `apollo_credit_status`).

- Every paid operation must first reserve credits against `apollo_portfolio_credit_policy` (`safety_reserve`, `per_run_cap`).
- `buildOperationKey()` makes retries idempotent: the same logical operation produces the same key, and `duplicate_operation_key` refuses a second reservation. A retry can never double-spend.
- Block reasons are explicit strings (`per_run_cap_exceeded`, `duplicate_operation_key`, …) returned via `blockedResponseBody()`.
- `loadNoEmailPersonIds()` prevents paying to reveal people already known to have no email.

## I2. Winnr client discipline

All Winnr endpoint paths are declared once in `WINNR_ENDPOINTS` inside `_shared/winnrClient.ts`. Callers reference keys, never literal paths, so a provider API change is a one-file change. The client handles both cursor pagination and the page/per_page style used by `/warming`, and returns a structured `{ ok, http_status, error_code, error_message, data, endpoint }` result so failures are surfaced rather than swallowed.
