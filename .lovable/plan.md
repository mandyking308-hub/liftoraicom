## Liftor Kiss of Life — Sequenced Activation Plan

This is a very large, multi-phase activation. To ship it safely without breaking the existing Command Centre, backend, or guardrails, I'll deliver it in **6 sequenced slices**. Each slice is independently shippable, verifiable, and stops short of any bulk send. NeonCandy stays the only live business; no fake data is reintroduced; no schema/routes/functions are deleted.

I will not start Slice 2 until you've confirmed Slice 1 in the UI. I will not run the live proof send (Slice 5) until you personally flip CONTROLLED LIVE.

---

### Slice 1 — Controlled LIVE Activation page + readiness gating (Phase 1 + Phase 8 leftovers)

**Build:**
- New page `/founder/system/modes` (founder-only) showing current mode (TEST / CONTROLLED LIVE), readiness checklist, and a "Switch to CONTROLLED LIVE" button that's disabled until all checks pass.
- Edge function `system-mode-readiness` — runs the 12 checks (active business, active campaign, active inbox, inbox live-ready, sequence exists, pending queue, compliance gates, send caps, reply-stop, approval queue, no demo businesses active, source-of-truth metrics consistent) and returns pass/fail per check with plain-English blockers.
- Edge function `system-mode-set` — founder-role only, writes `system_settings.system_mode`, writes audit row to `system_events`. No auto-flip.
- Command Centre `SystemModeBanner` already reflects mode — wire it to refetch immediately after switch.
- Final truth fixes from Phase 8 that aren't already done: ensure AI drafts shows "approve 2 of 4", Oversight uses combined `system_events + retry_queue`, Demos labelled historical, Social/Voice "Needs Setup", orphan repair shown as completed.

**Verifies:** Founder visits `/founder/system/modes`, sees checks pass for NeonCandy, flips to CONTROLLED LIVE, banner updates everywhere.

---

### Slice 2 — Revenue Workstream tab in Command Centre (Phase 3 + Phase 4)

**Build:**
- New tab inside existing `/founder/command-centre` called **Revenue Workstream** (no new dashboard, just a tab in the existing cockpit).
- Component renders the full pipeline as a horizontal flow: Lead Pool → Contacts → Queued → Sent → Replies → AI Drafts → Approved → Proposals → Demos → Deals → Invoices → Payments → Revenue.
- Each stage card shows: count, conversion % from previous stage, agent owner, current blocker, next action button (links to the right existing page), expected revenue if available.
- **Financial Output panel** below the pipeline: revenue generated (real, from invoices/payments tables), open deals, invoices issued, payments received, blocked revenue movement, single highlighted "Next profit action".
- All counts pulled live from existing tables (`leads`, `contacts`, `email_queue`, `email_send_log`, `ai_drafts`, `proposals`, `demo_access`, `deals`/`opportunities`, `invoices`, `payments`). No new schema.
- Honest empty-state messaging: "No revenue yet — no won deals", "Proposal Agent idle because no qualified lead approved", etc.

**Verifies:** Tab shows the exact NeonCandy numbers from the brief (325 / 25 / 67 / 42 / 80 / 2 / 0 / …) with the gap message surfaced.

---

### Slice 3 — Agent Workstream activation (Phase 2 + Phase 5)

**Build:**
- Refactor existing `AgentOrchestration.tsx` so the 14 agents render in **lifecycle order** with explicit handoff arrows between them (Lead → CRM → Outreach → Email → Inbox → Conversation → Proposal → Demo → Deal → Finance → Supplier → Payment, with Compliance + Oversight as cross-cutting).
- Each agent card gets: job description, current input count, current output count, last action timestamp, next handoff target, and **1–3 executable action buttons**.
- Action buttons that map to existing functions are wired: Outreach "Run pre-send check" → existing `crm-send-check`; Inbox "Poll inbox" → existing `outbound-inbound-poll`; Conversation "Generate drafts" → existing AI draft function; Oversight "Run diagnostics" → existing diagnostics function; Lead Source "Promote selected" → existing promotion function; etc.
- Action buttons that don't have a backend yet are clearly labelled **"Needs wiring"** with a tooltip listing what's missing — never silent no-ops.
- All buttons require founder confirmation before firing; all writes go through existing safety gates.

**Verifies:** Each agent shows real counts and handoffs; clicking a wired button performs the action and logs it (Slice 4).

---

### Slice 4 — Agent activity logging standardisation (Phase 7)

**Build:**
- Small shared helper `logAgentActivity(agent, business, ref, action, result, nextAgent, blocker)` writing to existing `agent_activity_logs` (extend `details` JSON, no schema change).
- Wire it into the action buttons from Slice 3, plus into existing edge functions: `outreach-send-worker`, `outreach-send-draft`, `outbound-inbound-poll`, `crm-send-check`, `internal-proposal-send`, AI draft generator.
- Surface a **read-only "Recent agent activity" strip** at the bottom of the Agent Workstream tab pulling the last 20 rows.

**Verifies:** Any wired agent action immediately appears in the activity strip with agent → next agent handoff visible.

---

### Slice 5 — First live proof send cycle (Phase 6)

**Only runs after you've flipped CONTROLLED LIVE in Slice 1.**

**Build:**
- New action on the Email Agent card: **"Run controlled live proof send"** — founder-only, CONTROLLED-LIVE-only, single-row only.
- Edge function picks 1 eligible `email_queue` row for NeonCandy, runs `crm-send-check`, runs all existing safety gates (caps, suppression, reply-stop, DNC), invokes existing `outreach-send-worker` for that one row, logs the result via the activity helper.
- After the send, the action self-disables and shows: "1 send completed at HH:MM. Approve next batch?" — no automatic continuation, no bulk.
- Reply path is already covered by existing inbox poll + AI draft + approval queue; we just verify it surfaces correctly in the Workstream tab.

**Verifies:** One real email lands in a real inbox; queue, `email_send_log`, `email_events`, `agent_activity_logs`, and the Revenue Workstream "Sent Emails" count all increment by exactly 1.

---

### Slice 6 — Final acceptance pass

- Walk through all 15 acceptance tests against the running system.
- Fix any residual truth/wording inconsistencies surfaced during the walkthrough.
- Confirm Compliance Agent visibly explains every block in plain English where it appears (queue rows, send-check responses).
- Confirm dormant modules (Social, Voice, Knowledge Base, Supplier when none exists) remain visible but truthfully labelled.

---

### What I will NOT do
- No new schema unless Slice 4 reveals it's strictly required (I expect it is not).
- No new dashboard pages other than `/founder/system/modes` (which is a control surface, not a dashboard).
- No bulk sends, no auto-flips, no fake data, no deletion of edge functions / routes / workflows.
- No hardcoding NeonCandy as the only future business — all logic reads `business_id` from the active business context.

---

### Recommendation
Approve this plan and I'll start with **Slice 1** immediately. Once you've used the new `/founder/system/modes` page and confirmed it behaves correctly, I'll proceed to Slice 2 and onward. Slice 5 (the real send) only runs when you personally enable CONTROLLED LIVE.