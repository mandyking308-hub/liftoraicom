---
name: Liftor operating spine
description: Final architecture from outbound to CRM to AI agents to commercial handoff to finance/supplier and master dry-run gate. Authoritative — do not regress to legacy IONOS proof-send loop.
type: feature
---
**Outbound lanes:** Smartlead is the cold-outreach scale lane. Native Liftor/IONOS is reserved for small controlled business email. Liftor sits above both as the control/brain layer.

**CRM customer memory backbone:** crm_interaction_ledger + identity matching/dedupe + multi-source adapters + unified timeline / Contact 360 + conversation bridge + lifecycle/next-action state machine + health/integrity/backfill (preview).

**AI agent operating layer:** agent role registry, permissions, status, orchestrator + task queue, conversation/draft engine v2, founder approval console. Strict no-send / approval-first.

**Commercial handoff:** commercial-handoff-preview, proposal-preview-from-conversation, revenue-operations-preview, supplier-match-preview. All apply functions disabled by default and gated by env flags + confirmation phrases.

**Master dry-run + live readiness:** liftor-master-dry-run with 16 scenarios + 0-100 readiness score, plus 15 live readiness gates. Live activation disabled until founder explicitly authorises go-live.

**Forbidden (until founder live authorisation):** send email, Apollo live calls, Smartlead POST endpoints, push leads, start campaigns, auto_send, cron, mutating operational outreach data.

**Archived (do NOT resurface as main flow):** IONOS live batch send as scale engine, Apollo reveal-to-queue, Manual Send Apply / Pooja proof-send, the 7 review_required Step 4 rows.

**Apply flag conventions:** AI_DRAFT_SAVE_ENABLED, COMMERCIAL_HANDOFF_APPLY_ENABLED, REVENUE_OPERATIONS_APPLY_ENABLED, FOUNDER_APPROVAL_RECORDING_ENABLED + per-action REVENUE_OPS_<ACTION>_ENABLED. All off by default; each requires confirmation phrase.
