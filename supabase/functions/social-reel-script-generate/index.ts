import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const CONFIRM = "SAVE SOCIAL REEL SCRIPTS";

function script(topic: string, cta: string) {
  return [
    `0-1s: visual hook — ${topic}`,
    `1-6s: story beat — why ${topic} matters`,
    `6-12s: payoff / proof / demo`,
    `12-15s: CTA — ${cta}`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, content_pillar_id, offer_mapping_id, asset_id, platform } = body;
  const count = Math.min(20, Number(body.count ?? 5));
  const dry_run = body.dry_run !== false;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  let topic = "your story";
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
    business_id, platform: platform || "instagram",
    variant_type: platform === "tiktok" ? "tiktok_video" : platform === "youtube_shorts" ? "youtube_short" : "instagram_reel",
    title: `${topic} — script ${i + 1}`,
    hook: `${topic}: open with a sharp visual.`,
    script: script(`${topic} variant ${i + 1}`, cta),
    cta, asset_id, approval_status: "draft",
    missing_requirements: asset_id ? [] : ["visual_asset_required"],
  }));
  if (dry_run) return json({ ok: true, dry_run: true, drafts });

  const rows = drafts.map((d) => ({ ...d, is_test_data: !!body.is_test_data }));
  const { data, error } = await admin.from("social_content_variants").insert(rows).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});