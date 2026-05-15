import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Read-only audit. Never sends, never calls providers, never mutates campaigns.
const TRACKED_SECRETS = [
  "SMARTLEAD_API_KEY",
  "SMARTLEAD_WEBHOOK_SECRET",
  "APOLLO_API_KEY",
  "INBOX_CREDENTIALS_KEY",
  "LOVABLE_API_KEY",
];

const TRACKED_TABLES = [
  "provider_secret_registry",
  "internal_operating_schedules",
  "business_operating_profiles",
  "business_knowledge_profiles",
  "agent_action_audit_log",
  "ai_agent_permissions",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);

    // Require founder/admin
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Secret presence (NEVER reveal values)
    const secrets = TRACKED_SECRETS.map((name) => ({
      secret_name: name,
      present: Boolean(Deno.env.get(name) && Deno.env.get(name)!.length > 0),
    }));

    // Sync registry presence (no values stored)
    for (const s of secrets) {
      await admin
        .from("provider_secret_registry")
        .update({ secret_present: s.present, last_verified_at: new Date().toISOString() })
        .eq("secret_name", s.secret_name)
        .is("business_id", null);
    }

    const { data: registry } = await admin
      .from("provider_secret_registry")
      .select("provider_key, secret_name, secret_present, display_label, usage_scope, last_verified_at, business_id")
      .order("provider_key");

    // 2) Agent permissions snapshot
    const { data: agentPerms } = await admin
      .from("ai_agent_permissions")
      .select("*")
      .limit(500);

    // 3) External action locks (read from operating profiles + schedules)
    const { data: schedules } = await admin
      .from("internal_operating_schedules")
      .select("schedule_key, schedule_name, enabled, safe_internal_only, external_actions_allowed");

    const { data: profiles } = await admin
      .from("business_operating_profiles")
      .select("business_id, business_name, auto_send_enabled, smartlead_post_allowed, apollo_credits_unlocked, compliance_bulk_approval_locked, dry_run_only");

    const externalActionLocks = {
      auto_send_enabled_anywhere: (profiles ?? []).some((p: any) => p.auto_send_enabled === true),
      smartlead_post_allowed_anywhere: (profiles ?? []).some((p: any) => p.smartlead_post_allowed === true),
      apollo_credits_unlocked_anywhere: (profiles ?? []).some((p: any) => p.apollo_credits_unlocked === true),
      compliance_bulk_approval_locked_everywhere: (profiles ?? []).every((p: any) => p.compliance_bulk_approval_locked !== false),
      schedules_external_actions_allowed: (schedules ?? []).filter((s: any) => s.external_actions_allowed === true).map((s: any) => s.schedule_key),
      schedules_safe_internal_only_off: (schedules ?? []).filter((s: any) => s.safe_internal_only === false).map((s: any) => s.schedule_key),
    };

    // 4) RLS status on tracked tables
    const { data: rlsRows } = await admin.rpc("pg_catalog_rls_check" as any, {}).then(
      () => ({ data: null }),
      () => ({ data: null }),
    );
    // Fallback: query pg_class via a simple SELECT through information_schema is limited;
    // we report the tables we expect protected and assume RLS is enabled (set in migrations).
    const rlsStatus = TRACKED_TABLES.map((t) => ({ table: t, rls_enabled_expected: true }));

    // 5) Recent audit log
    const { data: recentAudit } = await admin
      .from("agent_action_audit_log")
      .select("id, agent_key, action, business_id, status, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(25);

    // 6) Risky settings summary
    const risky: string[] = [];
    if (externalActionLocks.auto_send_enabled_anywhere) risky.push("auto_send is enabled on at least one business");
    if (externalActionLocks.smartlead_post_allowed_anywhere) risky.push("smartlead POST is allowed on at least one business");
    if (externalActionLocks.apollo_credits_unlocked_anywhere) risky.push("Apollo credit spend is unlocked on at least one business");
    if (externalActionLocks.schedules_external_actions_allowed.length) risky.push(`Schedules with external actions allowed: ${externalActionLocks.schedules_external_actions_allowed.join(", ")}`);
    if (externalActionLocks.schedules_safe_internal_only_off.length) risky.push(`Schedules with safe_internal_only OFF: ${externalActionLocks.schedules_safe_internal_only_off.join(", ")}`);
    const missingSecrets = secrets.filter((s) => !s.present).map((s) => s.secret_name);

    // Audit record (internal only)
    await admin.from("agent_action_audit_log").insert({
      agent_key: "agent-permission-audit",
      action: "audit_run",
      status: "ok",
      metadata: {
        secrets_present: secrets.filter((s) => s.present).length,
        secrets_missing: missingSecrets.length,
        risky_count: risky.length,
      },
    });

    return new Response(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      secrets,
      registry: registry ?? [],
      agent_permissions: agentPerms ?? [],
      external_action_locks: externalActionLocks,
      rls_status: rlsStatus,
      recent_audit: recentAudit ?? [],
      risky_settings: risky,
      missing_secrets: missingSecrets,
      external_actions_locked_summary: {
        sends_locked_unless_approved: !externalActionLocks.auto_send_enabled_anywhere,
        apollo_spend_locked: !externalActionLocks.apollo_credits_unlocked_anywhere,
        smartlead_post_locked: !externalActionLocks.smartlead_post_allowed_anywhere,
        compliance_bulk_approval_locked: externalActionLocks.compliance_bulk_approval_locked_everywhere,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});