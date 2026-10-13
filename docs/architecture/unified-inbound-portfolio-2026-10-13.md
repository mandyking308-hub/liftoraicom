# Architecture Decision: Unified Inbound Portfolio Inbox

- **Date:** 13 October 2026
- **Status:** OWNER-APPROVED DESIGN DECISION. Recorded only. **Not implemented. Not live-verified ingestion.**
- **Scope:** Liftor founder operating system, all portfolio businesses (designed for up to ~100).
- **Runtime change made by this record:** NONE. No code, migrations, providers, mailboxes, campaigns, gates, cron or background processing were changed.

## 1. Decision

Liftor will provide **one founder-visible unified inbox/dashboard** across every portfolio business. It consumes:

1. Inbound replies arriving at the existing 200 GSM outreach mailboxes (Winnr-supplied, Smartlead-connected).
2. Structured website/form enquiries from business sites, Kindnesss first.

There is **no one-physical-mailbox-per-business requirement** and **no mailbox purchases**. Many underlying mailboxes and aliases feed one logical inbox.

## 2. Verified source facts (read-only audit, 13 Oct 2026)

- 200 active GSM mailboxes; 0 marked campaign-ready (all warming).
- 17 historical `inbound_messages`; 6 routed.
- One legacy inbox shows an inbound polling status error.
- 0 mailbox allocations to the active Kindnesss business (`640de582-a112-4d16-a221-03c27f00c6ec`).
- 0 `multi_channel_inbound_events` for that business.

These facts describe current state; they do not demonstrate the design below.

## 3. Principles

### 3.1 Capture
- Replies are captured via a **verified (signed) inbound provider webhook** or **IMAP capture**. Unsigned input is never accepted.
- Preserve the **sticky reply-to / return thread address** so a human or approved reply goes out from the mailbox the prospect actually wrote to.

### 3.2 Business assignment (deterministic only)
`business_id` is assigned only from trusted sources, in this order of evidence:
1. Trusted mailbox-to-business allocation.
2. Mapped provider campaign ID.
3. Verified alias.
4. Signed first-party webform event.

**Never** inferred by AI from sender name, subject or body. **No global fallback business.** Unknown or ambiguous messages go to a **founder review quarantine** visible to no other business.

### 3.3 Isolation
- Canonical contacts may be shared across the portfolio where lawful.
- Strictly isolated by `business_id`: `business_contact_relationships`, conversation state, AI response knowledge, sender domains, staff access, and customer records.

### 3.4 Durability and reliability
- Durable first write before any processing.
- Idempotency key on provider message ID or site event ID; deduplication.
- No-loss retry with a dead-letter queue.
- Health alarms for polling/ingestion failures.
- Raw message preserved safely, subject to retention and privacy rules.

### 3.5 Outbound interaction and safety
- A genuine reply **stops pending Smartlead follow-ups** for that recipient.
- Approval, compliance, opt-out/suppression and existing outbound gates are preserved unchanged.
- AI may classify and recommend. It may **not send** unless an existing approved business policy or trusted-sender rule permits it.

### 3.6 Website enquiries (Kindnesss first)
- Kindnesss keeps saving to its local `commercial_enquiries` on successful submission, independent of Liftor availability.
- Future ingestion into Liftor: signed, authenticated, idempotent, with a retry queue. **No child or private family content** is transmitted.
- A single GSM-owned business notifications mailbox is **optional**, and must be verified reliable before use. It is not one inbox per business.

## 4. Phased acceptance tests (must pass before go-live of each phase)

| # | Test | Pass condition |
|---|---|---|
| 1 | Fan-in | 200 replies from 200 distinct physical mailboxes appear in one UI, each with correct `business_id` and thread |
| 2 | Cross-business isolation | Same canonical contact replies to two businesses; relationships, threads and knowledge stay separate; neither business sees the other |
| 3 | Scale | 100 businesses configured; routing, UI and RLS remain correct and performant |
| 4 | Concurrency/duplicates | Two simultaneous duplicate messages produce one record |
| 5 | Retries / out-of-order | Replayed and out-of-order events converge to the same final state |
| 6 | Provider downtime | Polling/webhook outage raises an alarm; backlog recovers with no loss |
| 7 | Wrong mapping | Unknown or mismatched campaign/mailbox fails closed into founder quarantine |
| 8 | Chase stop | A genuine reply stops pending follow-ups immediately, verified at provider |
| 9 | Site resilience | Kindnesss form saves locally during a Liftor outage and is delivered later via retry |

## 5. Priority and sequencing

1. **First:** complete the Kindnesss real customer journey and Dodo sandbox readiness.
2. **Then:** after Kindnesss launch gates pass, implement Liftor inbound unification as a **separate controlled phase**.

## 6. Constraints of this record

- Documentation only. All existing Liftor code, businesses and customer records are preserved.
- No new vendors, spending, mailbox settings, campaigns, providers, migrations, auto-sends or background processing changes.
- GTranslate and the Kindnesss project were not touched.
