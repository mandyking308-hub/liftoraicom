---
name: CRM and Sanity Control Layer
description: Master CRM with contacts, inboxes, communications, email events, and the outreach sanity engine that gates every outbound send.
type: feature
---

Single source of truth for outreach across all Liftor businesses.

**Tables (founder-only RLS):** contacts (unique email, status NEW/CONTACTED/ENGAGED/QUALIFIED/CLIENT/SUPPLIER/DO_NOT_CONTACT, assigned_business, assigned_inbox_id, conversation_active, last_contacted_at, last_replied_at), communications, email_events, inboxes (daily_send_limit, current_send_count, warmup_status, active).

**Triggers:** inbound comm → conversation_active=true + auto-promote NEW/CONTACTED→ENGAGED; outbound → last_contacted_at + NEW→CONTACTED; bounced event → DO_NOT_CONTACT; replied event → reopen conversation. `expire_inactive_conversations()` clears active after 7 days.

**Edge Function `crm-send-check`:** POST {contact_id|email, log_attempt?, channel?, message?}. Calls `check_outreach_allowed` RPC. Blocks when status in (ENGAGED/QUALIFIED/CLIENT/DO_NOT_CONTACT), conversation_active, ANY communication (inbound or outbound) in last 24h, last_contacted_at <48h, any bounced event, or no inbox assigned.

**Inbox assignment:** manual only. No outreach until set.

**Dedup:** `upsert_contact` RPC merges by lowercased email.

**Founder routes:** /founder/crm (dashboard, 6 stat panels + status grid + inbox usage), /founder/crm/contacts (registry, search, filter, add), /founder/crm/contacts/:id (sanity-check banner, status/inbox controls, comms + events tabs), /founder/crm/inboxes (warmup, limits, toggle).
