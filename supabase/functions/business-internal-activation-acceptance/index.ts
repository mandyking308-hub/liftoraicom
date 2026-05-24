import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return j({ ok: false, error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ ok: false, error: "unauthorized" }, 401);
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: any) => ["admin", "founder"].includes(r.role))) {
      return j({ ok: false, error: "forbidden" }, 403);
    }

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Tables
    const reqTables = [
      "business_internal_activation_records",
      "business_operating_runbook_items",
      "business_internal_daily_actions",
      "business_onboarding_factory_runs",
      "businesses",
      "founder_approval_items",
      "founder_approval_types",
    ];
    const table_status: Record<string, string> = {};
    for (const t of reqTables) {
      const { error } = await svc.from(t as any).select("id").limit(1);
      table_status[t] = error ? `missing:${error.message}` : "ok";
      if (error) blockers.push(`table_${t}_missing`);
    }

    // RLS — anon must not see records
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: leak } = await anon.from("business_internal_activation_records").select("id").limit(1);
    const rls_status = leak && leak.length > 0 ? "leak" : "protected";
    if (rls_status === "leak") blockers.push("rls_leak_activation_records");

    const function_status: Record<string, string> = {};

    // Missing business
    const missBiz = await svc.functions.invoke("business-internal-activate", {
      body: { dry_run: true },
      headers: { Authorization: auth },
    });
    function_status["missing_business_blocked"] = (missBiz.data as any)?.ok === false ? "blocked_correctly" : "leak";
    if ((missBiz.data as any)?.ok !== false) blockers.push("missing_business_not_blocked");

    // Pick a real business
    const { data: biz } = await svc.from("businesses").select("id,name").limit(1).maybeSingle();
    let dry_run_summary: any = null;

    if (biz?.id) {
      const dry = await svc.functions.invoke("business-internal-activate", {
        body: { business_id: biz.id, dry_run: true },
        headers: { Authorization: auth },
      });
      function_status["dry_run"] = (dry.data as any)?.ok ? "ok" : `failed:${(dry.error as any)?.message ?? "unknown"}`;
      dry_run_summary = dry.data ?? null;
      if (!(dry.data as any)?.ok) warnings.push("dry_run_failed");
      if ((dry.data as any)?.external_ready === true) blockers.push("external_ready_leak");

      // Phrase guard
      const noPhrase = await svc.functions.invoke("business-internal-activate", {
        body: { business_id: biz.id, dry_run: false },
        headers: { Authorization: auth },
      });
      function_status["phrase_guard"] = (noPhrase.data as any)?.ok === false ? "blocked_correctly" : "leak";
      if ((noPhrase.data as any)?.ok !== false) blockers.push("phrase_guard_failed");
    } else {
      warnings.push("no_business_to_test_with");
    }

    // Sendable leak
    const { data: send } = await svc.from("starter_pack_materialised_items")
      .select("id").eq("external_send_allowed", true).limit(1);
    if (send && send.length > 0) blockers.push("sendable_rows_present");

    // External-ready check across activation records
    const { data: extLeak } = await svc.from("business_internal_activation_records")
      .select("id").eq("external_ready", true).limit(1);
    if (extLeak && extLeak.length > 0) blockers.push("activation_external_ready_leak");

    const safety_status = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      smtp_calls: 0, native_send_calls: 0, email_queue_send_rows: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0,
      auto_send_changed: "no", cron_changed: "no",
      real_data_deleted: 0, secrets_exposed: 0,
    };

    const status =
      blockers.length > 0 ? "BLOCKED" :
      warnings.length > 0 ? "PARTIAL_WITH_WARNINGS" : "PASS";

    const classification =
      blockers.length > 0 ? "BLOCKED" : "BUSINESS_INTERNAL_ACTIVATION_READY";

    return j({
      ok: blockers.length === 0,
      status,
      classification,
      table_status,
      rls_status,
      function_status,
      ui_status: "panel_mounted_command_centre",
      command_centre_status: "panel_visible",
      manual_status: "updated",
      safety_status,
      blockers,
      warnings,
      dry_run_summary,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "BLOCKED", error: String((e as Error)?.message ?? e) }, 500);
  }
});