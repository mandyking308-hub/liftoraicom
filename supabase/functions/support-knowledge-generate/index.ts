import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFETY = {
  send_allowed: false,
  external_chat_connected: false,
  external_api_called: false,
  notes: "Internal support knowledge draft only. No external send. No live chat. No customer mutation.",
};

const ARTICLE_TYPES = new Set([
  "FAQ","help_article","troubleshooting","policy","onboarding","pricing_answer",
  "refund_answer","delivery_answer","technical_support","escalation_script",
]);

function buildArticles(business_name: string, source: string, requested: string[]) {
  const types = (requested && requested.length ? requested : ["FAQ","help_article","troubleshooting","policy","escalation_script"])
    .filter((t) => ARTICLE_TYPES.has(t));
  return types.map((t) => {
    const title = `${business_name} — ${t.replace(/_/g, " ")}`.slice(0, 240);
    const body = `# ${title}\n\nAudience: customer\nSource: ${source ? source.slice(0, 200) : "(business knowledge profile)"}\n\n## Summary\nDraft ${t.replace(/_/g, " ")} generated for internal review. Founder must approve before agent visibility.\n\n## Key points\n- Restate the customer question in plain language\n- Provide the answer in <120 words\n- Link to relevant policy or next step\n- Provide escalation path if outside scope\n\n## Suggested response template\nHi {{first_name}}, thanks for reaching out — here's how we handle this...`;
    return {
      article_type: t,
      title,
      content: body,
      status: "draft",
      audience: t === "escalation_script" ? "agent" : "customer",
      tags: [t, "auto_generated"],
      agent_visible: false,
      approved: false,
      metadata: { generated_by: "support-knowledge-generate" },
    };
  });
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
    const source: string = String(body?.source ?? "").trim();
    const requested: string[] = Array.isArray(body?.article_types) ? body.article_types : [];
    const dry_run: boolean = body?.dry_run !== false;
    const confirmation: string = String(body?.confirmation ?? "").trim();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required", safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: bizRow } = await admin.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    const business_name = bizRow?.name ?? "Business";

    const articles = buildArticles(business_name, source, requested);

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, articles, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (confirmation !== "CREATE SUPPORT KNOWLEDGE") {
      return new Response(JSON.stringify({ error: "confirmation phrase required: 'CREATE SUPPORT KNOWLEDGE'", safety: SAFETY }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = articles.map((a) => ({ ...a, business_id }));
    const { data: inserted, error: insErr } = await admin.from("support_knowledge_articles").insert(rows).select();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, articles: inserted, count: inserted?.length ?? 0, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e), safety: SAFETY }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});