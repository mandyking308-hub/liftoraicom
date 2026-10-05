# Connector Readiness Audit (read-only findings)

Nothing was changed. No external or provider calls were made. This audit only read the server code, the list of stored keys and the list of linked workspace connections.

## 1–2. Providers the code expects, and their current status

| Provider | What it's for | Status |
|---|---|---|
| Lovable Cloud (auth, database, storage) | Core platform | Connected |
| Lovable AI (`LOVABLE_API_KEY`) | Brain/drafting | Connected (managed) |
| Google Search Console | SEO | Connected (workspace connector linked) |
| Smartlead (`SMARTLEAD_API_KEY`) | Cold email sending | Partly set up: key stored; `SMARTLEAD_WEBHOOK_SECRET` missing; 0 provider-connection rows; receiver/lead-push/intake gates not set, so they stay OFF |
| Winnr (`WINNR_API_TOKEN`) | Mailbox/domain buying | Partly set up: token stored; purchases stay gated |
| Apollo (`APOLLO_ENCRYPTION_KEY`) | Prospect data | Partly set up: encryption key stored; Apollo API key is expected encrypted in the database (or via `APOLLO_API_KEY`, which is missing); live presence not checked |
| Mailbox/IMAP (`INBOX_CREDENTIALS_KEY`) | Inbound polling | Encryption key only; inboxes not checked |
| Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | Payments | Scaffolded only. Sandbox and live connections exist in the workspace but neither is linked. Checkout is limited to test mode |
| Gmail for PR (`GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN`, `PR_GMAIL_ACCOUNT`) | Creating PR drafts | Missing |
| Social/Unipile (`UNIPILE_WEBHOOK_HMAC_SECRET`, `SOCIAL_*` secrets) | Social inbound messages and DMs | Missing; receiver gate OFF |
| Voice provider (`CUSTOMER_VOICE_WEBHOOK_SECRET`) | Customer calls | Missing; only placeholder code exists |
| OpenAI (`OPENAI_API_KEY`) | Older AI paths | Missing; Lovable AI covers this |
| Cron/internal (`CRON_SECRET`, `LIFTOR_INTERNAL_KEY`, `OUTREACH_WEBHOOK_SECRET`) | Scheduled jobs and internal calls | Missing; scheduled jobs and auto-send stay OFF |
| Analytics | None beyond Search Console | Not applicable |

The code turns every action switch OFF when it isn't set. These switches include `AUTO_SEND_ENABLED`, `CRON_ENABLED`, `SMARTLEAD_*_ENABLED`, `SOCIAL_INBOUND_WEBHOOK_RECEIVER_ENABLED` and the `*_APPLY_ENABLED` flags. None of them is set, so all are OFF.

## 3. Safe to add now (read-only or test mode only)
- Stripe **sandbox** connection: test keys only. Do not link Stripe live.
- `SMARTLEAD_WEBHOOK_SECRET`: lets incoming events be checked. Leave the receiver switch OFF.
- Apollo key stored encrypted, then run a read-only connection test.
- Gmail PR keys: this path only creates drafts, never sends.
- Webhook-check secrets for social and voice: Unipile HMAC and voice webhook. Leave their switches OFF.
- Smartlead/Winnr provider-connection rows with sending/changes and inbound receiving both set to false.

## 4. Recommended order
1. Apollo: read-only connection test (data in, no sending)
2. Smartlead: add the webhook secret and provider-connection row with all switches false, then do a read-only sync of mailboxes and campaigns
3. Winnr/GSM: read-only sync check
4. Stripe sandbox: link it and run checkout in test mode
5. Gmail PR: drafts only
6. Social (Unipile) inbound: secret first, receiver stays OFF
7. Voice provider: last, once one is chosen
8. Cron/internal secrets: only when you approve scheduled automation

Turning on any sending, payment or provider change still needs your separate, explicit approval for each one.

## 5. Confirmation
This audit made no code, schema, data, secret, integration or provider changes. It sent nothing and made no external calls.
