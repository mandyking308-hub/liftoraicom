---
name: Dataset-Driven Outreach Engine
description: Outreach module that turns uploaded lead datasets into queued, sanity-checked outbound email campaigns across multiple businesses and inboxes.
type: feature
---

**Tables (founder-only RLS):**
- `import_batches` — business_name, source_name, file_name, total/valid/invalid/duplicate row counts.
- `imported_leads` — batch_id, email, name, company, role, country, raw_data jsonb, validation_status (valid/invalid/duplicate), processed, contact_id.
- `lead_scores` — contact_id (unique), score 0–100, reason. Rules: has role +20, has company +20, business match +20, baseline 40.
- `outreach_campaigns` — business_name, campaign_name, status (active/paused).
- `outreach_sequences` — campaign_id, step_number 1–4, subject, body, delay_days. Step delays fixed: 1=Day 0, 2=Day 3, 3=Day 7, 4=Day 14.
- `email_queue` — contact_id, campaign_id, sequence_step, scheduled_at, status (pending/sent/failed/blocked), inbox_id, business_name, block_reason, sent_at. Unique (contact, campaign, step).
- `campaign_metrics` — per-campaign totals (sent/opens/replies/bounces) + bounce_rate + reply_rate.

**RPCs / triggers:**
- `score_contact(_contact_id, _business_name)` → upserts lead_scores using the rules above.
- `assign_inbox_for_contact(_contact_id)` → picks active inbox for the contact's business with the lowest current_send_count under daily_send_limit, stamps it onto contacts.assigned_inbox_id (sticky).
- `bump_inbox_send_count` (AFTER UPDATE on email_queue.status) → +1 on inboxes.current_send_count when status flips to sent.
- `reset_inbox_send_counts()` → resets all inbox counters to 0.
- `recompute_campaign_metrics(_campaign_id)` → recomputes totals + rates after each worker run.

**Cron jobs:**
- `reset-inbox-send-counts-daily` — 00:00 UTC daily.
- `outreach-send-worker-15min` — every 15 minutes; calls outreach-send-worker via net.http_post.

**Edge functions:**
- `outreach-import-leads` — accepts `{ business_name, source_name, file_name, rows[] }`, validates emails, dedupes against contacts + within batch, calls `upsert_contact` for valid rows, scores them.
- `outreach-schedule-batch` — accepts `{ campaign_id, contact_ids?, max_contacts? }`. Picks NEW contacts for the campaign's business when none provided, assigns inbox, queues all 4 steps anchored at 09:00 UTC today + step delay.
- `outreach-send-worker` — pulls due pending items, enforces 08:00–17:00 UTC send window, calls `crm-send-check` (with log_attempt=true so the communication row is created and sanity layer enforced), marks items sent/blocked/failed, writes synthetic `email_events` (sent), recomputes campaign metrics. **Send is currently SIMULATED** — actual SMTP transmission is a no-op; replace this block with an HTTP→SMTP relay call to wire IONOS later.
- `outreach-inbound-webhook` — public (verify_jwt=false). POST `{ from_email, subject?, body?, is_bounce? }`. Logs inbound communication + email_event (replied) which flips contact.status→ENGAGED via `handle_new_communication`; or logs bounced event which flips contact→DO_NOT_CONTACT via `handle_email_bounce`.

**Founder UI:**
- `/founder/outreach` — dashboard: Sent (7d), Reply Rate, Bounce Rate, Active Campaigns, Leads by Status, Inbox Usage today.
- `/founder/outreach/imports` — CSV upload (cols: email,name,company,role,country) + recent batches.
- `/founder/outreach/campaigns` — create campaigns, edit 4-step sequence, schedule batch (calls outreach-schedule-batch for 50 NEW contacts), pause/activate.
- `/founder/outreach/queue` — view + filter queue, run worker on demand.

**Hard rules enforced:**
- ALL sends pass through `crm-send-check` (which also checks recent communication < 24h, status, conversation_active, last_contacted_at < 48h, bounces, inbox assignment).
- Same inbox sticks to a contact for life (assigned_inbox_id is set once and reused).
- Daily 80/inbox cap (safety buffer below 100) enforced via `inboxes.daily_send_limit` + `current_send_count` + reset cron.
- No AI in sending — content comes verbatim from outreach_sequences.
- **Single active campaign per contact**: `contacts.active_campaign_id` is locked on first enqueue. Trigger `guard_email_queue_single_campaign` rejects inserts that would queue a contact in a second campaign.
- **Reply = sequence exit**: trigger `cancel_queue_on_reply` (on `email_events.replied`) and `cancel_queue_on_inbound_comm` (on `communications.direction='inbound'`) flip all that contact's pending queue rows to `blocked / REPLY_RECEIVED` and clear `active_campaign_id`. Send worker also re-checks for a `replied` event before each send.
- **Bounce = global block**: trigger `cancel_queue_on_reply` (on `email_events.bounced`) sets contact → DO_NOT_CONTACT and blocks all pending rows.
- **Tracking placeholders**: `email_queue.tracking_pixel_id` (uuid) + `tracking_token` (text) are pre-allocated. `email_event_type` enum now includes `opened` and `clicked` for future SMTP/relay wiring. Send worker injects `<!-- tracking_pixel:{queue_id} -->` placeholder into the simulated send body.
- **Reply routing**: `outreach-inbound-webhook` writes the inbound communication with `inbox_id = contact.assigned_inbox_id`, guaranteeing replies are routed to the same sticky inbox the outbound used.
