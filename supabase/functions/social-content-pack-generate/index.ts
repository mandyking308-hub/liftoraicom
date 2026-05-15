import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIRM_PHRASE = "CREATE SOCIAL CONTENT PACK";

const POST_TYPES = ["reel","short","tiktok","carousel","single_image","story","text_post","poll","community_post","blog_snippet","creator_callout","launch_announcement","behind_the_scenes","testimonial","educational","promotional"] as const;

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const NEON_CANDY_TOPICS = [
  "Boom in My Step",
  "Can't Wait",
  "Sassy Princess",
  "AI music videos",
  "creator collaboration",
  "playlist/DJ/media discovery",
  "visual drops",
  "fan prompts",
];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function buildPostsForBusiness(opts: {
  businessName: string;
  brandVoice: string;
  cta: string;
  pillars: string[];
  topics: string[];
  platforms: string[];
  days: number;
  startDate: Date;
  calendarId: string;
  businessId: string;
}) {
  const { businessName, brandVoice, cta, pillars, topics, platforms, days, startDate, calendarId, businessId } = opts;
  const drafts: any[] = [];
  const rotation = ["reel","carousel","reel","single_image","short","carousel","behind_the_scenes"] as const;
  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + d);
    const isoDate = `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
    const topic = pick(topics, d);
    const pillar = pick(pillars.length ? pillars : ["brand"], d);
    const baseType = pick(rotation as unknown as string[], d);
    for (const platform of platforms) {
      const post_type = platform === "tiktok" ? "tiktok"
        : platform === "youtube_shorts" ? "short"
        : baseType;
      const hook = `${topic} — open with a 1-second visual punch. (${brandVoice.split(",")[0]})`;
      const caption = `${topic} drop incoming. ${brandVoice}. ${cta}`;
      const hashtags = ["#NeonCandy","#NewMusic","#AIVisuals","#IndiePop", `#${topic.replace(/[^a-zA-Z0-9]/g,"")}`];
      const visual_direction = `${topic}: neon, candy-colour palette, motion-forward, music-led pacing.`;
      const carousel_slides = post_type === "carousel" ? [
        { slide: 1, text: `${topic} ✨` },
        { slide: 2, text: `Here's the story behind it.` },
        { slide: 3, text: `Visual + audio drops together.` },
        { slide: 4, text: cta },
      ] : [];
      const video_script = (post_type === "reel" || post_type === "short" || post_type === "tiktok") ? [
        "0–1s: visual hook (neon flash + lyric snippet)",
        "1–6s: story beat — what this drop is about",
        "6–12s: payoff + chorus / visual climax",
        `12–15s: CTA — ${cta}`,
      ].join("\n") : null;
      drafts.push({
        business_id: businessId,
        calendar_id: calendarId,
        platform_key: platform,
        post_type,
        post_date: isoDate,
        suggested_time: "18:00",
        content_pillar: pillar,
        hook,
        caption,
        cta,
        hashtags,
        visual_direction,
        video_script,
        carousel_slides,
        asset_requirements: post_type === "carousel" ? ["4 image slides 1080x1350"] : ["1 vertical video 1080x1920"],
        approval_status: "draft",
        founder_review_required: true,
        publish_allowed: false,
        scheduled_externally: false,
        external_scheduler: null,
        metadata: { source: "social-content-pack-generate", topic, business_name: businessName },
      });
    }
  }
  return drafts;
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
    const uid = userData.user.id;
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const business_id: string | undefined = body?.business_id;
    const days: number = Math.max(1, Math.min(60, Number(body?.days ?? 30)));
    const platformsInput: string[] | undefined = body?.platforms;
    const content_goals: string[] = Array.isArray(body?.content_goals) ? body.content_goals : [];
    const dry_run: boolean = body?.dry_run !== false;
    const confirmation: string = String(body?.confirmation ?? "");

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!dry_run && confirmation !== CONFIRM_PHRASE) {
      return new Response(JSON.stringify({ error: `confirmation phrase required: "${CONFIRM_PHRASE}"` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: biz }, { data: profile }] = await Promise.all([
      admin.from("businesses").select("id,name,slug").eq("id", business_id).maybeSingle(),
      admin.from("social_business_profiles").select("*").eq("business_id", business_id).maybeSingle(),
    ]);
    if (!biz) {
      return new Response(JSON.stringify({ error: "business not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let knowledge: any = null;
    try {
      const r = await admin.from("business_knowledge_profiles").select("*").eq("business_id", business_id).maybeSingle();
      knowledge = r.data ?? null;
    } catch (_) { /* table may not exist */ }

    const isNeonCandy = business_id === NEON_CANDY_ID;
    const platforms = (platformsInput && platformsInput.length)
      ? platformsInput
      : (Array.isArray(profile?.primary_platforms) && profile!.primary_platforms.length
          ? profile!.primary_platforms as string[]
          : (isNeonCandy ? ["instagram","tiktok","youtube_shorts","facebook"] : ["instagram"]));
    const pillars = (Array.isArray(profile?.content_pillars) ? profile!.content_pillars as string[] : []);
    const topics = isNeonCandy ? NEON_CANDY_TOPICS : (content_goals.length ? content_goals : pillars.length ? pillars : ["brand story","product","education","community"]);
    const cta = profile?.primary_cta ?? "Follow for more.";
    const brandVoice = profile?.brand_voice ?? "clear, helpful, on-brand";

    const startDate = new Date();
    const endDate = new Date(startDate); endDate.setUTCDate(endDate.getUTCDate() + days - 1);
    const startISO = `${startDate.getUTCFullYear()}-${pad(startDate.getUTCMonth()+1)}-${pad(startDate.getUTCDate())}`;
    const endISO = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth()+1)}-${pad(endDate.getUTCDate())}`;

    // Generate calendar + drafts (in-memory)
    const calendarStub = {
      business_id,
      calendar_name: `${biz.name} – ${days}-day pack`,
      calendar_period_start: startISO,
      calendar_period_end: endISO,
      calendar_status: "draft",
      strategy_summary: `${days}-day internal content pack for ${biz.name}. Voice: ${brandVoice}. Topics: ${topics.join(", ")}.`,
      content_pillars: pillars,
      target_platforms: platforms,
      posting_frequency: { per_day: platforms.length },
      approval_status: "draft",
      metadata: { source: "social-content-pack-generate", knowledge_used: !!knowledge },
    };

    let calendarId = "preview-calendar";
    let drafts: any[] = [];
    let createdCalendar: any = null;
    let inserted_drafts = 0;

    if (!dry_run) {
      const { data: calRow, error: calErr } = await admin
        .from("social_content_calendars")
        .insert(calendarStub)
        .select()
        .single();
      if (calErr) throw calErr;
      createdCalendar = calRow;
      calendarId = calRow.id;
      drafts = buildPostsForBusiness({
        businessName: biz.name, brandVoice, cta, pillars, topics, platforms, days, startDate, calendarId, businessId: business_id,
      });
      const { error: insErr, count } = await admin
        .from("social_post_drafts")
        .insert(drafts, { count: "exact" });
      if (insErr) throw insErr;
      inserted_drafts = count ?? drafts.length;
    } else {
      drafts = buildPostsForBusiness({
        businessName: biz.name, brandVoice, cta, pillars, topics, platforms, days, startDate, calendarId, businessId: business_id,
      });
    }

    return new Response(JSON.stringify({
      status: "ok",
      mode: dry_run ? "dry_run" : "live",
      business: { id: biz.id, name: biz.name },
      calendar_preview: createdCalendar ?? calendarStub,
      preview_drafts: drafts.slice(0, 6),
      total_drafts: drafts.length,
      inserted_drafts,
      platforms,
      days,
      topics,
      safety_audit: {
        no_external_post: true,
        no_external_dm: true,
        no_external_api_mutation: true,
        no_scheduling: true,
        confirmation_required_phrase: CONFIRM_PHRASE,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});