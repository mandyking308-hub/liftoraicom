import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const CONFIRM = "SAVE SOCIAL CAROUSEL OUTLINES";

function outline(topic: string, cta: string) {
  return [
    { slide: 1, text: `${topic} — hook` },
    { slide: 2, text: `What this means for you` },
    { slide: 3, text: `Proof / example` },
    { slide: 4, text: `Mistake to avoid` },
    { slide: 5, text: `Action step` },
    { slide: 6, text: cta },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, content_pillar_id, offer_mapping_id, platform } = body;
  const count = Math.min(20, Number(body.count ?? 5));
  const dry_run = body.dry_run !== false;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  let topic = "your topic";
  if (content_pillar_id) {
    const { data } = await admin.from("business_social_content_pillars").select("name").eq("id", content_pillar_id).maybeSingle();
    if (data?.name) topic = data.name;
  }
  let cta = "Learn more.";
  if (offer_mapping_id) {
    const { data } = await admin.from("business_social_offer_mappings").select("cta").eq("id", offer_mapping_id).maybeSingle();
    if (data?.cta) cta = data.cta;
  }
  const drafts = Array.from({ length: count }, (_, i) => ({
    business_id, platform: platform || "instagram_post",
    variant_type: "instagram_post",
    title: `${topic} carousel ${i + 1}`,
    hook: `${topic} — slide 1 hook`,
    carousel_outline: outline(`${topic} ${i + 1}`, cta),
    cta, approval_status: "draft",
    missing_requirements: ["carousel_visuals_required"],
  }));
  if (dry_run) return json({ ok: true, dry_run: true, drafts });
  const rows = drafts.map((d) => ({ ...d, is_test_data: !!body.is_test_data }));
  const { data, error } = await admin.from("social_content_variants").insert(rows).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});