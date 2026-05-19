import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
const ALLOWED = new Set(["technical_manual","user_manual","website","policy","contract","faq","product_info","service_info","pricing","onboarding_doc","support_script","customer_note","founder_note","imported_text","other"]);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, source_name, source_type, source_text, source_url, source_category, dry_run = true, confirmation_phrase, is_test_data = false } = b ?? {};
  if (!business_id || !source_name || !source_type) return json({ ok: false, error: "business_id, source_name, source_type required", safety: SUPPORT_SAFETY }, 400);
  if (!ALLOWED.has(source_type)) return json({ ok: false, error: "invalid source_type", safety: SUPPORT_SAFETY }, 400);
  const summary = source_text ? String(source_text).slice(0, 400) : (source_url ?? source_name);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: { business_id, source_name, source_type, source_category, summary }, no_external_action: true, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "REGISTER SUPPORT KNOWLEDGE SOURCE") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data, error } = await a.admin.from("support_knowledge_sources").insert({ business_id, source_name, source_type, source_text, source_url, source_category, source_summary: summary, is_test_data }).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, source_id: data.id, action: "source_registered", after_json: data, is_test_data });
  return json({ ok: true, created: data, no_external_action: true, safety: SUPPORT_SAFETY });
});