import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFETY = {
  publish_allowed: false,
  send_allowed: false,
  ad_spend_allowed: false,
  external_api_called: false,
  notes: "Internal draft only. No publish. No send. No ad spend.",
};

const ASSET_TYPES = new Set([
  "blog_post","newsletter","landing_page_copy","lead_magnet","website_section",
  "product_page","service_page","FAQ","case_study","ad_copy","video_script",
  "webinar_outline","sales_page","email_sequence",
]);

function buildOutline(asset_type: string, topic: string, goal: string) {
  const base = [
    { section: "Hook", note: `Open with audience pain or curiosity around: ${topic}` },
    { section: "Promise", note: `Tie ${topic} to outcome: ${goal || "primary conversion goal"}` },
    { section: "Proof", note: "Concrete examples / data / case studies" },
    { section: "Plan", note: "Step-by-step or framework" },
    { section: "CTA", note: "One clear next action" },
  ];
  if (asset_type === "landing_page_copy" || asset_type === "sales_page") {
    return [
      { section: "Hero", note: `Headline + subhead about ${topic}` },
      { section: "Pain", note: "Problem the audience feels today" },
      { section: "Solution", note: "How offer solves it" },
      { section: "Features → Benefits", note: "Translate features into outcomes" },
      { section: "Social Proof", note: "Quotes, logos, results" },
      { section: "FAQ", note: "Top 5 objections" },
      { section: "CTA Block", note: "Single primary action" },
    ];
  }
  if (asset_type === "email_sequence" || asset_type === "newsletter") {
    return [
      { section: "Subject + Preview", note: `Curiosity around ${topic}` },
      { section: "Body", note: "Story → insight → CTA" },
      { section: "PS", note: "Reinforce CTA" },
    ];
  }
  if (asset_type === "ad_copy") {
    return [
      { section: "Hook (3s)", note: `Pattern interrupt about ${topic}` },
      { section: "Value", note: "1 promise, 1 proof" },
      { section: "CTA", note: "Direct response" },
    ];
  }
  return base;
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
    const asset_type: string = String(body?.asset_type ?? "blog_post");
    const topic: string = String(body?.topic ?? "").trim();
    const goal: string = String(body?.goal ?? "").trim();
    const dry_run: boolean = body?.dry_run !== false;
    const confirmation: string = String(body?.confirmation ?? "").trim();

    if (!business_id || !topic) {
      return new Response(JSON.stringify({ error: "business_id and topic required", safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ASSET_TYPES.has(asset_type)) {
      return new Response(JSON.stringify({ error: `invalid asset_type. allowed: ${[...ASSET_TYPES].join(",")}`, safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: bizRow } = await admin.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    const { data: knowledge } = await admin.from("business_knowledge_profiles").select("*").eq("business_id", business_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null } as any));

    const audience = knowledge?.target_audience || knowledge?.ideal_customer_profile || "primary audience";
    const outline = buildOutline(asset_type, topic, goal);
    const seo_keywords = topic.split(/\s+/).filter((w) => w.length > 3).slice(0, 8);
    const cta = goal ? `Take action toward: ${goal}` : "Book a discovery call";
    const title = `${asset_type.replace(/_/g, " ")} — ${topic}`.slice(0, 240);
    const content_body = `# ${title}\n\nAudience: ${audience}\nGoal: ${goal || "(not specified)"}\n\n${outline.map((o: any, i: number) => `## ${i + 1}. ${o.section}\n${o.note}`).join("\n\n")}\n\nCTA: ${cta}`;

    const draft = {
      business_id,
      asset_type,
      asset_title: title,
      asset_status: "draft",
      target_audience: audience,
      goal: goal || null,
      content_body,
      outline,
      seo_keywords,
      cta,
      approval_status: "pending_review",
      publish_allowed: false,
      metadata: { generated_by: "marketing-content-generate", business_name: bizRow?.name ?? null, dry_run },
    };

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, draft, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (confirmation !== "CREATE MARKETING CONTENT ASSET") {
      return new Response(JSON.stringify({ error: "confirmation phrase required: 'CREATE MARKETING CONTENT ASSET'", safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted, error: insErr } = await admin.from("marketing_content_assets").insert(draft).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, asset: inserted, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e), safety: SAFETY }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});