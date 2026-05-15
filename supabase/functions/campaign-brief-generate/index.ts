import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFETY = {
  launch_allowed: false,
  publish_allowed: false,
  send_allowed: false,
  ad_spend_allowed: false,
  external_api_called: false,
  notes: "Internal brief only. No launch. No send. No ad spend.",
};

const CAMPAIGN_TYPES = new Set([
  "lead_generation","product_launch","waitlist","webinar","social_growth",
  "newsletter_growth","paid_ads","organic_content","partnership","creator_campaign",
  "donor_campaign","property_campaign",
]);

function defaultChannels(t: string): string[] {
  const map: Record<string, string[]> = {
    lead_generation: ["email","linkedin","landing_page"],
    product_launch: ["email","instagram","tiktok","youtube_shorts","landing_page"],
    waitlist: ["landing_page","email","instagram"],
    webinar: ["email","linkedin","landing_page"],
    social_growth: ["instagram","tiktok","youtube_shorts"],
    newsletter_growth: ["landing_page","social","lead_magnet"],
    paid_ads: ["meta_ads","google_ads","landing_page"],
    organic_content: ["blog","social","newsletter"],
    partnership: ["email","linkedin"],
    creator_campaign: ["instagram","tiktok","youtube_shorts","email"],
    donor_campaign: ["email","landing_page","social"],
    property_campaign: ["landing_page","email","instagram","facebook"],
  };
  return map[t] ?? ["email","social","landing_page"];
}

function defaultFunnel(t: string) {
  return [
    { step: "awareness", note: `Top-of-funnel hook tailored to ${t}` },
    { step: "interest", note: "Lead magnet or demo offer" },
    { step: "consideration", note: "Email/DM nurture sequence" },
    { step: "conversion", note: "Primary CTA: book / buy / apply" },
    { step: "retention", note: "Onboarding + upsell sequence" },
  ];
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
      return new Response(JSON.stringify({ error: "unauthorized", safety: SAFETY }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden", safety: SAFETY }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const business_id: string | undefined = body?.business_id;
    const campaign_type: string = String(body?.campaign_type ?? "lead_generation");
    const goal: string = String(body?.goal ?? "").trim();
    const dry_run: boolean = body?.dry_run !== false;
    const confirmation: string = String(body?.confirmation ?? "").trim();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required", safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!CAMPAIGN_TYPES.has(campaign_type)) {
      return new Response(JSON.stringify({ error: `invalid campaign_type. allowed: ${[...CAMPAIGN_TYPES].join(",")}`, safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: bizRow } = await admin.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    const { data: knowledge } = await admin.from("business_knowledge_profiles").select("*").eq("business_id", business_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null } as any));

    const audience = knowledge?.target_audience || knowledge?.ideal_customer_profile || "primary audience";
    const offer = knowledge?.flagship_offer || knowledge?.primary_offer || `Primary offer for ${campaign_type}`;
    const channels = defaultChannels(campaign_type);
    const funnel_steps = defaultFunnel(campaign_type);
    const creative_angles = [
      `Pain → Solution narrative around ${goal || campaign_type}`,
      `Proof / case-study driven angle`,
      `Authority / contrarian POV angle`,
      `Time-bound / scarcity angle`,
    ];
    const required_assets = [
      { type: "landing_page_copy", note: "Primary conversion page" },
      { type: "lead_magnet", note: "Top-of-funnel exchange" },
      { type: "email_sequence", note: "5-step nurture" },
      { type: "ad_copy", note: "3 angles x 2 platforms" },
      { type: "social", note: "10 organic posts" },
      { type: "newsletter", note: "Launch announcement" },
    ];

    const brief = {
      business_id,
      campaign_name: `${(bizRow?.name ?? "Business")} — ${campaign_type} (${new Date().toISOString().slice(0, 10)})`,
      campaign_type,
      campaign_goal: goal || `Drive measurable ${campaign_type} outcome`,
      target_audience: audience,
      offer,
      channels,
      funnel_steps,
      creative_angles,
      required_assets,
      budget_notes: "No spend authorised. Brief only. Founder must approve any paid activation.",
      approval_status: "pending_review",
      launch_allowed: false,
      metadata: { generated_by: "campaign-brief-generate", dry_run, metrics: ["CPL","CAC","LTV","CTR","conversion_rate"] },
    };

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, brief, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (confirmation !== "CREATE MARKETING CAMPAIGN BRIEF") {
      return new Response(JSON.stringify({ error: "confirmation phrase required: 'CREATE MARKETING CAMPAIGN BRIEF'", safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted, error: insErr } = await admin.from("marketing_campaign_briefs").insert(brief).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, brief: inserted, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e), safety: SAFETY }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});