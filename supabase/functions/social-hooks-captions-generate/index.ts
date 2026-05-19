import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const CONFIRM = "SAVE GENERATED SOCIAL COPY";

function buildHooks(pillarName: string, count: number) {
  const templates = [
    (p: string) => `What no one tells you about ${p}…`,
    (p: string) => `Stop scrolling — ${p} matters because…`,
    (p: string) => `${p} in 60 seconds.`,
    (p: string) => `The #1 mistake with ${p}.`,
    (p: string) => `Why ${p} is changing fast.`,
    (p: string) => `Here's the truth about ${p}.`,
    (p: string) => `${p}: explained simply.`,
    (p: string) => `3 things you didn't know about ${p}.`,
  ];
  return Array.from({ length: count }, (_, i) => templates[i % templates.length](pillarName));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, content_pillar_id, offer_mapping_id, platform } = body;
  const count = Math.min(50, Number(body.count ?? 10));
  const dry_run = body.dry_run !== false;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  let pillarName = "Awareness";
  if (content_pillar_id) {
    const { data } = await admin.from("business_social_content_pillars").select("name").eq("id", content_pillar_id).maybeSingle();
    if (data?.name) pillarName = data.name;
  }
  const hooks = buildHooks(pillarName, count);
  const items = hooks.map((h) => ({
    hook: h,
    caption_template: `${pillarName} — short, clear, no claims. Founder review required.`,
    cta: "Learn more.",
    hashtags: `#${pillarName.replace(/[^a-zA-Z0-9]/g, "")}`,
    platform: platform || "instagram",
  }));
  if (dry_run) return json({ ok: true, dry_run: true, items });

  const rows = items.flatMap((it) => [
    { business_id, bank_type: "hook", text_value: it.hook, platform: it.platform, content_pillar_id, offer_mapping_id, approval_status: "draft", is_test_data: !!body.is_test_data },
    { business_id, bank_type: "caption", text_value: it.caption_template, platform: it.platform, content_pillar_id, offer_mapping_id, approval_status: "draft", is_test_data: !!body.is_test_data },
  ]);
  const { data, error } = await admin.from("social_hook_caption_bank").insert(rows).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});