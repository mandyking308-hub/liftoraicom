import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.bank_type || !b.text_value)
    return json({ ok: false, error: "business_id, bank_type, text_value required" }, 400);
  const dry_run = b.dry_run !== false;

  const row = {
    business_id: b.business_id, bank_type: b.bank_type, text_value: b.text_value,
    platform: b.platform ?? null, content_pillar_id: b.content_pillar_id ?? null,
    offer_mapping_id: b.offer_mapping_id ?? null, tone: b.tone ?? null,
    approval_status: b.approval_status ?? "draft",
    is_test_data: !!b.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert: row });
  if (b.confirmation_phrase !== "SAVE SOCIAL HOOK CAPTION")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "SAVE SOCIAL HOOK CAPTION" }, 400);

  const { data, error } = await admin.from("social_hook_caption_bank").insert(row).select("id").maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, id: data?.id });
});
