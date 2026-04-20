---
name: AI Conversation Engine
description: Inbound-only AI auto-reply system that classifies prospect replies, generates short responses via Lovable AI, and updates contact + conversation state with strict guardrails.
type: feature
---

**Tables (founder-only RLS):**
- `conversations` — one row per contact (UNIQUE contact_id). Fields: business_name, status (OPEN/QUALIFIED/CLOSED), last_message_at, ai_last_used_at, last_ai_reply_at, escalation_pending, escalation_reason, last_intent, intent_history (jsonb, last 20), priority_boost (int, +20 per question, cap 100).
- `messages` — mirror of communications scoped to AI engine. Fields: conversation_id, contact_id, direction, content, channel, inbox_id, ai_generated.
- `ai_actions` — audit trail. Fields: conversation_id, contact_id, action_type (classify/reply/escalate), classification, reply_preview, tokens_used, status, error_message, reply_latency_seconds (time from inbound msg to AI action).

**Triggers:**
- `mirror_comm_to_messages_and_invoke_ai` (AFTER INSERT on `communications`) — finds/creates a conversation, mirrors the row into `messages`, and on inbound calls `ai-conversation-engine` via `net.http_post`.
- `ai_actions_today(_conversation_id)` RPC — returns count of today's AI actions for daily-cap enforcement.

**Edge function `ai-conversation-engine`:**
- POST `{ conversation_id, contact_id }`. Public-callable; uses service role internally.
- **Anti-loop**: skips if `ai_last_used_at` < 2 minutes ago.
- **Daily cap**: skips if conversation already has ≥5 ai_actions today.
- **Status guard**: skips if contact is DO_NOT_CONTACT/CLIENT/SUPPLIER.
- **Escalation rules** (no AI call, marks `escalation_pending=true`): message > 500 chars, contains legal keywords (lawyer, lawsuit, gdpr, subpoena…), high-value keywords (enterprise, rfp, $1m…), or negative-sentiment keywords (angry, scam, fraud…).
- **AI call**: Lovable AI Gateway model `google/gemini-2.5-flash` with `classify_and_reply` tool (forced tool_choice). Context = last 10 messages + contact name/role/company + business_name. Reply hard-truncated to 120 words.
- **Auto-send**: outbound reply inserted into `communications` (ai_generated=true, channel=email, inbox_id=contact.assigned_inbox_id). The existing `handle_new_communication` trigger updates `last_contacted_at`. The mirror trigger creates the corresponding `messages` row.
- **Status updates from classification**: interested → contact QUALIFIED + conversation QUALIFIED. not_interested OR unsubscribe → contact DO_NOT_CONTACT (also clears `active_campaign_id`) + conversation CLOSED.
- **Neutral follow-up loop guard**: if classification = `neutral` AND the most recent outbound message in the thread was AI-generated, the engine suppresses the new reply (still logs classify + intent history). Prevents "ok / thanks" chatter loops.
- **Question priority boost**: classification = `question` adds +20 to `conversations.priority_boost` (capped at 100) for downstream prioritisation.
- **Intent history**: every classification appended to `conversations.intent_history` (capped to last 20) and mirrored into `last_intent`.
- **Reply latency**: every `ai_actions` row stores `reply_latency_seconds` measured from the inbound message timestamp to the AI action.
- **Existing safety still applies**: inbound communication trigger `cancel_queue_on_inbound_comm` already cancels all pending email_queue rows for the contact and clears `active_campaign_id`. Replies from this engine are routed via the contact's sticky `assigned_inbox_id`.

**Founder UI:**
- `/founder/conversations` — dashboard: 4 stat cards (Active, AI Replies 24h, Qualified, Escalations) + scrollable list of recent conversations.
- `/founder/conversations/:id` — thread view with prospect/AI bubbles, contact + conversation status, escalation banner with "Clear escalation" button, AI actions audit log.

**Hard rules enforced:**
- AI runs ONLY on inbound (trigger guard). Outbound never invokes AI.
- ALL outbound goes through `communications` (so `last_contacted_at`, sequence cancellation, and the mirror trigger all fire).
- Reply ALWAYS uses the contact's `assigned_inbox_id` (sticky inbox preserved).
- 120-word cap is enforced both by the prompt and a post-AI `slice` truncation.
- Daily cap = 5 ai_actions per conversation. Anti-loop = 2 minutes between AI calls per conversation.
- Lovable AI 429 → returned as 429 to caller; 402 → returned as 402; both logged to `ai_actions` with `status='failed'`.