import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// AI Agent Status Preview — read-only diagnostic.
// NO sends, NO Apollo, NO Smartlead POSTs, NO mutation.

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

const safeCount = async (admin: any, table: string) => {
  try {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    if (error) return { exists: false, count: 0 };
    return { exists: true, count: count ?? 0 };
  } catch {
    return { exists: false, count: 0 };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const [{ data: roles }, { data: perms }, { data: status }] = await Promise.all([
      admin.from("ai_agent_roles").select("*").order("agent_name"),
      admin.from("ai_agent_permissions").select("*"),
      admin.from("ai_agent_operating_status").select("*"),
    ]);

    // CRM readiness signal
    const crmLedger = await safeCount(admin, "crm_interaction_ledger");
    const crmTypes = await safeCount(admin, "crm_interaction_types");
    const crmAdapters = await safeCount(admin, "crm_interaction_source_adapters");
    const crmStages = await safeCount(admin, "crm_lifecycle_stages");
    const crmRules = await safeCount(admin, "crm_next_action_rules");
    const crmReady =
      crmLedger.exists && crmTypes.count > 0 && crmAdapters.count > 0 && crmStages.count > 0 && crmRules.count > 0;

    // Outbound readiness
    const smartleadInboxes = await safeCount(admin, "smartlead_inboxes");
    const emailQueue = await safeCount(admin, "email_queue");
    const outboundReady = emailQueue.exists;

    const permsByRole = new Map<string, any[]>();
    (perms ?? []).forEach((p: any) => {
      const arr = permsByRole.get(p.agent_role_id) ?? [];
      arr.push(p);
      permsByRole.set(p.agent_role_id, arr);
    });
    const statusByKey = new Map<string, any>();
    (status ?? []).forEach((s: any) => statusByKey.set(s.agent_key, s));

    const agents = (roles ?? []).map((r: any) => {
      const ps = permsByRole.get(r.id) ?? [];
      const allowed = ps.filter((p) => p.allowed).map((p) => p.permission_key);
      const forbidden = ps.filter((p) => !p.allowed).map((p) => p.permission_key);
      const blockers: string[] = [];
      if (r.primary_module === "crm" || r.primary_module === "conversations" || r.primary_module === "outreach") {
        if (!crmReady) blockers.push("crm_not_ready");
      }
      if (r.primary_module === "outreach" && !outboundReady) blockers.push("outbound_not_configured");
      const st = statusByKey.get(r.agent_key);
      let readiness: "ready" | "partial" | "blocked" | "not_configured" = "not_configured";
      if (!st) readiness = "not_configured";
      else if (blockers.length > 0) readiness = "blocked";
      else if (st.status === "preview") readiness = "partial";
      else if (st.status === "active") readiness = "ready";
      else readiness = "partial";
      return {
        agent_key: r.agent_key,
        agent_name: r.agent_name,
        agent_category: r.agent_category,
        primary_module: r.primary_module,
        risk_level: r.risk_level,
        founder_approval_required: r.founder_approval_required,
        auto_action_allowed: r.auto_action_allowed,
        can_send_email: r.can_send_email,
        guardrails: r.guardrails,
        status: st?.status ?? "preview",
        health: st?.health ?? "unknown",
        no_send_status: st?.no_send_status ?? true,
        readiness,
        blockers,
        allowed_actions: allowed,
        forbidden_actions: forbidden,
      };
    });

    return new Response(
      JSON.stringify({
        ok: true,
        no_writes: true,
        no_send: true,
        crm_ready: crmReady,
        outbound_configured: outboundReady,
        signals: {
          crm_interaction_ledger: crmLedger,
          crm_interaction_types: crmTypes,
          crm_interaction_source_adapters: crmAdapters,
          crm_lifecycle_stages: crmStages,
          crm_next_action_rules: crmRules,
          smartlead_inboxes: smartleadInboxes,
          email_queue: emailQueue,
        },
        agents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});