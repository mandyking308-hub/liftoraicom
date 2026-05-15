import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: businesses }, { data: profiles }, { data: accounts }, { data: socialAgents }, { data: agentStatus }] = await Promise.all([
      admin.from("businesses").select("id,name,slug,status").limit(200),
      admin.from("social_business_profiles").select("*"),
      admin.from("social_platform_accounts").select("*"),
      admin.from("ai_agent_roles").select("agent_key,agent_name,agent_category").eq("agent_category", "social"),
      admin.from("ai_agent_operating_status").select("agent_key,status,health,pending_items,blocked_items"),
    ]);

    const statusByKey = new Map((agentStatus ?? []).map((s: any) => [s.agent_key, s]));
    const socialAgentsWithStatus = (socialAgents ?? []).map((a: any) => ({
      ...a,
      operating_status: statusByKey.get(a.agent_key) ?? null,
    }));

    const profileByBiz = new Map((profiles ?? []).map((p: any) => [p.business_id, p]));
    const accountsByBiz = new Map<string, any[]>();
    for (const acc of accounts ?? []) {
      if (!accountsByBiz.has(acc.business_id)) accountsByBiz.set(acc.business_id, []);
      accountsByBiz.get(acc.business_id)!.push(acc);
    }

    const perBusiness = (businesses ?? []).map((b: any) => {
      const profile = profileByBiz.get(b.id);
      const biz_accounts = accountsByBiz.get(b.id) ?? [];
      const connectedCount = biz_accounts.filter((a) => a.account_status === "connected").length;
      const blockers: string[] = [];
      if (!profile) blockers.push("No social profile configured");
      else {
        if (!profile.brand_voice) blockers.push("Brand voice missing");
        if (!profile.primary_cta) blockers.push("Primary CTA missing");
        if (!Array.isArray(profile.content_pillars) || profile.content_pillars.length === 0) blockers.push("Content pillars missing");
        if (connectedCount === 0) blockers.push("No platforms connected (internal-only mode)");
      }
      const completeness = profile
        ? [profile.brand_voice, profile.primary_cta, profile.audience_profile, profile.posting_frequency,
           Array.isArray(profile.content_pillars) && profile.content_pillars.length > 0,
           Array.isArray(profile.primary_platforms) && profile.primary_platforms.length > 0]
            .filter(Boolean).length / 6
        : 0;
      return {
        business_id: b.id,
        business_name: b.name,
        slug: b.slug,
        social_status: profile?.social_status ?? "not_configured",
        profile_completeness: Math.round(completeness * 100),
        primary_platforms: profile?.primary_platforms ?? [],
        secondary_platforms: profile?.secondary_platforms ?? [],
        brand_voice: profile?.brand_voice ?? null,
        primary_cta: profile?.primary_cta ?? null,
        content_pillars: profile?.content_pillars ?? [],
        connected_platforms: connectedCount,
        platform_count: biz_accounts.length,
        platforms: biz_accounts,
        metricool_enabled: profile?.metricool_enabled ?? false,
        manychat_enabled: profile?.manychat_enabled ?? false,
        approval_required: profile?.approval_required ?? true,
        auto_publish_allowed: profile?.auto_publish_allowed ?? false,
        content_calendar_status: "not_started",
        post_pack_drafts: 0,
        approvals_pending: 0,
        analytics_ready: false,
        next_action: !profile
          ? "Create social profile"
          : connectedCount === 0
          ? "Generate 30-day social content pack (internal draft)"
          : "Build draft content calendar",
        blockers,
      };
    });

    const summary = {
      businesses_total: perBusiness.length,
      businesses_configured: perBusiness.filter((b) => b.social_status !== "not_configured").length,
      businesses_blocked: perBusiness.filter((b) => b.blockers.length > 0).length,
      external_posts_published: 0,
      external_dms_sent: 0,
      external_api_mutations: 0,
      social_agents_total: socialAgentsWithStatus.length,
      no_external_send: true,
    };

    return new Response(
      JSON.stringify({
        status: "ok",
        generated_at: new Date().toISOString(),
        summary,
        per_business: perBusiness,
        social_agents: socialAgentsWithStatus,
        safety_audit: {
          no_external_post: true,
          no_external_dm: true,
          no_external_api_mutation: true,
          notes: "Read-only aggregation. No platform calls executed.",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});