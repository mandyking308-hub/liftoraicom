import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, detectUnsupportedClaims, classifyQuestion } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, question_intake_id, reply, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !question_intake_id) return json({ ok: false, error: "business_id, question_intake_id required", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: reply, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CREATE SUPPORT REPLY DRAFT") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data: q } = await a.admin.from("support_question_intake").select("*").eq("id", question_intake_id).maybeSingle();
  if (!q) return json({ ok: false, error: "question not found", safety: SUPPORT_SAFETY }, 404);
  const cls = classifyQuestion(q.question_text);
  const body = (reply?.reply_body as string) ?? "(Draft pending founder input.)";
  const row = {
    business_id, question_intake_id, crm_contact_id: q.crm_contact_id, conversation_id: q.conversation_id,
    reply_type: reply?.reply_type ?? "support_answer",
    reply_status: "draft",
    reply_channel: reply?.reply_channel ?? "manual",
    subject_line: reply?.subject_line ?? null,
    reply_body: body,
    source_references: reply?.source_references ?? [],
    missing_source_flags: reply?.missing_source_flags ?? [],
    compliance_warnings: detectUnsupportedClaims(body),
    risk_flags: cls.risk_flags,
    tone_notes: reply?.tone_notes ?? null,
    external_send_allowed: false,
    founder_review_required: true,
  };
  const { data, error } = await a.admin.from("support_reply_drafts").insert(row).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, reply_draft_id: data.id, question_intake_id, action: "reply_draft_created", after_json: data });
  return json({ ok: true, created: data, external_send_allowed: false, safety: SUPPORT_SAFETY });
});