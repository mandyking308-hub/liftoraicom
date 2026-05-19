import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const ALLOWED_TYPES = new Set([
  "technical_manual","user_manual","website","brand_guide","offer_sheet","pricing_sheet",
  "customer_profile","faq","policy","sales_script","marketing_plan","social_asset_notes",
  "founder_notes","transcript","competitor_notes","other",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const {
    business_id, source_type, title, source_url, pasted_text, storage_path,
    founder_notes, dry_run = true, confirmation_phrase, is_test_data = false,
  } = body ?? {};

  if (!business_id || !source_type || !title) {
    return json({ ok: false, error: "business_id, source_type, title required" }, 400);
  }
  if (!ALLOWED_TYPES.has(source_type)) return json({ ok: false, error: "invalid source_type" }, 400);

  const summary = pasted_text ? pasted_text.slice(0, 300) : (source_url ?? storage_path ?? title);

  if (dry_run !== false) {
    return json({
      ok: true, dry_run: true, would_create: { business_id, source_type, title, summary },
      no_external_action: true,
    });
  }
  if (confirmation_phrase !== "REGISTER SOCIAL KNOWLEDGE SOURCE") {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required" }, 400);
  }

  const { data, error } = await auth.admin.from("business_social_knowledge_sources").insert({
    business_id, source_type, title, source_url, storage_path, pasted_text,
    summary, founder_notes, is_test_data,
  }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, created: data, no_external_action: true });
});