---
name: Inbox-Level AI Reply Instructions
description: Per-inbox brand AI reply instructions injected into the AI conversation engine system prompt, with NeonCandy as the seeded reference brand.
type: feature
---

**Schema:** `inboxes.ai_prompt_instructions text` + `inboxes.ai_prompt_updated_at timestamptz`.

**Engine wiring (`ai-conversation-engine`):**
- Loads `ai_prompt_instructions` alongside `ai_reply_mode` from the contact's `assigned_inbox_id`.
- Injects them into the system prompt under `BRAND-SPECIFIC INSTRUCTIONS (highest priority — must be followed exactly)` after the global RULES block.
- `classify_and_reply` enum extended with `escalate` → engine sets `escalation_pending=true` + reason "AI flagged high-value/partnership opportunity for founder review" while still storing the draft.

**UI:** `/founder/crm/inboxes/:id/configure` exposes a "Brand AI reply instructions" textarea with a dedicated Save button (writes `ai_prompt_instructions` + `ai_prompt_updated_at`).

**NeonCandy seeded prompt** lives on both `music@neoncandy.net` and `hello@neoncandy.online`. Hard rules baked in:
- Never call NeonCandy a startup / new label / debut / small project.
- Audience framing: youth-culture, teen-facing, family-aware, pop/dance — NOT children's, NOT adult-only.
- Tone: warm, confident, concise, commercially aware, collaborative, selective.
- Never auto-send full video links, commercial terms, exclusivity, splits, legal commitments.
- Always sign "– NeonCandy".
- Escalate strong partnership / licensing / fashion / beauty / TV opportunities.
- Default mode stays `approval_required` (founder approval before send).
