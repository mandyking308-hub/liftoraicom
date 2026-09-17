# Section J — External-action safety model

Liftor's central safety claim: **nothing leaves the building unless a database gate row says it may, a founder types an exact confirmation phrase, and the batch is under a hard cap.** Code capability is irrelevant on its own.

## J1. The gate table

`public.external_action_gates` — columns: `gate_key`, `gate_label`, `action_type`, `provider_type`, `enabled`, `requires_founder_confirmation`, `confirmation_phrase`, `max_batch_size`, `risk_level`, `last_used_at`, `metadata`.

**19 rows. Every one has `enabled = false` at the audit date.**

| Gate key | Confirmation phrase | Max batch | Risk |
|---|---|---|---|
| `apollo_candidate_pull_gate` | EXECUTE APOLLO CANDIDATE PULL | 50 | high |
| `apollo_credit_spend_gate` | SPEND APOLLO CREDITS | 1 | high |
| `apollo_reveal_gate` | EXECUTE APOLLO REVEAL | 10 | high |
| `complaint_response_send_gate` | SEND COMPLAINT RESPONSE | 1 | high |
| `compliance_approval_gate` | EXECUTE COMPLIANCE APPROVAL | 10 | high |
| `compliance_suppression_gate` | EXECUTE COMPLIANCE SUPPRESSION | 50 | high |
| `customer_onboarding_share_gate` | SHARE CUSTOMER ONBOARDING | 1 | high |
| `customer_report_share_gate` | SHARE CUSTOMER QUARTERLY REPORT | 1 | medium |
| `dispute_response_send_gate` | SEND DISPUTE RESPONSE | 1 | high |
| `invoice_send_gate` | EXECUTE INVOICE SEND | 1 | **critical** |
| `manychat_dm_send_gate` | SEND MANYCHAT DM | 1 | **critical** |
| `metricool_schedule_post_gate` | SCHEDULE METRICOOL POSTS | 5 | high |
| `native_email_send_gate` | EXECUTE NATIVE EMAIL SEND | 1 | high |
| `proposal_send_gate` | EXECUTE PROPOSAL SEND | 1 | high |
| `prospecting_external_search_gate` | RUN EXTERNAL PROSPECTING SEARCH | 1 | high |
| `smartlead_campaign_start_gate` | EXECUTE SMARTLEAD CAMPAIGN START | 1 | **critical** |
| `smartlead_lead_push_gate` | EXECUTE SMARTLEAD LEAD PUSH | 25 | high |
| `smartlead_webhook_create_gate` | EXECUTE SMARTLEAD WEBHOOK CREATE | 1 | high |
| `winback_message_send_gate` | SEND WIN-BACK MESSAGE | 1 | high |

## J2. Execution mode

`public.system_execution_modes` defines `sales`, `outreach` (default) and `hybrid`; `public.system_mode_ledger` is the append-only change log. Current runtime mode: **`LIVE_INTERNAL_TEST`**, set 27 May 2026. Internal state may change; external actions stay gated.

## J3. Layered controls

1. **Gate row** — `enabled=false` blocks the action regardless of caller.
2. **Founder confirmation phrase** — the caller must send the exact `confirmation_phrase`; a mismatch returns `confirmation_phrase_required:<PHRASE>` and mutates nothing. The same pattern is repeated locally in many functions (e.g. `CREATE SOCIAL CAMPAIGN CONTENT MAP`).
3. **Batch cap** — `max_batch_size` per gate; the Smartlead micro-batch path caps cold outreach at **≤5 recipients** as the first proof size.
4. **Dry run first** — 300+ functions implement `dry_run` (default `true` in most handlers); a dry run returns `would_insert` / `would_send` counts and a sample, and performs no write and no provider call.
5. **Environment kill switches** — `AUTO_SEND_ENABLED`, `CRON_ENABLED`, `SMARTLEAD_LEAD_PUSH_ENABLED` and the other `*_ENABLED` names in Section A4 must be explicitly set; unset means off.
6. **Database-level suppression** — `check_outreach_allowed`, `check_send_throttle`, `apply_reply_stop_suppression`, `cancel_queue_on_reply`, `cancel_queue_on_inbound_comm`, `enforce_inbox_ramp`, plus global unsubscribe / DNC / hard-bounce suppression that blocks all brands simultaneously.
7. **Ownership collision** — one active portfolio owner per contact (unique partial index on `portfolio_contact_ownership`), 30-day cross-brand cooldown in `portfolio_collision_policy`. A founder override can reorder brand priority but can never beat suppression, unsubscribe/DNC, hard bounce or an active reply.
8. **Founder-approval triggers** — database triggers such as `enforce_founder_approval_for_buyer_outreach` and `enforce_founder_approval_for_warm_up_action` reject the write itself, not just the UI action.
9. **Fail-closed shells** — deliberately disabled receivers return 403 with an explicit reason (`provider_event_receiver_not_enabled`) rather than silently accepting data.
10. **Idempotency** — Apollo operation keys, Smartlead import idempotency keys and webhook dedupe prevent double execution on retry.

## J4. Irreversible-action boundary

Actions that cannot be undone — sending an email, starting a campaign, pushing leads, spending Apollo credits, sending an invoice, posting socially, sending a DM — are all behind a `critical`/`high` gate **and** a confirmation phrase **and** a batch cap. Reversible internal actions (drafting, scoring, mapping previews, readiness refreshes) are not gated this way; that asymmetry is deliberate.

## J5. What this model does not do

- It does not prevent a founder with the right role from enabling a gate and sending. It makes that an explicit, audited, phrase-confirmed act.
- It does not protect the three RLS-off tables in Section F5; those are a read-exposure problem, not an action problem.
