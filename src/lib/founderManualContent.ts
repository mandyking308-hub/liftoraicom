import { format } from "date-fns";

export interface ManualLiveData {
  orgCount: number;
  workflowCount: number;
  agentCount: number;
  integrationCount: number;
  deploymentCount: number;
  templateCount: number;
  knowledgeCount: number;
  brainInsightCount: number;
  decisionCount: number;
  testRunCount: number;
  buildLogCount: number;
  manualPageCount: number;
  systemCount: number;
  architectureCount: number;
  launchedPlatformCount: number;
  recentBuildLogs: Array<{ title: string; change_type: string; module_affected: string; author: string; created_at: string; description: string | null }>;
  recentTestRuns: Array<{ run_name: string; status: string; total_tests: number; passed: number; failed: number; created_at: string }>;
}

export const generateManualMarkdown = (data: ManualLiveData): string => {
  const now = format(new Date(), "MMMM d, yyyy HH:mm");

  return `# Liftor AI — Founder Manual
## Complete Engineering-Level Platform Documentation

**Version:** 4.5 — Compliance Spine + Stage-to-Queue / Queue-Creation Gates + Auto-Send Kill-Switch Incident (13 May 2026)
**Generated:** ${now}
**Classification:** Founder / Internal Engineering / Investor Documentation
**Status:** Live — Auto-generated from platform state

---

## Table of Contents

0. Operational Handover — NeonCandy / Outreach (1 May 2026)
0b. Apollo Reveal Workflow & Policy-Controlled Autonomous Pipeline (13 May 2026)
0c. Compliance Spine, Stage-to-Queue Gate, Queue Creation Gate & Auto-Send Incident (13 May 2026)
0a. Credentials & Secrets Register
1. Platform Overview
2. Full Platform Architecture
3. Platform Infrastructure Modules
4. Enterprise Platform Management
5. Platform Operations Control
6. Founder Control Systems
7. AI Brain Architecture
8. Platform Testing & Validation Suite
9. Database Structure
10. Edge Functions
11. Navigation & Routes
12. Deployment Architecture
13. Platform Build Log
14. Documentation Engine
15. Export System

---

## SECTION 0 — OPERATIONAL HANDOVER — NEONCANDY / OUTREACH (1 MAY 2026)

> This section is the single source of truth for the current live state of the
> only operational outreach pipeline. It supersedes any earlier wording in
> later sections where there is conflict.

### 0.1 NeonCandy Business Context

- **NeonCandy is the only live operational account currently being worked.**
- All other businesses (GloBlast, Liftor AI demo tenant, Health Access, etc.)
  have been archived as simulation/test data and removed from active operations.
- **Mode:** \`BUSINESS-LIVE\`.
- **Campaign:** \`Early Access Collaboration Test\`.
- **Sequence:** Day 0 (Step 1) → Day 3 (Step 2) → Day 7 (Step 3) → Day 14 (Step 4).
- **Sender daily cap:** 10 (provider-side IONOS new-mailbox limit; will increase as the mailbox warms).

### 0.2 Valid Sender / Inbox Rule

- The **only** valid live NeonCandy outbound and reply inbox is:
  - \`hello@neoncandy.online\` (IONOS)
- All sending, all replies, all queue creation, all AI drafts, and all
  inbound polling for NeonCandy MUST be routed through this inbox only.

### 0.3 Disabled music@neoncandy.net Rule

- \`music@neoncandy.net\` is **historical only / disabled**.
- It must NOT be used for: sending, fallback sender, campaign sender,
  staging, queue creation, inbound routing, AI replies, or business
  default sender.
- For NeonCandy, any inbox other than \`hello@neoncandy.online\` must be
  blocked at the sanity layer with the reason code:
  - \`NEONCANDY_INVALID_INBOX\`
- Manual rule: *"music@neoncandy.net must remain historical only.
  Operational use is forbidden."*

### 0.4 Apollo Integration

- Apollo connection is working end-to-end for NeonCandy.
- People Search and Person Enrichment both succeed.
- Endpoint corrected to \`/api/v1/mixed_people/api_search\`
  (the previous \`/people/search\` path was wrong and removed).
- Apollo People Search does **not** return raw emails; enrichment is
  required to obtain a deliverable address.
- Enrichment now has timeout/resume protection so partial batches recover.
- Pagination was fixed to stop repeating the first 25 results on every page.

### 0.5 Apollo Month 1 Segment

- Active segment: **NeonCandy Month 1**.
- Purpose: feed the Weekend Pool from a curated Apollo audience.
- Imported via Apollo Search → Bulk Enrichment → central \`contacts\` table
  → \`business_contact_relationships\` (BCR) attached to NeonCandy.

### 0.6 Weekend Pool

- Target size: **100 contacts**.
- **47 NeonCandy contacts are currently staged/eligible** for the
  Early Access Collaboration Test campaign.
- Pool feeds directly into the Early Access Collaboration Test campaign
  via the staging action.

### 0.7 Daily Monitor & Live Monitor

- **Daily Monitor** — founder-facing day view: today's due Step 1/2/3/4,
  reply backlog, sender cap remaining, AI drafts awaiting approval.
- **Live Monitor** — real-time card "Active campaign movement" showing:
  Ready to stage, Staged contacts, Active Step 1 pending, Real SMTP sent
  today, Valid follow-ups scheduled, Next due send, Queue integrity,
  Sender (\`hello@neoncandy.online\`).

### 0.8 Campaign Sequence

| Step | Day offset | Purpose |
|------|------------|---------|
| 1 | 0 | First touch — collaboration intro |
| 2 | +3 | Soft follow-up |
| 3 | +7 | Value reinforcement |
| 4 | +14 | Final follow-up / breakup |

### 0.9 CRM / Contact Pool & business_contact_relationships

- \`contacts\` is the central, business-agnostic pool of every person
  imported across all sources (Apollo, manual, etc.).
- \`business_contact_relationships\` (BCR) attaches a contact to a
  specific business with: \`qualification\`, \`campaign_eligible\`,
  \`current_stage\`, \`last_campaign_id\`, \`do_not_contact\`.
- A NeonCandy contact is "live" only when the BCR has
  \`business_name='Neon Candy'\` AND \`campaign_eligible=true\` AND
  \`current_stage='staged'\` AND \`last_campaign_id\` = Early Access
  Collaboration Test campaign id.

### 0.10 Suppression Rules

Always-suppress (never sendable, never overrideable by cleanup):
- \`contacts.is_globally_suppressed = true\`
- \`contacts.hard_bounced = true\`
- Any inbound STOP / unsubscribe event
- Bounce events
- Legal / privacy / GDPR-deletion request
- Founder-marked DNC on the BCR

### 0.11 AI Drafts / Founder Approval

- All AI-generated reply drafts are **human-in-the-loop**.
- Drafts are created by the AI agent and queued; nothing is sent until
  the founder explicitly approves and clicks send.
- Auto-send of AI drafts is **forbidden**.

### 0.12 Known Historical Simulated-Row Issue

Earlier in the build, the system created a large volume of simulated /
test outbound rows that were later mistaken for real sends. These
polluted the sanity layer's RECENT_COMMUNICATION_24H check and blocked
legitimate first-touch emails.

### 0.13 Queue Cleanup (Completed)

- **19 legacy simulated Step 1 rows quarantined** with reason code:
  \`SIMULATED_LEGACY_QUARANTINED\`
- **75 invalid follow-ups cancelled** with reason code:
  \`SIMULATED_PARENT_NOT_SENT\`
- **Active simulated rows after cleanup: 0**
- **Active invalid-parent follow-ups after cleanup: 0**
- All non-NeonCandy test businesses (GloBlast, Liftor AI demo, Health
  Access) were archived to \`cleanup_archive\` and removed from the
  active queue, contacts, BCR, and inboxes tables.

### 0.14 Staging Bug & Fix

- **Old behaviour:** the staging action only flipped contact stage flags
  but did not actually create email_queue rows, so contacts appeared
  "staged" while no Step 1/2/3/4 jobs existed.
- **Fix applied:** the staging action now invokes
  \`outreach-schedule-batch\` with the campaign id and the contact ids,
  guarantees creation of all 4 sequence rows per contact, and fails
  loudly if queue rows are not created.
- One-shot data fix for the 47 NeonCandy BCRs created the full set of
  sequence rows (Step 1 due immediately, Steps 2-4 scheduled at the
  correct +3 / +7 / +14 day offsets).
- UI wording updated: the action label now reads
  *"Stage into campaign queue"* — never just "Stage".

### 0.15 Current Send-Worker Status

### 0.15 Current Send-Worker Status — **DAY-1 SENDING COMPLETE, IONOS CAP REACHED (1 May 2026)**

**Real SMTP campaign send is proven end-to-end and Liftor is no longer
blocked internally. The only remaining limit today is the IONOS
provider-side daily cap.**

- **16 real SMTP sends completed today via \`hello@neoncandy.online\`.**
  Every successful send recorded:
  - \`delivery_kind = smtp_real\`
  - \`smtp_accepted_at\` populated
  - \`provider_message_id\` populated (valid IONOS id)
  - No \`music@neoncandy.net\` involvement
  - No simulated send path
- IONOS then enforced its provider-side daily ramp limit and returned
  \`450 Mail send limit exceeded\`. Remaining Step 1 sends are blocked
  **only** by this provider cap — not by Liftor logic, not by stale
  data, not by the sanity layer.
- **Queue integrity: Clean.** No simulated rows, no false 24h blockers,
  no suppression / bounce / inbound conflicts.

**Fixes completed to reach this proof:**

- \`crm-send-check\` now ignores simulated / failed / no-SMTP
  communications for the \`RECENT_COMMUNICATION_24H\` check.
- New \`communications.ignored_for_send_check\` boolean column added
  (with \`ignored_reason\` text).
- False outbound communication rows marked
  \`ignored_for_send_check = true\` with an \`ignored_reason\`.
- Ghost \`contacts.last_contacted_at\` values cleared where no real SMTP
  backed them.
- Falsely-blocked Step 1 rows reset to \`pending\`.
- \`outreach-send-worker\` replaced \`denomailer\` with \`nodemailer\`.
- The *invalid cmd* / *Bad resource ID* crash during SMTP \`QUIT\` is
  resolved; the worker boots and completes its run cleanly.
- Communications are only logged **after** a successful SMTP accept, so
  failed attempts can no longer create new ghost 24h blocks.
- The worker now treats \`450 Mail send limit exceeded\` as
  \`provider_daily_limit_reached\`. After this signal fires for an
  inbox, the worker immediately stops further sends from that inbox
  for the day, marks remaining due rows as \`delayed\` (not failed),
  and the Live Monitor shows a *"Provider cap reached · resumes …"*
  banner instead of red failures.

**Remaining known issue (cosmetic, non-blocking):**

- **IMAP APPEND to IONOS Sent folder is failing**, so the IONOS Webmail
  "Sent Items" view does not currently show copies of the sent emails.
  - Deliverability is unaffected — SMTP acceptance is recorded with a
    valid \`provider_message_id\` for every accepted send.
  - To fix later for audit visibility: rework the worker's IMAP APPEND
    code path so each accepted send is appended to the IONOS Sent folder
    and \`saved_to_sent_at\` (or \`append_error\`) is populated.

**Current operational state:**

- Real sending works end-to-end.
- Today's IONOS quota is exhausted (16 accepted, then \`450\` cap).
- **Do not run the worker again today.** Remaining Step 1 sends will
  resume automatically after the IONOS rolling 24h window resets.
- Next action: wait for IONOS capacity to reset, then allow the worker
  to resume on its normal schedule (next send window approx. 09:00 UTC
  the following day).

### 0.16 Immediate Next Operational Target

1. **Do not** run the send worker again today for
   \`hello@neoncandy.online\`. The IONOS daily cap has been reached.
2. Wait for the IONOS rolling 24h window to reset.
3. Allow the worker to resume on its normal schedule. It will pick up
   the remaining Step 1 \`delayed\` rows automatically.
4. **Tuesday review** — open Live Monitor and Daily Monitor and verify:
   - Real SMTP sent count for the new window
   - Replies received
   - Bounces / suppression events
   - AI drafts awaiting founder approval
   - Remaining Step 1 queue depth and Step 2/3/4 schedule
   - IONOS limit behaviour (did the cap raise as the mailbox warms?)
   - Whether IMAP APPEND to the IONOS Sent folder has been fixed
     (i.e. \`saved_to_sent_at\` now populates and copies appear in
     IONOS Webmail "Sent Items")

### 0.17 Do Not Do Next

- Do not rebuild Apollo.
- Do not add more dashboards.
- Do not add more Apollo batches until the IONOS cap clears and the
  remaining staged contacts have been worked through.
- Do not re-enable \`music@neoncandy.net\`.
- Do not run the send worker again today against
  \`hello@neoncandy.online\` unless explicitly forced by the founder.
- Do not treat simulated rows as live.
- Do not auto-send AI drafts.
- Do not stage future contacts without confirming queue rows were created.

---

## SECTION 0b — APOLLO REVEAL WORKFLOW & POLICY-CONTROLLED AUTONOMOUS PIPELINE (13 MAY 2026)

> Captures the corrections and the new autonomous pipeline shipped
> between 12–13 May 2026. Supersedes any earlier wording about
> "pull verified emails" or "Apollo gives us emails directly".

### 0b.1 Apollo reality (corrected wording)

- Apollo **People Search** (\`/api/v1/mixed_people/api_search\`) returns
  candidate profiles and *email availability signals* only.
- Apollo **does not** return the actual email address from search.
- The deliverable email is only obtained via Apollo
  **reveal / enrichment / unlock** (\`/api/v1/people/match\` or
  \`/api/v1/people/bulk_match\`), which **spends Apollo credits**.
- Therefore the platform now treats *Search* and *Email Reveal* as two
  distinct stages with two distinct gates.

### 0b.2 Stage model (Command Centre)

1. **Apollo Candidate Pull** — search → stage candidates as
   \`email_reveal_required\`. No credits spent.
2. **Lead Quality Scoring** — \`lead-quality-autopilot\` scores each
   candidate (0–10 \`fit_confidence\`); de-dupes against \`contacts\` /
   BCR / suppression / internal / previous-no-email / poor-fit /
   bounced.
3. **Reveal Shortlist** — only candidates with verified-email-available
   signal AND quality score ≥ policy threshold AND domain frequency ≤
   policy cap are recommended for reveal. Founder sees a credit
   estimate based on **unique** candidates before any credits are spent.
4. **Apollo Email Reveal** — \`apollo-unlock-shortlist\` /
   \`apollo-unlock-selected\` runs bulk_match. Every credit use is
   logged to \`apollo_credit_ledger\` (append-only).
5. **CRM Promotion** — only verified, CRM-new, campaign-fit, not
   suppressed leads are promoted into central \`contacts\` and attached
   via \`business_contact_relationships\` (BCR).
6. **Queue (Step 1)** — \`crm-send-check\` gates every queue insertion;
   domain cap is enforced.
7. **Send** — \`outreach-send-worker\` continues to enforce all hard
   guardrails (suppression, hard-bounce, internal, duplicate-pending,
   NeonCandy inbox guard, sequence chain-on-success).

### 0b.3 Safe-to counters

- *Safe to reveal* = unique candidates passing quality + policy gates.
- *Safe to promote* = stays at 0 until reveal is complete.
- *Safe to queue* = stays at 0 until promotion is complete.

### 0b.4 Policy-controlled autonomous pipeline

New table \`business_autopilot_settings\` (one row per business, keyed
by \`business_id\`) holds the operating rules:

- \`apollo_candidate_pull_enabled\`
- \`apollo_email_reveal_autonomous\` (default **false** — founder must
  explicitly enable)
- \`apollo_reveal_daily_credit_budget\` (default 50)
- \`apollo_reveal_monthly_credit_budget\` (default 500)
- \`apollo_reveal_min_quality_score\` (default 7)
- \`apollo_reveal_max_domain_frequency\` (default 2)
- \`auto_promote_after_valid_reveal\`,
  \`auto_promote_only_verified_email\`,
  \`auto_promote_only_crm_new\`,
  \`auto_promote_only_campaign_fit\`
- \`auto_queue_after_promotion\`, \`auto_queue_domain_cap\` (default 2)
- \`auto_send_after_queue\` (default **false** — IONOS proof mode)
- \`sending_provider_mode\` (\`ionos_proof\` | \`external_scale\`)
- \`daily_send_budget\` (default 20)

Audit / decision tables (existing tables reused, no parallel duplicates):

- \`autopilot_runs\` — per-run summary + JSONB \`details\` snapshot.
- \`system_events\` — per-stage events
  (revealed / promoted / queued / blocked-by-policy / ambiguous).
- \`founder_decisions\` — captures policy changes, budget overrides,
  enable-auto-send flips, ambiguous-lead approvals.
- \`apollo_credit_ledger\` — append-only credit usage with
  \`function_source\`, \`credits_used\`, \`apollo_person_ids\`.

### 0b.5 \`autopilot-orchestrator\` edge function

Single entry point per business (manual trigger + scheduled).
Defaults to \`dry_run: true\` so the first run never spends credits or
creates contacts/queue rows. Deterministic — no AI calls.

1. Loads policy + today's credit usage.
2. Selects \`lead_quality_profiles\` rows in \`email_reveal_required\`
   that pass policy (score ≥ threshold, not in CRM, not duplicate, not
   bounced/suppressed/internal, not previous-no-email, not poor-fit,
   domain count under cap).
3. Computes
   \`reveal_batch_size = min(eligible, daily_remaining, monthly_remaining)\`.
4. If \`apollo_email_reveal_autonomous = true\` → calls bulk reveal,
   classifies outcomes (verified / no_email / catch_all / failed).
5. If \`auto_promote_after_valid_reveal = true\` → promotes verified,
   CRM-new, campaign-fit, not-suppressed leads to \`contacts\` + BCR.
6. If \`auto_queue_after_promotion = true\` → inserts Step 1 into
   \`email_queue\` via \`assign_inbox_for_contact\`, respecting
   \`auto_queue_domain_cap\`.
7. If \`auto_send_after_queue = false\` (current default) → stops.
   The send worker remains the only thing that can dispatch live email
   and it still enforces every existing guardrail.
8. Anything ambiguous (unexpected enrichment shape, policy breach,
   budget about to exceed, new-large-suppression event, copy change
   request) is **not** acted on — it is written to
   \`founder_decisions\` for explicit founder approval.
9. Every action (acted, planned, blocked, skipped) is written to
   \`autopilot_runs.details\` and \`system_events\`.

### 0b.6 UI surfaces (Command Centre)

- \`AutonomousPipelineStatus.tsx\` — live counters (pulled / passed /
  revealed / credits used today + this month / valid / no-email /
  promoted / queued / waiting on send provider / blocked by policy /
  next scheduled run) + ON/OFF policy chips
  (Reveal · Auto-promote · Auto-queue · Auto-send) + sending provider
  mode + **Plan (dry-run)** and **Run live** buttons.
- \`AutopilotPolicyPanel.tsx\` — founder-only form bound to
  \`business_autopilot_settings\`. Sensitive flips (enabling
  \`apollo_email_reveal_autonomous\`, raising credit budgets, flipping
  \`auto_send_after_queue\` to true, switching to
  \`external_scale\`) write a row to \`founder_decisions\` for audit.
- \`FounderDecisionQueue\` view surfaces pending decisions with
  approve / reject buttons.
- \`ApolloRevealShortlist.tsx\` collapses to read-only "Recent
  autonomous reveal batches" when the autonomous flag is on.
- \`ApolloPullPanel.tsx\` and \`SourceQualityBrief.tsx\` re-labelled to
  reflect Search vs Reveal as separate stages and to show the unique
  credit estimate before reveal.

### 0b.7 Safety posture as shipped (13 May 2026)

- NeonCandy row in \`business_autopilot_settings\` seeded with
  \`apollo_email_reveal_autonomous = false\` and
  \`auto_send_after_queue = false\`.
- First orchestrator run is dry-run only.
- **No Apollo credits were spent during implementation.**
- **No contacts were promoted during implementation.**
- **No \`email_queue\` rows were created during implementation.**
- **No emails were sent during implementation.**
- The 75 previously-staged candidates are held as
  \`email_reveal_required\` until the founder reviews the dry-run plan
  and explicitly enables live policy.

### 0b.8 How to turn it on (when ready)

1. Open Command Centre → *Autopilot Operating Policy*.
2. Review/adjust thresholds and credit budgets.
3. Click **Plan (dry-run)** and inspect planned actions in
   \`AutonomousPipelineStatus\` and \`autopilot_runs.details\`.
4. Toggle **Autonomous email reveal** ON, save (creates a
   \`founder_decisions\` audit row), and click **Run live**.
5. \`auto_send_after_queue\` stays OFF until an external scaled
   provider (e.g. Smartlead) is configured. IONOS continues to be the
   proof inbox only.

### 0b.9 Migrations / files of record (this build window)

- \`supabase/migrations/20260512200652_*.sql\` — Apollo reveal workflow
  correction (search vs reveal as separate stages,
  \`email_reveal_required\` staging).
- \`supabase/migrations/20260513080401_*.sql\` — initial autopilot
  schema (later consolidated).
- \`supabase/migrations/20260513080925_*.sql\` — consolidation: removed
  parallel duplicate audit tables, switched to \`business_id\`, reused
  \`autopilot_runs\` / \`founder_decisions\` / \`system_events\`,
  preserved CRM spine
  (candidate → \`lead_quality_profile\` → \`contacts\` → BCR →
  \`email_queue\`).
- \`supabase/functions/autopilot-orchestrator/index.ts\` — orchestrator.
- \`supabase/functions/lead-quality-autopilot/index.ts\` — recommends
  *"View autonomous pipeline status"* when autonomous reveal is on.
- \`supabase/functions/apollo-pull-verified/index.ts\` — fires
  orchestrator (fire-and-forget) after a successful pull when both
  \`apollo_candidate_pull_enabled\` and
  \`apollo_email_reveal_autonomous\` are true.
- \`supabase/functions/apollo-unlock-shortlist/index.ts\` — reveal
  shortlist execution.
- \`src/components/founder/AutonomousPipelineStatus.tsx\`,
  \`AutopilotPolicyPanel.tsx\`, \`ApolloPullPanel.tsx\`,
  \`ApolloRevealShortlist.tsx\`, \`SourceQualityBrief.tsx\`,
  \`LeadQualityPanel.tsx\` and \`src/pages/founder/CommandCentre.tsx\`.

---

## SECTION 0c — COMPLIANCE SPINE, STAGE-TO-QUEUE GATE, QUEUE CREATION GATE & AUTO-SEND INCIDENT (13 MAY 2026)

> Captures the May 13 2026 build window in which the platform's outreach
> pipeline was re-architected around an explicit, server-enforced
> compliance spine and a multi-gate promotion model
> (Promote → Stage → Queue → Send). Also documents the live-fire incident
> in which three Apollo-promotion contacts were sent before an
> auto-send kill-switch existed, and the corrective architecture that
> follows.

### 0c.1 The new outreach promotion model

Outreach is no longer a single button. It is a sequence of four
independent server-side gates, each with its own audit row and dry-run
preview. Nothing advances to the next gate without an explicit founder
action.

1. **Promote (Apollo → CRM)** — \`promote-leads-to-contacts\` moves
   verified, campaign-fit, CRM-new Apollo leads into central
   \`contacts\` with \`compliance_status='pending_review'\` and creates
   the matching \`business_contact_relationships\` (BCR) row at
   \`current_stage='promoted'\`.
2. **Compliance Approval** — \`compliance-approve\` flips a contact
   from \`pending_review\` to \`outreach_allowed\` (or
   \`rejected\` / \`dnc\`) and writes a row to
   \`contact_compliance_events\` with founder identity, prior status,
   new status, reason, and timestamp.
3. **Stage-to-Queue Eligibility Gate** —
   \`stage-to-queue-eligibility\` evaluates contacts that are
   \`outreach_allowed\` AND in the clean Apollo promotion batch AND
   have no historical conflict, and stages the BCR
   (\`current_stage='staged'\`, \`campaign_eligible=true\`,
   \`last_campaign_id\` = target campaign).
4. **Queue Creation Gate** — \`create-queue-from-staged\` inserts
   Step 1 \`email_queue\` rows for staged + outreach-allowed +
   campaign-eligible BCRs (status=\`pending\`, scheduled_at=now).
   Idempotent: refuses to insert if a row for
   (contact_id, campaign_id, sequence_step=1) already exists.
5. **Send** — \`outreach-send-worker\` (cron-driven every 2 minutes via
   \`outreach-send-worker-2min\`) drains rows in
   (\`pending\`,\`delayed\`,\`throttled\`) through IONOS SMTP.

Each gate ships with a Command Centre dry-run preview panel. The Apply
button is disabled until a Preview has succeeded in the same session.

### 0c.2 Compliance Spine — schema additions

- \`contacts.compliance_status\` — enum-like text:
  \`pending_review\` (default for newly promoted) ·
  \`outreach_allowed\` · \`rejected\` · \`dnc\`.
- \`contact_compliance_events\` (append-only) —
  \`contact_id\`, \`previous_status\`, \`new_status\`, \`reason\`,
  \`actor_user_id\`, \`actor_email\`, \`source\`
  (\`founder_panel\` | \`auto\` | \`bulk_backfill\`), \`metadata\` jsonb,
  \`created_at\`. RLS: founder-only insert, founder-only select.
- \`compliance_spine_backfilled\` event recorded once
  (\`system_events\` 13 May 14:28 UTC) when historical contacts were
  given default \`compliance_status\` values.

**Hard rule:** no contact with \`compliance_status != 'outreach_allowed'\`
may be staged, queued, or sent — enforced server-side at every gate, not
just in the UI.

### 0c.3 Stage-to-Queue Eligibility Gate

Edge function: \`supabase/functions/stage-to-queue-eligibility/index.ts\`.

Server-side candidate selection:

- \`assigned_business = 'Neon Candy'\`
- \`compliance_status = 'outreach_allowed'\`
- Member of the *clean Apollo promotion batch* (verified email, not
  duplicate, not previously bounced, not in suppression).
- Has a BCR for Neon Candy in \`promoted\` (or already \`staged\` —
  re-stage is a no-op).
- No prior \`email_queue\` row for the target campaign.

Outcome categories per candidate:

- \`eligible_to_stage\` — passes all checks.
- \`already_staged\` — BCR already at \`staged\`.
- \`excluded_no_bcr\` — no BCR row for the business (this caused a bug
  on 13 May; see 0c.6).
- \`excluded_compliance\` — \`pending_review\` / \`rejected\` / \`dnc\`.
- \`excluded_existing_queue_row\` — already has a queue row for this
  campaign step.
- \`excluded_history\` — historic suppression / bounce / DNC / inbound
  STOP / prior conversation owned by another business.

The dry-run preview returns the per-row outcome breakdown plus
aggregate counts (\`candidates_checked\`, \`eligible_to_stage\`,
\`bcrs_to_qualify\`, \`contacts_to_assign_inbox\`,
\`contacts_to_assign_campaign\`, \`queue_rows_to_create\` (always 0 at
this stage), \`sends_to_create\` (always 0),
\`apollo_credits_to_spend\` (always 0)).

Apply path stages BCRs only — it does **not** create queue rows or send
anything. Audit row written to \`system_events\` as
\`stage_to_queue_eligibility_approved\` with the full eligibility
payload. Recorded run on 13 May 14:45 UTC staged Aaliah, Morgan and
Pooja.

### 0c.4 Queue Creation Gate

Edge function: \`supabase/functions/create-queue-from-staged/index.ts\`.

Server-side selection:

- BCR \`current_stage = 'staged'\` AND \`campaign_eligible = true\`
  AND \`last_campaign_id\` = Early Access Collaboration Test campaign id.
- Contact \`compliance_status = 'outreach_allowed'\`.
- No existing \`email_queue\` row for
  (contact_id, campaign_id, sequence_step=1).
- Sender resolves to \`hello@neoncandy.online\` only — any other inbox
  is blocked with sanity reason \`NEONCANDY_INVALID_INBOX\`.

Apply path inserts \`email_queue\` rows with \`status='pending'\`,
\`scheduled_at=now()\`, \`business_name='Neon Candy'\`,
\`sequence_step=1\`. Idempotent: \`NOT EXISTS\` pre-check on
(contact_id, campaign_id, step).

Audit row written to \`system_events\` as
\`queue_created_from_staged_contacts\` with the created queue row ids,
contact ids, exclusion counts, and zero-send confirmations.

On 13 May 15:00 UTC this created 3 \`email_queue\` rows for Aaliah,
Morgan and Pooja:

- \`8a92edbb-2e61-49b7-a6df-3bac21268fe0\`
- \`677a3ffd-bf48-457d-88e1-189225d8ce6a\`
- \`e5a80b74-48b2-4317-89e5-bc687e42cb65\`

### 0c.5 Compliance Approval flow

- Edge function \`compliance-approve\` flips a single contact's
  \`compliance_status\` and writes to \`contact_compliance_events\`.
- Founder-only Compliance Approval panel surfaces every
  \`pending_review\` contact with the Apollo source payload, the BCR
  context, the deliverable email, and Approve / Reject / DNC buttons.
- Bulk approve is gated by the same per-contact server-side checks; UI
  selection is convenience only — the function still validates each
  row.
- Audit run \`contact_compliance_approval_completed\` recorded on
  13 May 14:43 UTC for the Aaliah / Morgan / Pooja batch.

### 0c.6 BCR-lookup bug (caught and fixed in this window)

- **Symptom:** Stage-to-Queue gate reported
  \`excluded_no_bcr\` for all 3 Apollo promotion contacts even though
  their BCR rows clearly existed.
- **Cause:** the candidate join was matching BCR rows on a normalised
  business slug while the BCR table stored the human-readable
  \`business_name\`. The lookup therefore returned zero rows.
- **Fix:** the eligibility query now joins via
  \`business_contact_relationships.business_name = 'Neon Candy'\`
  (and a tolerant \`ilike\` fallback for legacy \`'NeonCandy'\`
  rows), and the candidate set is reduced to the clean Apollo
  promotion batch *before* the BCR join — preventing legitimate
  contacts being mis-flagged as \`excluded_no_bcr\`.
- **Validation:** preview re-run on 13 May returned
  \`candidates_checked=3\`, \`eligible_to_stage=3\`,
  \`excluded_no_bcr=0\`. No queue rows or sends were created during
  the diagnostic phase.

### 0c.7 Auto-Send Incident (13 May 2026, 15:00 UTC) — root cause and corrective architecture

**What happened.** Within 25–42 seconds of the Queue Creation Gate
inserting the 3 \`pending\` rows for Aaliah, Morgan and Pooja, the
\`outreach-send-worker-2min\` cron job picked them up and sent all 3
via IONOS SMTP through \`hello@neoncandy.online\`. Each row recorded a
populated \`sent_at\`, \`smtp_accepted_at\` and a valid IONOS
\`provider_message_id\`. \`sent_folder_copy_failed\` events fired for
each (the IMAP-APPEND-to-Sent issue from Section 0.15 is still open).

**Root cause.** The repeated operating brief said *"Auto-send: OFF"*
but **no \`auto_send_enabled\` flag actually existed**. The
\`system_settings\` table only contained:

| key | value |
|-----|-------|
| \`outbound_provider_configured\` | \`true\` |
| \`outbound_provider_test_passed_at\` | \`2026-05-01 09:25:15+00\` |
| \`system_mode\` | \`live\` |

The send worker had no kill-switch to read. Once a queue row was in
\`pending\` and the cron was active, sending was inevitable.

**Sierra and Jack were correctly excluded** by the existing server-side
gates (Sierra: \`apollo_raw_leads.quality_status='rejected'\`;
Jack: prior \`email_queue\` history). Suppression / bounce / DNC /
internal-domain / inbound-STOP gates all behaved correctly. The defect
was strictly the absence of a global send kill-switch.

**Corrective architecture (queued for the next build):**

1. Add \`system_settings.auto_send_enabled\` (boolean, default
   **false**) — the single global send kill-switch.
2. Patch \`outreach-send-worker/index.ts\` so the very first action
   after auth is to read the flag and exit cleanly when false (with a
   \`worker_skipped_auto_send_off\` \`system_events\` row per skipped
   tick).
3. Per-business override:
   \`business_autopilot_settings.auto_send_after_queue\` (already
   exists, default false) is required to ALSO be true for any row
   tagged with that \`business_id\` to be eligible for send.
4. Founder-only **Auto-Send Master Switch** card in Command Centre
   that flips the global flag and writes a \`founder_decisions\` row
   capturing actor, previous value, new value, reason and timestamp.
5. Live Monitor banner: *"Auto-send is OFF — queue rows will accumulate
   as \`pending\` and will not be dispatched."* whenever the flag is
   false.
6. Backfill \`contact_compliance_events\` with
   \`event_type='outreach_email_sent'\` rows for the 3 already-sent
   Aaliah / Morgan / Pooja messages so the audit trail reflects
   reality, and update their conversation lifecycle in
   \`conversations\` / \`communications\`.

Until item 1 ships, the only safe operational posture is to leave
\`outreach-send-worker-2min\` paused (\`active=false\`) whenever a
founder is not actively shepherding a send window.

### 0c.8 Server-side guardrails confirmed working

The incident was an absent kill-switch, not a guardrail failure. The
following gates were verified in the same diagnostic window:

- \`crm-send-check\` — RECENT_COMMUNICATION_24H, suppression,
  hard-bounce, internal-domain, NEONCANDY_INVALID_INBOX,
  duplicate-pending, inbound-STOP, prior-conversation-owned-elsewhere,
  domain-cap.
- \`stage-to-queue-eligibility\` — compliance, BCR existence,
  campaign-fit, history conflict.
- \`create-queue-from-staged\` — idempotency, sender allow-list,
  compliance re-check at insertion time.
- \`outreach-send-worker\` — provider-cap (\`450 Mail send limit
  exceeded\` → row marked \`delayed\`), suppression and DNC
  re-check at dispatch.

### 0c.9 Operational state at end of build window (13 May 2026)

- 3 Apollo-promotion contacts (Aaliah, Morgan, Pooja) sent at 15:00 UTC
  through \`hello@neoncandy.online\` — outside the originally-intended
  preview-only flow.
- All other Apollo promotion candidates remain at
  \`compliance_status='pending_review'\` and have not been staged.
- Sierra remains \`rejected\`. Jack remains excluded by prior queue
  history.
- \`auto_send_after_queue\` for NeonCandy in
  \`business_autopilot_settings\` is **false**.
- The 2-minute send-worker cron should be paused until the global
  \`auto_send_enabled\` flag ships.

### 0c.10 Files of record (this build window)

- \`supabase/functions/promote-leads-to-contacts/index.ts\`
- \`supabase/functions/compliance-approve/index.ts\`
- \`supabase/functions/stage-to-queue-eligibility/index.ts\`
- \`supabase/functions/create-queue-from-staged/index.ts\`
- \`supabase/functions/crm-send-check/index.ts\`
- \`supabase/functions/outreach-send-worker/index.ts\`
- \`src/components/founder/LeadQualityPanel.tsx\` (Stage-to-Queue gate
  + Queue Creation gate panels with dry-run preview)
- Compliance Approval panel surfaced under Command Centre →
  *Lead Quality + Queue Integrity Gate*.
- New tables / columns: \`contacts.compliance_status\`,
  \`contact_compliance_events\`.
- Audit \`system_events\`: \`compliance_spine_backfilled\`,
  \`leads_promoted_to_contacts\` (×3),
  \`contact_compliance_approval_completed\`,
  \`stage_to_queue_eligibility_approved\`,
  \`queue_created_from_staged_contacts\`,
  \`sent_folder_copy_failed\` (×3).

---

## SECTION 0a — CREDENTIALS & SECRETS REGISTER

> **Raw passwords and API keys are not stored in this manual.**
> See the secure password manager / Lovable secrets / encrypted
> server-side storage for the actual values. This register only records
> *what exists, where it lives, who owns it, and how to recover it.*

### A. Liftor / Lovable

| Field | Value |
|-------|-------|
| System | Liftor AI |
| Manual paths | \`/founder/manual\`, \`/founder/manual/full\` |
| Purpose | Central portfolio CRM / outreach / AI operations engine |
| Login email | mandyking308@gmail.com (founder/admin) |
| Secret name(s) | \`INBOX_CREDENTIALS_KEY\`, \`APOLLO_ENCRYPTION_KEY\` |
| Storage | Lovable secure secrets / encrypted server-side storage |
| Owner | Mandy King |
| Status | active |
| Last 4 | n/a (managed secrets) |
| Recovery | Lovable account password reset → re-issue secret via Lovable secrets UI |
| Notes | Raw values must NEVER appear in code, logs, or this manual. |

### B. NeonCandy Sender — hello@neoncandy.online

| Field | Value |
|-------|-------|
| System | IONOS hosted mailbox |
| Email | hello@neoncandy.online |
| Purpose | Only valid live NeonCandy outbound send + reply inbox |
| SMTP host / port / security | smtp.ionos.co.uk / 587 / TLS (STARTTLS) |
| SMTP username | hello@neoncandy.online |
| IMAP host / port / SSL | imap.ionos.co.uk / 993 / SSL enabled |
| IMAP username | hello@neoncandy.online |
| Monitored folder | INBOX |
| Storage of password | Encrypted in Liftor \`inbox_credentials\` (encrypted with \`INBOX_CREDENTIALS_KEY\`) + Mandy's password manager |
| Owner | Mandy King |
| Status | active / live_ready |
| Last 4 | not displayed |
| Recovery | IONOS control panel → mailbox password reset → update encrypted credential in Liftor |
| Notes | Daily send cap currently 10 (IONOS new-mailbox warm-up limit). |

### C. Disabled NeonCandy Sender — music@neoncandy.net

| Field | Value |
|-------|-------|
| System | Legacy mailbox |
| Email | music@neoncandy.net |
| Purpose | Old / test / simulated path only |
| Storage of password | Historical only (do not surface) |
| Owner | Mandy King |
| Status | **disabled / historical** |
| Last 4 | not displayed |
| Recovery | n/a — do not restore for operational use |
| Notes | Forbidden for sending, fallback, campaign, staging, queue creation, inbound routing, AI replies, or business default sender. Sanity reason code: \`NEONCANDY_INVALID_INBOX\`. |

### D. Apollo

| Field | Value |
|-------|-------|
| System | Apollo.io |
| Login | Mandy's Apollo account |
| Plan | Basic monthly · 1 seat · 2,500 credits/month |
| API key name | \`Liftor - NeonCandy\` |
| Key type | Master API key |
| Used for | People API Search, Person Enrichment, Bulk Person Enrichment |
| Endpoints | \`/api/v1/mixed_people/api_search\`, \`/api/v1/people/bulk_match\`, \`/api/v1/people/match\`, \`/api/v1/people/show\` |
| Storage of API key | Encrypted in Liftor Apollo connection settings (encrypted with \`APOLLO_ENCRYPTION_KEY\`) |
| Owner | Mandy King |
| Status | active |
| Last 4 | not displayed |
| Recovery | Apollo dashboard → Settings → API → revoke + regenerate → re-paste into Liftor connection (will be re-encrypted) |
| Notes | People Search does not return emails — enrichment is required for deliverable addresses. |

### E. IONOS Account

| Field | Value |
|-------|-------|
| System | IONOS hosting / mail |
| Domain | neoncandy.online |
| Email | hello@neoncandy.online |
| Purpose | Real SMTP / IMAP for NeonCandy outreach |
| Storage | IONOS account credentials in Mandy's password manager; mailbox SMTP/IMAP password encrypted in Liftor |
| Owner | Mandy King |
| Status | active |
| Last 4 | not displayed |
| Recovery | IONOS account recovery → reset mailbox password → update encrypted credential in Liftor |
| Notes | Provider enforces a 24h rolling new-mailbox sending cap; can be raised via IONOS support after warm-up. |

### F. Social / Music Account Access Map

> Login routes only — no raw passwords. All passwords live in Mandy's
> password manager.

| Account | Login route | Owner | Status |
|---------|-------------|-------|--------|
| Neural Frames | Google login | Mandy | active |
| MusicHero | Username + Google login | Mandy | active |
| Facebook (NeonCandy page) | Meta / mobile-number route | Mandy | active |
| Instagram \`@neoncandyofficial\` | Linked through Meta route | Mandy | active |
| YouTube \`@neoncandyofficial\` | Google / new music-related email | Mandy | active |
| Metricool | NeonCandy / music-related email | Mandy | active |
| ManyChat | Meta / Google route — connected to Instagram + Facebook | Mandy | active |
| DistroKid | Mandy's personal Gmail login | Mandy | active |
| Lorca | Mandy's Gmail login | Mandy | active |

### G. PPL / PRS / Distribution Paperwork

- Track paperwork status separately from this manual.
- Confirm which PPL / PRS / distribution registrations are complete.
- Do **not** assume all registrations are done.
- When confirmed, add a row per registration here with: registry name,
  artist/track ID, date submitted, date confirmed, owner.

---

## SECTION 1 — PLATFORM OVERVIEW

Liftor AI is an AI infrastructure platform capable of building, deploying, running, and optimising AI systems for multiple organisations simultaneously.

### Purpose

The platform acts as an **AI operating system for organisations**, providing end-to-end lifecycle management from proposal generation through to live system monitoring, optimisation, and strategic intelligence.

### Platform Capabilities

- **Design & Build** — AI-powered proposal generation, system architecture design, template-based rapid deployment
- **Deploy & Launch** — Staged deployment pipelines with checklists, monitoring, and rollback capability
- **Run & Monitor** — Real-time system monitoring, AI agent management, workflow execution tracking
- **Optimise & Evolve** — AI Brain intelligence layer providing automated insights, decisions, and strategic recommendations
- **Scale & Expand** — Template library for venture creation, multi-organisation management, platform expansion system

### Platform Supports

- Internal companies and operations
- External client organisations
- Automation workflows across industries
- AI agents for task execution
- AI decision systems for strategic intelligence
- Venture creation using reusable templates

### Live Platform Statistics

| Metric | Count |
|--------|-------|
| Organisations | ${data.orgCount} |
| Monitored Systems | ${data.systemCount} |
| AI Agents | ${data.agentCount} |
| Automation Workflows | ${data.workflowCount} |
| Integrations | ${data.integrationCount} |
| Deployments | ${data.deploymentCount} |
| System Templates | ${data.templateCount} |
| Knowledge Entries | ${data.knowledgeCount} |
| Architectures | ${data.architectureCount} |
| Launched Platforms | ${data.launchedPlatformCount} |
| Brain Insights | ${data.brainInsightCount} |
| Decision Recommendations | ${data.decisionCount} |
| Build Log Entries | ${data.buildLogCount} |
| Test Runs Completed | ${data.testRunCount} |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI Framework | Tailwind CSS + shadcn/ui |
| State Management | @tanstack/react-query |
| Routing | react-router-dom v6 |
| Animations | framer-motion |
| Charts | recharts |
| Backend | Lovable Cloud (Supabase PostgreSQL) |
| Edge Functions | Deno serverless runtime |
| AI Gateway | Lovable AI (google/gemini-3-flash-preview) |
| Auth | Supabase Auth (email/password) |
| Storage | 5 private Supabase Storage buckets |

---

## SECTION 2 — FULL PLATFORM ARCHITECTURE

The Liftor AI platform is structured across six architectural layers, each serving a distinct operational role.

### Layer 1 — Public Platform

The public-facing marketing and acquisition layer. No authentication required.

| Module | Route | Purpose |
|--------|-------|---------|
| Homepage | \`/\` | Brand positioning, value proposition, CTA |
| What We Build | \`/what-we-build\` | Service catalogue and capability overview |
| Industries | \`/industries\` | Industry-specific AI solution positioning |
| Method | \`/method\` | Engineering methodology and delivery process |
| Case Studies | \`/case-studies\` | Client success stories and project outcomes |
| Partner Program | \`/partners\` | Partner recruitment and referral programme |
| Project Discovery | \`/project-discovery\` | Client onboarding and requirements gathering |
| About | \`/about\` | Company information and team |
| AI Proposal Generator | \`/ai-proposal\` | AI-powered proposal generation using Gemini |

**Layout:** Navbar + Footer wrapper. SEO-optimised with semantic HTML, meta tags, and structured content.

### Layer 2 — Platform Infrastructure

The backend infrastructure powering all platform operations.

- **PostgreSQL Database** — 50+ tables with Row-Level Security on every table
- **Authentication** — Supabase Auth with email/password, email verification required
- **Edge Functions** — 3 Deno serverless functions (generate-proposal, founder-copilot, platform-testing)
- **Storage** — 5 private buckets (project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents)
- **Role System** — app_role enum (admin, moderator, user, founder, partner) with security-definer function for role checks

### Layer 3 — Enterprise Platform Management

Client-facing systems for managing AI projects and monitoring deployed systems.

**Client Portal** (15 routes, ProtectedRoute guard):
- Dashboard, Projects, Documents, Messages, Support
- Maintenance suite (Dashboard, Schedule, Updates, Feature Requests)
- System Monitoring, Control Panel, System Detail
- Analytics, Optimisation

**Partner Portal** (7 routes, PartnerRoute guard):
- Dashboard, Opportunities, Projects, Documents, Messages

### Layer 4 — Platform Operations Control

Operational management layer for cross-platform coordination.

- **Global Operations** — Aggregated operational intelligence across all systems
- **Organisation Management** — Multi-tenant organisation directory with members, documents, and industry tracking
- **Access Control** — Platform roles, audit logging, anomaly detection
- **Security & Compliance** — Compliance items, compliance documents, security monitoring
- **Template Library** — Reusable system templates for rapid deployment
- **Platform Expansion** — Venture launcher with launch checklists and staged rollout

### Layer 5 — Founder Control Systems

Founder-exclusive command layer with 39 routes (FounderRoute guard).

- **Command Center** — Real-time operational hub
- **Revenue Console** — Financial tracking and analysis
- **Founder Manual** — This self-updating documentation system
- **Platform Testing** — Automated validation suite
- **AI Co-Pilot** — Conversational AI assistant with live platform context

### Layer 6 — AI Brain Layer

Autonomous intelligence layer providing platform-wide insights and strategic recommendations.

- **Brain Core** — Insight generation, learning records, recommendations
- **Decision Engine** — Structured decision support with benefits/risks analysis
- **Strategy Engine** — Strategic intelligence and market signal processing
- **Optimisation Engine** — Performance optimisation across workflows, agents, and systems
- **Brain Orchestrator** — Signal flow coordination (Observation → Learning → Optimisation → Decision → Strategy)
- **Founder AI Co-Pilot** — Conversational interface to all brain intelligence

---

## SECTION 3 — PLATFORM INFRASTRUCTURE MODULES

### Proposal Generator
**Route:** \`/ai-proposal\` (public)
**Edge Function:** \`generate-proposal\`
**Purpose:** AI-powered project proposal generation for prospective clients. Uses google/gemini-3-flash-preview with structured tool calling to output suggested_solution, estimated_scope, and estimated_timeline based on client requirements (industry, project types, business problem, processes to automate, scale, timeline).

### Client Portal
**Routes:** 15 protected routes under \`/portal/*\`
**Guard:** ProtectedRoute (any authenticated user)
**Purpose:** Client-facing project management interface. Clients view their own projects, documents, messages, support tickets, and maintenance schedules. System monitoring shows real-time status of deployed AI systems. Analytics and optimisation dashboards provide performance insights. All data scoped via RLS to client's profile.

### Founder Console
**Routes:** 39 protected routes under \`/founder/*\`
**Guard:** FounderRoute (checks user_roles for 'founder')
**Purpose:** Central command interface for the platform founder/CEO. Provides unrestricted visibility across all organisations, systems, agents, workflows, deployments, revenue, and strategic intelligence. FounderLayout provides consistent sidebar navigation.

### Partner Portal
**Routes:** 7 protected routes under \`/partner/*\`
**Guard:** PartnerRoute (checks user_roles for 'partner')
**Purpose:** Partner management interface for referral and agency partners. Partners submit opportunities, track project conversions, manage documents, and communicate via messaging. Partner deals track commission and project value.

### Subscription Maintenance System
**Routes:** \`/portal/maintenance/*\` (4 sub-routes)
**Tables:** maintenance_events, feature_requests, subscriptions
**Purpose:** Client-facing maintenance management. Clients view scheduled maintenance, updates, and submit feature requests linked to their subscriptions. Founders manage all maintenance events and feature request statuses.

### Monitoring Dashboard
**Routes:** \`/founder/monitoring\`, \`/founder/monitoring/:id\`, \`/portal/monitoring\`
**Tables:** monitored_systems
**Purpose:** Real-time monitoring of all deployed client systems. Shows system status (operational/degraded/offline), links to client profiles and organisations. Client-side view is scoped to their own systems.

### Workflow Builder
**Routes:** \`/founder/workflows\`, \`/founder/workflows/:id\`
**Tables:** automation_workflows, workflow_steps
**Purpose:** Manage automation workflows with step definitions, execution tracking, success/failure counts, and automation type classification. Workflows are linked to monitored systems and can trigger AI agent assignments.

### AI Agent Management
**Routes:** \`/founder/agents\`, \`/founder/agents/:id\`
**Tables:** ai_agents, agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts
**Purpose:** Registry and management of all AI agents deployed across client systems. Tracks agent function, status, task completion metrics, system assignments, activity logs, and alerts.

### Automation Execution Engine
**Routes:** \`/founder/executions\`, \`/founder/executions/:id\`
**Tables:** workflow_executions, execution_steps, execution_logs
**Purpose:** Execution lifecycle management for automation workflows. Tracks execution status, individual step progress, agent assignments per step, results, errors, and timing. Provides detailed audit trail via execution logs.

---

## SECTION 4 — ENTERPRISE PLATFORM MANAGEMENT

### Enterprise Process Automation Designer
**Route:** \`/founder/processes\`, \`/founder/processes/:id\`
**Purpose:** Business process design and documentation system. Maps organisational processes to automation opportunities, enabling structured automation planning before workflow creation.

### AI System Architecture Designer
**Routes:** \`/founder/architectures\`, \`/founder/architectures/:id\`
**Tables:** architectures, architecture_components, architecture_relationships
**Purpose:** Visual system architecture design tool. Create system architectures with typed components (custom, workflow, agent, integration), define relationships between components, and link architectures to deployments. Supports multiple system types (platform, automation, analytics).

### Deployment & Launch Manager
**Routes:** \`/founder/deployments\`, \`/founder/deployments/:id\`
**Tables:** deployments, deployment_stages, deployment_checklist, deployment_logs
**Purpose:** Staged deployment pipeline management. Each deployment progresses through ordered stages with completion tracking. Deployment checklists ensure all requirements are met before launch. Deployment logs provide audit trail. Links to architectures for system design traceability.

### Client System Control Panel
**Routes:** \`/portal/systems\`, \`/portal/systems/:id\`
**Purpose:** Client-facing system management interface. Clients view and interact with their deployed AI systems, monitor status, and access system-specific controls. Scoped to client's own systems via RLS.

### Analytics & Performance Dashboard
**Routes:** \`/founder/analytics\`, \`/portal/analytics\`
**Purpose:** Platform-wide and client-specific analytics. Aggregates workflow execution performance, agent task completion metrics, system health indicators, and automation efficiency data. Founder view shows global analytics; client view shows their own system metrics.

### Automation Optimisation Engine
**Route:** \`/founder/optimisation\`, \`/portal/optimisation\`
**Table:** optimisation_insights
**Purpose:** Generates and tracks performance optimisation recommendations at the entity level (workflow, agent, system). Each insight includes type (performance/efficiency/reliability), priority, recommended action, and status tracking. Feeds into the AI Brain for strategic decision support.

### Knowledge Base & System Memory
**Routes:** \`/founder/knowledge\`, \`/founder/knowledge/:id\`
**Tables:** knowledge_entries, knowledge_documents
**Purpose:** Platform knowledge management system. Stores operational knowledge, system documentation, procedures, and references. Entries can be linked to specific agents and workflows via linked_agent_ids and linked_workflow_ids arrays. Supports document attachments via knowledge-documents storage bucket.

### Lifecycle Management

Enterprise AI systems follow a managed lifecycle through the platform:

1. **Discovery** — Client requirements captured via Project Discovery or Partner opportunities
2. **Proposal** — AI-generated proposals via generate-proposal edge function
3. **Architecture** — System architecture designed in Architecture Designer
4. **Build** — Workflows, agents, and integrations created and configured
5. **Test** — Platform Testing Suite validates system components
6. **Deploy** — Staged deployment via Deployment Manager with checklists
7. **Monitor** — Real-time monitoring via Monitoring Dashboard
8. **Optimise** — Continuous optimisation via Optimisation Engine and AI Brain
9. **Maintain** — Ongoing maintenance via Subscription Maintenance System

---

## SECTION 5 — PLATFORM OPERATIONS CONTROL

### Global AI Operations Manager
**Route:** \`/founder/operations\`
**Purpose:** High-level operations dashboard aggregating cross-system operational data. Provides unified view of all active systems, organisations, and deployments. Enables founder to identify operational patterns, bottlenecks, and scaling opportunities across the entire platform.

### Multi-Organisation Management
**Routes:** \`/founder/organisations\`, \`/founder/organisations/:id\`
**Tables:** organisations, organisation_members, organisation_documents
**Purpose:** Multi-tenant organisation management. Each organisation has industry classification, status tracking, member management with roles (admin/editor/viewer), and document storage. Organisations link to monitored systems, enabling per-organisation system views. Currently managing ${data.orgCount} organisations.

**Multi-Organisation Support:**
- Each organisation operates in an isolated data environment via RLS
- Organisation members can only view their own organisation's data
- Founders have cross-organisation visibility
- Documents stored in private organisation-documents bucket
- Systems, agents, and workflows are scoped to organisations via monitored_systems.organisation_id

### Role & Access Control System
**Route:** \`/founder/access-control\`
**Tables:** platform_roles, access_audit_log, access_anomalies, user_roles
**Purpose:** Platform-wide role management and access auditing. Defines platform roles with access levels, logs all access events for audit compliance, and detects access anomalies with severity classification and flagging.

**Role Architecture:**
- \`app_role\` enum: admin, moderator, user, founder, partner
- \`user_roles\` table: Maps users to roles (many-to-many)
- \`has_role()\` function: Security-definer function preventing recursive RLS checks
- \`platform_roles\` table: Defines custom platform roles with descriptions and access levels

### Security & Compliance Manager
**Route:** \`/founder/security\`
**Tables:** compliance_items, compliance_documents
**Purpose:** Security posture management and compliance tracking. Compliance items track regulatory requirements with review schedules. Compliance documents stored in private compliance-documents bucket. Integrates with access anomaly detection.

### System Template Library
**Routes:** \`/founder/templates\`, \`/founder/templates/:id\`
**Table:** system_templates
**Purpose:** Reusable system templates enabling rapid deployment of standardised AI systems. Templates define system configurations that can be instantiated for new organisations. Currently managing ${data.templateCount} templates. Template types support various AI system patterns.

### Platform Expansion / Venture Launcher
**Routes:** \`/founder/expansion\`, \`/founder/expansion/:id\`
**Tables:** launched_platforms, launch_checklist
**Purpose:** Platform scaling and venture creation system. Enables launching new platform instances for organisations using templates. Each launch follows a checklist workflow ensuring all requirements are met. Tracks industry targeting, organisation assignment, and launch status. Currently ${data.launchedPlatformCount} platforms launched.

---

## SECTION 6 — FOUNDER CONTROL SYSTEMS

### Founder Console
**Route:** \`/founder\` (39 sub-routes)
**Component:** FounderLayout (sidebar) + FounderRoute (guard)
**Purpose:** Central management interface providing the founder/CEO with unrestricted visibility and control over every aspect of the platform.

**Founder Visibility Across:**

| Domain | Dashboard | Key Metrics |
|--------|-----------|-------------|
| Architecture | Architecture Designer | System designs, component relationships |
| Operations | Global Operations, Command Center | System status, workflow execution, agent performance |
| Revenue | Revenue Console | Revenue streams, source attribution, currency tracking |
| Ventures | Platform Expansion | Launched platforms, template usage, industry coverage |
| Platform Scale | Analytics, Monitoring | ${data.systemCount} systems, ${data.agentCount} agents, ${data.workflowCount} workflows |
| Intelligence | AI Brain, Decisions, Strategy | ${data.brainInsightCount} insights, ${data.decisionCount} decisions |
| Quality | Platform Testing | ${data.testRunCount} test runs completed |

### Founder Revenue Console
**Route:** \`/founder/revenue\`
**Table:** revenue_records
**Purpose:** Financial dashboard tracking revenue with source attribution (source_name, source_type), client organisation linking, multi-currency support (GBP primary), and period-based analysis. Provides revenue trend visualisation and source breakdown.

### Founder Manual (This Document)
**Route:** \`/founder/manual\`
**Purpose:** Self-updating engineering-level platform documentation. Automatically regenerates from live platform data. Supports Markdown and PDF export. Contains 15 sections covering complete platform architecture, build history, and operational documentation.

### Platform Testing Dashboard
**Route:** \`/founder/testing\`
**Tables:** platform_test_runs, platform_test_results
**Edge Function:** platform-testing
**Purpose:** Automated platform validation suite. Triggers 20+ tests across all modules, displays results grouped by module, maintains test run history. Validates data integrity, CRUD operations, and cross-module references.

---

## SECTION 7 — AI BRAIN ARCHITECTURE

The AI Brain is a multi-layer autonomous intelligence system that processes platform signals and generates actionable insights for the founder.

### AI Brain Core
**Route:** \`/founder/brain\`
**Tables:** brain_insights, brain_recommendations, brain_learning_records

**Insight Types:** performance, anomaly, opportunity, risk
**Priority Levels:** critical, high, medium, low
**Learning Categories:** automation, performance, operational

The Brain Core processes platform signals through a structured pipeline:
1. **Observation** — Raw data collection from platform systems
2. **Pattern Detection** — Identifying trends and anomalies in operational data
3. **Learning** — Recording patterns with confidence levels and source attribution
4. **Insight Generation** — Creating actionable insights with priority classification
5. **Recommendation Output** — Producing specific recommendations with affected system context

Currently tracking ${data.brainInsightCount} brain insights.

### Automation Optimisation Engine
**Route:** \`/founder/optimisation\`
**Table:** optimisation_insights

Generates performance optimisation recommendations at the entity level:
- **Entity Types:** workflow, agent, system
- **Insight Types:** performance, efficiency, reliability
- **Actions:** Each insight includes a recommended_action field with specific improvement steps
- **System Linking:** Insights can be linked to specific monitored_systems via system_id

### AI Decision Engine
**Route:** \`/founder/decisions\`
**Table:** decision_recommendations

Structured decision support system:
- **Categories:** operational, strategic, expansion
- **Status Flow:** pending → approved/rejected → implemented
- **Analysis Fields:** potential_benefits, potential_risks, target_module
- **Decision Tracking:** decision_maker, decided_at timestamp

Currently tracking ${data.decisionCount} decision recommendations.

### AI Strategy Engine
**Route:** \`/founder/strategy\`
**Table:** strategy_insights

Strategic intelligence and market signal processing:
- **Categories:** market_signal, competitive, expansion, operational
- **Confidence Levels:** high, medium, low
- **Industry Targeting:** target_industry field for market-specific insights
- **Status Tracking:** pending, active, implemented, archived

### AI Brain Orchestrator

Coordinates signal flow across all brain components:

\`\`\`
Platform Data → Observation → Learning Records → Optimisation Insights
                                                  ↓
                                    Decision Recommendations
                                                  ↓
                                      Strategy Insights
\`\`\`

Each stage processes and enriches signals before passing to the next layer. The orchestrator ensures that operational data flows upward into strategic intelligence.

### AI Brain Data Sources

| Source | Data Type | Brain Component |
|--------|-----------|-----------------|
| Automation Engine | Workflow success/failure rates, execution counts | Optimisation Engine |
| Analytics System | Performance metrics, trend data | Brain Core |
| Revenue Console | Revenue streams, growth patterns | Strategy Engine |
| Operations Manager | System health, operational status | Brain Core |
| Template Library | Template usage, deployment patterns | Strategy Engine |
| Knowledge Base | Operational knowledge, procedures | Brain Core |
| Agent System | Task completion, workload patterns | Optimisation Engine |
| Monitoring Dashboard | System status, health indicators | Brain Core |
| Deployment Manager | Deployment success, stage completion | Decision Engine |

### Founder AI Co-Pilot
**Route:** \`/founder/copilot\`
**Edge Function:** founder-copilot

Conversational AI interface backed by google/gemini-3-flash-preview with streaming responses. The system prompt is dynamically constructed by injecting real-time data from 9 platform tables:

1. automation_workflows (name, status, success/failure counts)
2. ai_agents (name, status, task metrics)
3. monitored_systems (system_name, status)
4. organisations (name, industry, status)
5. brain_insights (title, description, priority)
6. decision_recommendations (title, priority, status)
7. strategy_insights (title, category, confidence)
8. revenue_records (source, value, organisation)
9. system_templates (name, type, usage count)

---

## SECTION 8 — PLATFORM TESTING & VALIDATION SUITE

### Database Tables

**platform_test_runs**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| run_name | text | Test run identifier |
| status | text | passed / failed |
| total_tests | integer | Total tests executed |
| passed | integer | Tests passed |
| failed | integer | Tests failed |
| warnings | integer | Tests with warnings |
| duration_ms | integer | Total execution time |
| triggered_by | text | Who initiated the run |
| completed_at | timestamptz | Completion timestamp |
| created_at | timestamptz | Creation timestamp |

**platform_test_results**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| run_id | uuid | FK to platform_test_runs |
| module | text | Module being tested |
| test_name | text | Specific test name |
| status | text | passed / failed / warning |
| details | text | Test result details |
| duration_ms | integer | Individual test duration |

### Edge Function: platform-testing

The platform-testing edge function executes 20+ automated tests across all platform modules:

**Test Categories:**
1. **Organisation Tests** — Create test orgs, verify CRUD operations
2. **Automation Tests** — Read workflows, verify execution data
3. **AI Agent Tests** — Read agents, verify status and assignments
4. **System Tests** — Read monitored systems, verify status tracking
5. **Brain Tests** — Create/read insights, recommendations, learning records
6. **Decision Tests** — Create/read decision recommendations
7. **Strategy Tests** — Create/read strategy insights
8. **Deployment Tests** — Read deployment data and stages
9. **Architecture Tests** — Read architecture components
10. **Template Tests** — Read system templates
11. **Knowledge Tests** — Read knowledge entries
12. **Integration Tests** — Read integrations and status
13. **Build Log Tests** — Create test build log entries
14. **Optimisation Tests** — Read optimisation insights
15. **Security Tests** — Read platform roles, audit logs, compliance items
16. **Data Integrity Tests** — Check workflow-system references, agent-system references for orphans
17. **Manual Tests** — Read manual pages
18. **Execution Tests** — Read workflow executions
19. **Expansion Tests** — Read launched platforms
20. **Compliance Tests** — Read compliance items

**Test Lifecycle:**
1. Edge function receives request
2. Creates temporary test data with [TEST] prefix
3. Runs all validation tests sequentially
4. Records results to platform_test_runs and platform_test_results
5. Cleans up all test data (deletes [TEST] prefixed records)
6. Returns JSON with run_id, total, passed, failed, warnings, duration, and detailed results

### Testing Dashboard
**Route:** \`/founder/testing\`
**Features:**
- Health overview cards (total/passed/failed/warnings)
- "Run Full Validation" button triggering the edge function
- Tabbed results view grouped by module
- Test run history with timestamps and duration
- RLS: Founder-only ALL access on both tables

### Recent Test Runs

${data.recentTestRuns.length > 0 ? data.recentTestRuns.map(r => `- **${r.run_name}** — ${r.status.toUpperCase()} — ${r.passed}/${r.total_tests} passed — ${format(new Date(r.created_at), "MMM d, yyyy HH:mm")}`).join("\n") : "No test runs recorded yet."}

---

## SECTION 9 — DATABASE STRUCTURE

The platform uses 50+ PostgreSQL tables with Row-Level Security (RLS) enabled on every table.

### Core Platform Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| profiles | User profiles (auto-created on signup) | id, user_id, full_name |
| projects | Client projects | id, name, status, client_id |
| subscriptions | Client subscriptions | id, client_id, plan, status |
| user_roles | Role assignments (many-to-many) | user_id, role (app_role enum) |
| activity_log | Platform activity audit trail | event_type, description, entity_type, entity_id |

### Client System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| monitored_systems | Deployed client systems | system_name, status, client_id, project_id, organisation_id |
| automation_workflows | Automation workflow definitions | name, status, automation_type, execution_count, success_count, failure_count, system_id |
| ai_agents | AI agent registry | name, agent_function, status, tasks_completed_total, tasks_pending, system_id |
| agent_system_assignments | Agent-to-system mappings | agent_id, system_id |
| agent_task_stats | Daily agent task metrics | agent_id, date, tasks_completed, tasks_failed, tasks_pending |
| agent_activity_logs | Agent activity audit trail | agent_id, action, details, system_name |
| agent_alerts | Agent alerts and warnings | agent_id, title, severity, affected_system, resolved |

### Workflow Execution Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| workflow_executions | Execution run records | workflow_id, system_id, status, started_at, completed_at |
| workflow_steps | Step definitions within workflows | workflow_id, step_name, order_index, agent_id |
| execution_steps | Per-execution step tracking | execution_id, step_name, status, result, error_message, agent_id |
| execution_logs | Detailed execution event logs | execution_id, event, step_name, details, result |

### AI Brain Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| brain_insights | AI-generated platform insights | title, insight_type, priority, source_module, system_affected, status |
| brain_recommendations | Brain-generated recommendations | title, priority, affected_system, status |
| brain_learning_records | Pattern learning records | pattern_description, category, confidence_level, source_system |

### Decision & Strategy Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| decision_recommendations | Structured decision support | title, category, priority, status, potential_benefits, potential_risks, target_module, decision_maker |
| strategy_insights | Strategic intelligence | title, category, confidence_level, target_industry, status |

### Architecture & Deployment Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| architectures | System architecture definitions | name, system_type, client_organisation, system_purpose, status |
| architecture_components | Components within architectures | name, component_type, architecture_id, agent_id, workflow_id, integration_id |
| architecture_relationships | Component relationships | source_component_id, target_component_id, relationship_label |
| deployments | Deployment records | system_name, client_organisation, status, architecture_id, expected_launch_date |
| deployment_stages | Staged deployment phases | deployment_id, name, status, order_index |
| deployment_checklist | Pre-launch requirements | deployment_id, item, completed, order_index |
| deployment_logs | Deployment event audit | deployment_id, event, details |

### Integration Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| integrations | External service integrations | name, service_type, auth_method, endpoint_url, status |
| integration_activity_logs | Integration event logs | integration_id, event_type, details |
| integration_alerts | Integration alerts | integration_id, title, severity, resolved |
| integration_linked_systems | Integration-to-entity mappings | integration_id, entity_type, entity_id, entity_name |

### Knowledge & Documentation Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| knowledge_entries | Knowledge base content | title, entry_type, category, content, linked_agent_ids, linked_workflow_ids |
| knowledge_documents | Knowledge attachments | knowledge_entry_id, name, file_path, file_size |
| manual_pages | Manual page definitions | module_name, section, purpose, core_functions, version, order_index |
| manual_versions | Manual version history | version_number, summary |

### Organisation Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| organisations | Client organisations | name, industry, status, primary_contact |
| organisation_members | Organisation membership | organisation_id, user_id, role, status |
| organisation_documents | Organisation documents | organisation_id, name, file_path, category |

### Expansion Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| launched_platforms | Launched platform instances | name, organisation_name, industry, template_id, status |
| launch_checklist | Launch requirements | platform_id, item, completed, order_index |
| system_templates | Reusable system templates | name, template_type, usage_count |

### Security & Compliance Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| platform_roles | Platform role definitions | name, access_level, description |
| access_audit_log | Access event audit trail | user_id, action, details, ip_address |
| access_anomalies | Detected access anomalies | anomaly_type, severity, user_id, flagged |
| compliance_items | Compliance requirements | area, status, last_review_date, next_review_date |
| compliance_documents | Compliance documentation | name, category, file_path |

### Partner Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| partner_applications | Partner programme applications | company_name, partner_type, status, user_id |
| partner_opportunities | Partner-submitted opportunities | company_name, industry, project_description, partner_id, status |
| partner_deals | Partner deal tracking | project_name, project_value, partner_commission, deal_status |
| partner_documents | Opportunity documents | opportunity_id, name, file_path |
| partner_messages | Opportunity messaging | opportunity_id, user_id, content |

### Build & Testing Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| build_log_entries | Engineering build log (append-only) | title, change_type, module_affected, author, description |
| platform_test_runs | Test run metadata | run_name, status, total_tests, passed, failed, warnings |
| platform_test_results | Individual test results | run_id, module, test_name, status, details, duration_ms |

### Client Portal Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| feature_requests | Client feature requests | title, description, business_impact, subscription_id, user_id, status |
| maintenance_events | Scheduled maintenance | title, description, scheduled_date, subscription_id, status |

### RLS Policy Architecture

Every table implements Row-Level Security:
- **Founder policies** — \`has_role(auth.uid(), 'founder')\` grants ALL access
- **Client policies** — SELECT scoped to user's profile/subscription/organisation
- **Partner policies** — SELECT scoped to partner's own submissions
- **System policies** — INSERT allowed for trigger-based activity logging
- **Security function** — \`has_role(_user_id, _role)\` is SECURITY DEFINER to prevent recursive RLS

### Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| handle_new_user() | Trigger | Creates profiles row on auth.users insert |
| has_role(_user_id, _role) | Security Definer | Non-recursive role check for RLS policies |
| update_updated_at_column() | Trigger | Auto-updates updated_at timestamps |
| log_new_proposal() | Trigger | Logs proposals to activity_log |
| log_new_support_request() | Trigger | Logs support requests to activity_log |
| log_new_opportunity() | Trigger | Logs partner opportunities to activity_log |

### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| project-documents | Private | Client project files |
| partner-documents | Private | Partner opportunity documents |
| knowledge-documents | Private | Knowledge base attachments |
| organisation-documents | Private | Organisation files |
| compliance-documents | Private | Compliance documentation |

---

## SECTION 10 — EDGE FUNCTIONS

### generate-proposal
**Path:** \`supabase/functions/generate-proposal/index.ts\`
**Purpose:** AI-powered project proposal generation for prospective clients.
**Model:** google/gemini-3-flash-preview via Lovable AI gateway (ai.gateway.lovable.dev)
**Auth:** LOVABLE_API_KEY
**Method:** POST with tool calling

**Input Schema:**
\`\`\`json
{
  "projectTypes": ["string"],
  "businessProblem": "string",
  "processesToAutomate": ["string"],
  "projectScale": "string",
  "timeline": "string",
  "industry": "string"
}
\`\`\`

**Output Schema (via tool call):**
\`\`\`json
{
  "suggested_solution": "string",
  "estimated_scope": "string",
  "estimated_timeline": "string"
}
\`\`\`

**Error Handling:** 429 (rate limiting), 402 (credit exhaustion), 500 (general error)

### founder-copilot
**Path:** \`supabase/functions/founder-copilot/index.ts\`
**Purpose:** Conversational AI assistant with real-time platform context injection.
**Model:** google/gemini-3-flash-preview with streaming
**Auth:** LOVABLE_API_KEY + SUPABASE_SERVICE_ROLE_KEY

**Context Injection:** Fetches live data from 9 tables before each response:
automation_workflows, ai_agents, monitored_systems, organisations, brain_insights, decision_recommendations, strategy_insights, revenue_records, system_templates

**System Prompt:** Dynamically constructed with platform data, guidelines for structured responses, and founder-appropriate communication style.

**Response Format:** Server-Sent Events (SSE) stream for real-time typing effect.

### platform-testing
**Path:** \`supabase/functions/platform-testing/index.ts\`
**Purpose:** Automated platform validation suite with 20+ tests.
**Auth:** SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)

**Execution Flow:**
1. Create test data with [TEST] prefix
2. Run validation tests across all modules
3. Record results to platform_test_runs / platform_test_results
4. Clean up test data
5. Return JSON results

**Test Coverage:** Organisations, Automations, Agents, Systems, Brain, Decisions, Strategy, Deployments, Architectures, Templates, Knowledge, Integrations, Build Log, Optimisation, Security, Data Integrity, Manual, Executions, Expansion, Compliance

---

## SECTION 11 — NAVIGATION & ROUTES

### Public Routes (9 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/\` | Index | Homepage |
| \`/what-we-build\` | WhatWeBuild | Services |
| \`/industries\` | Industries | Industry solutions |
| \`/method\` | Method | Methodology |
| \`/case-studies\` | CaseStudies | Case studies |
| \`/partners\` | PartnerProgram | Partner programme |
| \`/project-discovery\` | ProjectDiscovery | Client onboarding |
| \`/about\` | About | Company info |
| \`/ai-proposal\` | AIProposal | AI proposal generator |

### Auth Routes (4 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/portal/login\` | PortalLogin | Sign in |
| \`/portal/signup\` | PortalSignup | Create account |
| \`/portal/forgot-password\` | ForgotPassword | Password reset request |
| \`/portal/reset-password\` | ResetPassword | Password reset |

### Client Portal Routes (15 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/portal/dashboard\` | Dashboard | Client overview |
| \`/portal/projects\` | Projects | Project list |
| \`/portal/projects/:id\` | ProjectDetail | Project detail |
| \`/portal/documents\` | Documents | Document management |
| \`/portal/messages\` | Messages | Messaging |
| \`/portal/support\` | Support | Support tickets |
| \`/portal/maintenance\` | MaintenanceDashboard | Maintenance overview |
| \`/portal/maintenance/schedule\` | MaintenanceSchedule | Maintenance calendar |
| \`/portal/maintenance/updates\` | MaintenanceUpdates | Update history |
| \`/portal/maintenance/features\` | FeatureRequests | Feature requests |
| \`/portal/monitoring\` | ClientSystemMonitoring | System monitoring |
| \`/portal/systems\` | ClientControlPanel | System control |
| \`/portal/systems/:id\` | ClientSystemDetail | System detail |
| \`/portal/analytics\` | ClientAnalytics | Analytics |
| \`/portal/optimisation\` | ClientOptimisation | Optimisation |

### Founder Console Routes (39 routes)

| Route | Page | Category |
|-------|------|----------|
| \`/founder\` | FounderOverview | Overview |
| \`/founder/command-centre\` | CommandCentre | Operations (canonical founder cockpit; \`/founder/command-center\` redirects here, legacy view at \`/founder/command-center/legacy\`) |
| \`/founder/copilot\` | FounderCoPilot | AI Brain |
| \`/founder/brain\` | BrainCore | AI Brain |
| \`/founder/decisions\` | DecisionEngine | AI Brain |
| \`/founder/strategy\` | StrategyEngine | AI Brain |
| \`/founder/operations\` | GlobalOperations | Operations |
| \`/founder/organisations\` | OrganisationDirectory | Management |
| \`/founder/organisations/:id\` | OrganisationProfile | Management |
| \`/founder/revenue\` | FounderRevenue | Finance |
| \`/founder/analytics\` | FounderAnalytics | Intelligence |
| \`/founder/optimisation\` | OptimisationDashboard | Intelligence |
| \`/founder/proposals\` | FounderProposals | Sales |
| \`/founder/proposals/:id\` | ProposalDetail | Sales |
| \`/founder/pipeline\` | LeadPipeline | Sales |
| \`/founder/projects\` | FounderProjects | Delivery |
| \`/founder/projects/:id\` | FounderProjectDetail | Delivery |
| \`/founder/monitoring\` | MonitoringDashboard | Systems |
| \`/founder/monitoring/:id\` | MonitoringSystemDetail | Systems |
| \`/founder/agents\` | AgentDirectory | AI Systems |
| \`/founder/agents/:id\` | AgentProfile | AI Systems |
| \`/founder/workflows\` | WorkflowDirectory | Automation |
| \`/founder/workflows/:id\` | WorkflowDetail | Automation |
| \`/founder/executions\` | ExecutionDashboard | Automation |
| \`/founder/executions/:id\` | ExecutionDetail | Automation |
| \`/founder/processes\` | ProcessDirectory | Automation |
| \`/founder/processes/:id\` | ProcessDetail | Automation |
| \`/founder/architectures\` | ArchitectureDirectory | Engineering |
| \`/founder/architectures/:id\` | ArchitectureDetail | Engineering |
| \`/founder/deployments\` | DeploymentDirectory | Engineering |
| \`/founder/deployments/:id\` | DeploymentDetail | Engineering |
| \`/founder/integrations\` | IntegrationDirectory | Engineering |
| \`/founder/integrations/:id\` | IntegrationDetail | Engineering |
| \`/founder/activity\` | FounderActivity | Audit |
| \`/founder/knowledge\` | KnowledgeDirectory | Knowledge |
| \`/founder/knowledge/:id\` | KnowledgeDetail | Knowledge |
| \`/founder/access-control\` | AccessControl | Security |
| \`/founder/security\` | SecurityDashboard | Security |
| \`/founder/templates\` | TemplateDirectory | Templates |
| \`/founder/templates/:id\` | TemplateDetail | Templates |
| \`/founder/expansion\` | PlatformExpansion | Growth |
| \`/founder/expansion/:id\` | PlatformLaunchDetail | Growth |
| \`/founder/manual\` | FounderManual | Documentation |
| \`/founder/manual/:id\` | ManualPageDetail | Documentation |
| \`/founder/build-log\` | BuildLog | Documentation |
| \`/founder/documents\` | FounderDocuments | Documentation |
| \`/founder/testing\` | PlatformTesting | Quality |

### Partner Portal Routes (7 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/partner\` | PartnerDashboard | Partner overview |
| \`/partner/opportunities\` | PartnerOpportunities | Opportunity management |
| \`/partner/opportunities/:id\` | PartnerOpportunityDetail | Opportunity detail |
| \`/partner/projects\` | PartnerProjects | Project tracking |
| \`/partner/projects/:id\` | PartnerProjectDetail | Project detail |
| \`/partner/documents\` | PartnerDocuments | Document management |
| \`/partner/messages\` | PartnerMessages | Messaging |

---

## SECTION 12 — DEPLOYMENT ARCHITECTURE

### Frontend Application

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 18 + Vite | SPA with hot module replacement |
| Language | TypeScript | Type safety across all components |
| Styling | Tailwind CSS | Utility-first CSS with HSL semantic tokens |
| Components | shadcn/ui | Accessible, customisable component library |
| State | @tanstack/react-query | Server state management with caching |
| Routing | react-router-dom v6 | Client-side routing with nested layouts |
| Animations | framer-motion | Declarative motion components |
| Charts | recharts | Data visualisation for dashboards |
| Hosting | Lovable hosting | Automatic deployment on code changes |

### Backend Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | PostgreSQL (Lovable Cloud) | 50+ tables with full RLS |
| Auth | Supabase Auth | Email/password with verification |
| Edge Functions | Deno runtime | 3 serverless functions (auto-deployed) |
| Storage | Supabase Storage | 5 private buckets for documents |
| AI Gateway | Lovable AI (ai.gateway.lovable.dev) | Access to Gemini models without API keys |

### Component Interaction

\`\`\`
[Browser] → [React SPA] → [Supabase Client SDK] → [PostgreSQL + RLS]
                ↓
         [Edge Functions] → [Lovable AI Gateway] → [Gemini Models]
                ↓
         [Supabase Storage] → [Private Buckets]
\`\`\`

### Authentication Flow

1. User submits email/password at \`/portal/signup\`
2. Supabase Auth creates user in auth.users
3. \`handle_new_user()\` trigger creates profiles row
4. Email verification sent (no auto-confirm)
5. User verifies email and logs in at \`/portal/login\`
6. AuthContext stores session, provides user state
7. Route guards (ProtectedRoute/FounderRoute/PartnerRoute) check auth + roles
8. RLS policies enforce data access at the database level

### Secrets

| Secret | Purpose |
|--------|---------|
| SUPABASE_SERVICE_ROLE_KEY | Unrestricted DB access in edge functions |
| SUPABASE_DB_URL | Direct database connection |
| SUPABASE_PUBLISHABLE_KEY | Client-side Supabase access |
| LOVABLE_API_KEY | AI gateway authentication |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Anonymous/public Supabase access |

---

## SECTION 13 — PLATFORM BUILD LOG

The Build Log is an append-only engineering record stored in the \`build_log_entries\` table. RLS allows founder INSERT and SELECT only — no UPDATE or DELETE — ensuring immutability.

### Full Platform Build History

The following is the complete chronological build sequence of the Liftor AI platform:

**Phase 1 — Foundation**
1. React + Vite + TypeScript project scaffolded
2. Tailwind CSS + shadcn/ui design system configured
3. Dark-themed UI with HSL-based semantic tokens in index.css
4. Component library initialised (40+ shadcn components)

**Phase 2 — Public Website**
5. 9 public marketing pages created (Index, WhatWeBuild, Industries, Method, CaseStudies, PartnerProgram, ProjectDiscovery, About, AIProposal)
6. Navbar + Footer layout components
7. SEO optimisation with meta tags and semantic HTML
8. Responsive design across all breakpoints

**Phase 3 — Authentication System**
9. Supabase Auth configured with email/password
10. Login, Signup, Forgot Password, Reset Password pages
11. AuthContext provider for session management
12. ProtectedRoute component for client portal access
13. profiles table created with handle_new_user trigger

**Phase 4 — Client Portal**
14. PortalLayout component created
15. 15 client portal routes implemented
16. Dashboard, Projects, ProjectDetail, Documents, Messages, Support pages
17. Maintenance suite (Dashboard, Schedule, Updates, Feature Requests)
18. System Monitoring, Control Panel, SystemDetail, Analytics, Optimisation pages

**Phase 5 — Core Database Schema**
19. profiles, projects, subscriptions tables created
20. monitored_systems table with client/project/org references
21. automation_workflows table with execution tracking
22. ai_agents table with system assignments
23. user_roles table with app_role enum (admin, moderator, user, founder, partner)
24. RLS policies applied to all tables
25. has_role() security-definer function created

**Phase 6 — Founder Console Foundation**
26. FounderLayout sidebar with 39 navigation items
27. FounderRoute guard (checks user_roles for 'founder')
28. FounderOverview dashboard page

**Phase 7 — System Monitoring & Agent Management**
29. MonitoringDashboard + MonitoringSystemDetail pages
30. AgentDirectory + AgentProfile pages
31. agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts tables

**Phase 8 — Workflow & Execution Engine**
32. WorkflowDirectory + WorkflowDetail pages
33. ExecutionDashboard + ExecutionDetail pages
34. workflow_executions, workflow_steps, execution_steps, execution_logs tables

**Phase 9 — Integration & Architecture Systems**
35. IntegrationDirectory + IntegrationDetail pages
36. integrations, integration_activity_logs, integration_alerts, integration_linked_systems tables
37. ArchitectureDirectory + ArchitectureDetail pages
38. architectures, architecture_components, architecture_relationships tables

**Phase 10 — Deployment & Organisation Management**
39. DeploymentDirectory + DeploymentDetail pages
40. deployments, deployment_stages, deployment_checklist, deployment_logs tables
41. OrganisationDirectory + OrganisationProfile pages
42. organisations, organisation_members, organisation_documents tables

**Phase 11 — Knowledge, Templates & Expansion**
43. KnowledgeDirectory + KnowledgeDetail pages
44. knowledge_entries, knowledge_documents tables
45. TemplateDirectory + TemplateDetail pages
46. system_templates table
47. PlatformExpansion + PlatformLaunchDetail pages
48. launched_platforms, launch_checklist tables

**Phase 12 — Analytics, Optimisation & Security**
49. FounderAnalytics page
50. OptimisationDashboard page + optimisation_insights table
51. AccessControl + SecurityDashboard pages
52. platform_roles, access_audit_log, access_anomalies tables
53. compliance_items, compliance_documents tables

**Phase 13 — Command Center & Operations**
54. CommandCenter dashboard page
55. GlobalOperations dashboard page
56. ProcessDirectory + ProcessDetail pages

**Phase 14 — AI Proposal Generator**
57. AIProposal public page
58. generate-proposal edge function (Gemini AI with tool calling)

**Phase 15 — Partner Portal**
59. PartnerLayout + PartnerRoute components
60. 7 partner portal routes
61. partner_applications, partner_opportunities, partner_deals tables
62. partner_documents, partner_messages tables

**Phase 16 — AI Brain Layer**
63. BrainCore page + brain_insights, brain_recommendations, brain_learning_records tables
64. DecisionEngine page + decision_recommendations table
65. StrategyEngine page + strategy_insights table

**Phase 17 — Founder AI Co-Pilot**
66. FounderCoPilot page with chat interface
67. founder-copilot edge function (streaming Gemini AI with 9-table context injection)

**Phase 18 — Revenue & Financials**
68. FounderRevenue page + revenue_records table

**Phase 19 — Build Log & Manual v1**
69. BuildLog page + build_log_entries table (append-only with CSV/MD export)
70. FounderManual v1 + ManualPageDetail pages
71. manual_pages, manual_versions tables

**Phase 20 — Platform Testing Suite**
72. PlatformTesting page
73. platform-testing edge function (20+ automated tests)
74. platform_test_runs, platform_test_results tables

**Phase 21 — Founder Manual v4 (Current)**
75. Complete rebuild with 15 engineering-level sections
76. Self-updating architecture pulling live platform data
77. Markdown + PDF export system
78. Full platform build history reconstruction

### Recent Build Log Entries

${data.recentBuildLogs.length > 0 ? data.recentBuildLogs.map(e => `- **${e.title}** — ${e.change_type.replace(/_/g, " ")} — Module: ${e.module_affected || "—"} — ${e.author} — ${format(new Date(e.created_at), "MMM d, yyyy HH:mm")}`).join("\n") : "No build log entries recorded yet. Use the Build Log dashboard at /founder/build-log to add entries."}

---

## SECTION 14 — DOCUMENTATION ENGINE (SELF-UPDATING MANUAL)

### Architecture

The Founder Manual is a self-updating documentation system that automatically regenerates from live platform data on every page load.

### Data Sources

The manual pulls live statistics from the following platform tables:

| Table | Data Extracted | Section Used |
|-------|---------------|--------------|
| organisations | Count | Sections 1, 5 |
| automation_workflows | Count | Sections 1, 6 |
| ai_agents | Count | Sections 1, 6 |
| integrations | Count | Section 1 |
| deployments | Count | Section 1 |
| system_templates | Count | Sections 1, 5 |
| knowledge_entries | Count | Section 1 |
| brain_insights | Count | Sections 1, 7 |
| decision_recommendations | Count | Sections 1, 7 |
| platform_test_runs | Count + recent runs | Section 8 |
| build_log_entries | Count + recent entries | Section 13 |
| manual_pages | Count | Section 1 |
| monitored_systems | Count | Sections 1, 6 |
| architectures | Count | Section 1 |
| launched_platforms | Count | Sections 1, 5 |

### Update Mechanism

1. User navigates to \`/founder/manual\`
2. React Query fetches live counts from all platform tables in parallel
3. ManualLiveData interface aggregates all statistics
4. generateManualMarkdown() function constructs complete documentation using live data
5. UI renders all 15 sections with current statistics
6. Export functions generate Markdown/PDF with real-time data embedded

### No Manual Maintenance Required

Because the documentation is generated from the actual database state, it never becomes stale. Adding new organisations, agents, workflows, or running tests will immediately be reflected in the manual's statistics and recent activity sections.

---

## SECTION 15 — EXPORT SYSTEM

### Markdown Export

The full Founder Manual can be exported as a structured Markdown document (.md file) containing all 15 sections with live platform data embedded at the time of export.

**Usage:** Click "Export Markdown" button on the Founder Manual page.
**Output:** \`liftor-ai-founder-manual-YYYY-MM-DD.md\`
**Content:** Complete engineering documentation with tables, code blocks, and hierarchical headings.

### PDF Export

The manual can be exported as a formatted PDF document using the browser's native print functionality with optimised print styles.

**Usage:** Click "Export PDF" button on the Founder Manual page.
**Output:** Browser print dialog with PDF option.
**Formatting:** Print-optimised styles remove navigation chrome, expand all sections, and format tables for paper output.

### Export Use Cases

| Audience | Format | Purpose |
|----------|--------|---------|
| Engineering Team | Markdown | Technical reference, onboarding, system reconstruction |
| Investors | PDF | Due diligence, technical capability demonstration |
| Operations | PDF | Operational procedures, compliance documentation |
| Partners | PDF | Platform capability overview, integration documentation |
| Audit | PDF | Security review, compliance evidence |

---

*End of Liftor AI Founder Manual v4.2 — NeonCandy Send Proof Achieved (1 May 2026)*
*Self-updating documentation generated from live platform state.*
*${now}*
`;
};
