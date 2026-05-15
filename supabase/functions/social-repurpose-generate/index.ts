import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIRM_PHRASE = "CREATE REPURPOSED SOCIAL POSTS";

function variantsForAsset(asset: any, brandVoice: string, cta: string) {
  const title = asset.asset_title;
  const type = asset.asset_type;
  const transcriptHook = asset.transcript ? String(asset.transcript).split(/[.\n]/)[0].slice(0, 80) : title;
  return {
    instagram_reel: {
      hook: `${transcriptHook} — ${title}`,
      caption: `${title}. ${brandVoice}. ${cta}`,
      video_script: [
        `0–1s: visual hook (${type})`,
        `1–6s: story beat from ${title}`,
        `6–12s: payoff / climax`,
        `12–15s: CTA — ${cta}`,
      ].join("\n"),
    },
    instagram_carousel: {
      caption: `${title}. ${brandVoice}. ${cta}`,
      slides: [
        { slide: 1, text: `${title} ✨` },
        { slide: 2, text: transcriptHook },
        { slide: 3, text: "Why this matters" },
        { slide: 4, text: cta },
      ],
    },
    instagram_story: {
      hook: `${title} — swipe up`,
      caption: `${transcriptHook}\n${cta}`,
    },
    tiktok: {
      hook: `POV: ${transcriptHook}`,
      caption: `${title} #fyp`,
      video_script: [
        "0–1s: pattern interrupt",
        `1–6s: ${transcriptHook}`,
        "6–15s: payoff + trend hook",
        `15s: ${cta}`,
      ].join("\n"),
    },
    youtube_shorts: {
      hook: `${title}`,
      description: `${title} — ${transcriptHook}\n\n${cta}`,
      video_script: [
        "0–1s: visual hook",
        `1–10s: ${transcriptHook}`,
        `10–30s: full payoff with cuts`,
        `30–45s: CTA — ${cta}`,
      ].join("\n"),
    },
    facebook_post: {
      caption: `${title}\n\n${transcriptHook}\n\n${cta}`,
    },
    linkedin_thought: {
      caption: `Lessons from ${title}.\n\n${transcriptHook}\n\nWhat I'm taking away: 3 quick notes on craft, audience and process.\n\n${cta}`,
    },
    blog_snippet: {
      caption: `${title} — long-form notes\n\n${transcriptHook}\n\nFull write-up coming. ${cta}`,
    },
  };
}

function platformPreference(platform: string, v: any) {
  switch (platform) {
    case "instagram": return [
      { post_type: "reel", ...v.instagram_reel },
      { post_type: "carousel", ...v.instagram_carousel },
      { post_type: "story", ...v.instagram_story },
    ];
    case "tiktok": return [{ post_type: "tiktok", ...v.tiktok }];
    case "youtube_shorts": return [{ post_type: "short", ...v.youtube_shorts }];
    case "facebook": return [{ post_type: "text_post", ...v.facebook_post }];
    case "linkedin": return [{ post_type: "text_post", ...v.linkedin_thought }];
    case "website_blog": return [{ post_type: "blog_snippet", ...v.blog_snippet }];
    default: return [{ post_type: "text_post", caption: v.facebook_post.caption }];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const source_asset_id: string | undefined = body?.source_asset_id;
    const target_platforms: string[] = Array.isArray(body?.target_platforms) && body.target_platforms.length
      ? body.target_platforms
      : ["instagram", "tiktok", "youtube_shorts", "facebook"];
    const output_count: number = Math.max(1, Math.min(50, Number(body?.output_count ?? 8)));
    const dry_run: boolean = body?.dry_run !== false;
    const confirmation: string = String(body?.confirmation ?? "");

    if (!source_asset_id) {
      return new Response(JSON.stringify({ error: "source_asset_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!dry_run && confirmation !== CONFIRM_PHRASE) {
      return new Response(JSON.stringify({ error: `confirmation phrase required: "${CONFIRM_PHRASE}"` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: asset } = await admin.from("social_source_assets").select("*").eq("id", source_asset_id).maybeSingle();
    if (!asset) {
      return new Response(JSON.stringify({ error: "source asset not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: profile } = await admin.from("social_business_profiles").select("*").eq("business_id", asset.business_id).maybeSingle();
    const brandVoice = profile?.brand_voice ?? "clear, helpful, on-brand";
    const cta = profile?.primary_cta ?? "Follow for more.";

    const variants = variantsForAsset(asset, brandVoice, cta);
    const planned: any[] = [];
    for (const platform of target_platforms) {
      for (const v of platformPreference(platform, variants)) {
        planned.push({
          business_id: asset.business_id,
          platform_key: platform,
          post_type: v.post_type,
          hook: (v as any).hook ?? null,
          caption: (v as any).caption ?? null,
          cta,
          hashtags: ["#NeonCandy", "#NewMusic"],
          visual_direction: `Repurposed from ${asset.asset_type}: ${asset.asset_title}`,
          video_script: (v as any).video_script ?? null,
          carousel_slides: (v as any).slides ?? [],
          asset_requirements: [],
          source_asset_id,
          approval_status: "draft",
          founder_review_required: true,
          publish_allowed: false,
          scheduled_externally: false,
          metadata: { source: "social-repurpose-generate", asset_title: asset.asset_title },
        });
        if (planned.length >= output_count) break;
      }
      if (planned.length >= output_count) break;
    }

    let job: any = null;
    let inserted = 0;
    if (!dry_run) {
      const { data: jobRow, error: jobErr } = await admin.from("social_repurposing_jobs").insert({
        business_id: asset.business_id,
        source_asset_id,
        job_name: `Repurpose: ${asset.asset_title}`,
        target_platforms,
        output_types: planned.map((p) => p.post_type),
        job_status: "drafts_created",
        outputs_created: planned.length,
      }).select().single();
      if (jobErr) throw jobErr;
      job = jobRow;
      const { error: insErr, count } = await admin.from("social_post_drafts").insert(planned, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count ?? planned.length;
    }

    return new Response(JSON.stringify({
      status: "ok",
      mode: dry_run ? "dry_run" : "live",
      asset: { id: asset.id, title: asset.asset_title, type: asset.asset_type },
      target_platforms,
      planned_outputs: planned.length,
      preview: planned.slice(0, 6),
      inserted_drafts: inserted,
      job,
      safety_audit: {
        no_external_post: true,
        no_external_dm: true,
        no_external_api_mutation: true,
        confirmation_required_phrase: CONFIRM_PHRASE,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});