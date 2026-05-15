import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const filterBusiness: string | null = body?.business_id ?? null;

    let bq = admin.from("businesses").select("id,name");
    if (filterBusiness) bq = bq.eq("id", filterBusiness);
    const { data: businesses } = await bq;

    const { data: profiles } = await admin.from("business_operating_profiles").select("*");
    const { data: modules } = await admin.from("business_operating_modules").select("*");
    const { data: agents } = await admin.from("business_agent_assignments_v2").select("*");

    const profByBiz = new Map<string, any>((profiles ?? []).map((p: any) => [p.business_id, p]));
    const modsByBiz = new Map<string, any[]>();
    for (const m of modules ?? []) {
      const arr = modsByBiz.get(m.business_id) ?? [];
      arr.push(m); modsByBiz.set(m.business_id, arr);
    }
    const agentsByBiz = new Map<string, any[]>();
    for (const a of agents ?? []) {
      const arr = agentsByBiz.get(a.business_id) ?? [];
      arr.push(a); agentsByBiz.set(a.business_id, arr);
    }

    const out = (businesses ?? []).map((b: any) => {
      const profile = profByBiz.get(b.id) ?? null;
      const mods = modsByBiz.get(b.id) ?? [];
      const ags = agentsByBiz.get(b.id) ?? [];
      const enabledMods = mods.filter((m: any) => m.enabled);
      const enabledAgents = ags.filter((a: any) => a.enabled);
      const blockers: string[] = [];
      if (!profile) blockers.push("No operating profile");
      if (mods.length === 0) blockers.push("No operating modules seeded");
      if (ags.length === 0) blockers.push("No agent assignments seeded");
      if (profile && !profile.crm_enabled) blockers.push("CRM disabled");
      if (profile && !profile.agents_enabled) blockers.push("Agents disabled");

      const readiness = blockers.length === 0
        ? (profile?.operating_status === "active_build" || profile?.operating_status === "live" ? "ready" : "configurable")
        : "blocked";

      const externalLocks = {
        auto_send_allowed: profile?.auto_send_allowed === true,
        external_provider_mutation_allowed: profile?.external_provider_mutation_allowed === true,
        agents_with_external_send: ags.filter((a: any) => a.can_send_external).length,
        agents_with_provider_post: ags.filter((a: any) => a.can_call_provider_post).length,
        agents_with_credit_spend: ags.filter((a: any) => a.can_spend_credits).length,
      };

      const nextAction = !profile
        ? "Create operating profile"
        : mods.length === 0
        ? "Seed operating modules"
        : ags.length === 0
        ? "Seed agent assignments"
        : profile.operating_status === "setup"
        ? "Move to active_build after CRM + outbound + agents are configured"
        : "Run dry-run, then internal agents";

      return {
        business_id: b.id,
        business_name: b.name,
        operating_status: profile?.operating_status ?? "unconfigured",
        readiness,
        blockers,
        profile,
        modules: mods,
        modules_enabled_count: enabledMods.length,
        modules_total: mods.length,
        agents: ags,
        agents_enabled_count: enabledAgents.length,
        agents_total: ags.length,
        provider_lanes: {
          smartlead: profile?.smartlead_enabled === true,
          native_email: profile?.native_email_enabled === true,
          apollo: profile?.apollo_enabled === true,
        },
        external_locks: externalLocks,
        next_action: nextAction,
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      businesses: out,
      totals: {
        businesses: out.length,
        ready: out.filter((b) => b.readiness === "ready").length,
        configurable: out.filter((b) => b.readiness === "configurable").length,
        blocked: out.filter((b) => b.readiness === "blocked").length,
      },
      emails_sent: 0,
      apollo_called: false,
      smartlead_post_called: false,
      external_sends_locked: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});