import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, source_id, approval_notes, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !source_id) return json({ ok: false, error: "business_id, source_id required", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_approve: source_id, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "APPROVE SUPPORT KNOWLEDGE SOURCE") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data, error } = await a.admin.from("support_knowledge_sources").update({ approved_for_support: true, approved_by: a.user.email ?? a.user.id, approved_at: new Date().toISOString(), review_notes: approval_notes ?? null, source_status: "approved", reliability_level: "founder_approved" }).eq("id", source_id).eq("business_id", business_id).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, source_id, action: "source_approved", after_json: data });
  return json({ ok: true, approved: data, safety: SUPPORT_SAFETY });
});