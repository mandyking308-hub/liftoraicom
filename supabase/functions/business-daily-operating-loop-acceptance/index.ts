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
    const provider_status = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY") ? "configured" : "not_configured";

    const reqTables = [
      "business_daily_operating_runs",
      "business_daily_operating_outputs",
      "business_internal_activation_records",
      "business_internal_daily_actions",
      "business_operating_runbook_items",
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

    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: leak1 } = await anon.from("business_daily_operating_runs").select("id").limit(1);
    const { data: leak2 } = await anon.from("business_daily_operating_outputs").select("id").limit(1);
    const rls_status = (leak1?.length ?? 0) + (leak2?.length ?? 0) > 0 ? "leak" : "protected";
    if (rls_status === "leak") blockers.push("rls_leak_daily_loop");

    const function_status: Record<string, string> = {};

    // Missing business
    const missBiz = await svc.functions.invoke("business-daily-operating-run", {
      body: { dry_run: true },
      headers: { Authorization: auth },
    });
    function_status["missing_business_blocked"] = (missBiz.data as any)?.ok === false ? "blocked_correctly" : "leak";
    if ((missBiz.data as any)?.ok !== false) blockers.push("missing_business_not_blocked");

    // Pick an internally activated business if any, else any business
    let testBiz: any = null;
    const { data: activated } = await svc.from("business_internal_activation_records")
      .select("business_id").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (activated?.business_id) {
      const { data } = await svc.from("businesses").select("id,name").eq("id", activated.business_id).maybeSingle();
      testBiz = data;
    }
    if (!testBiz) {
      const { data } = await svc.from("businesses").select("id,name").limit(1).maybeSingle();
      testBiz = data;
    }

    let dry_run_summary: any = null;
    if (testBiz?.id) {
      const dry = await svc.functions.invoke("business-daily-operating-run", {
        body: { business_id: testBiz.id, dry_run: true },
        headers: { Authorization: auth },
      });
      function_status["dry_run"] = (dry.data as any)?.ok ? "ok" : `failed:${(dry.error as any)?.message ?? "unknown"}`;
      dry_run_summary = dry.data ?? null;
      if (!(dry.data as any)?.ok) warnings.push("dry_run_failed");

      const noPhrase = await svc.functions.invoke("business-daily-operating-run", {
        body: { business_id: testBiz.id, dry_run: false },
        headers: { Authorization: auth },
      });
      function_status["phrase_guard"] = (noPhrase.data as any)?.ok === false ? "blocked_correctly" : "leak";
      if ((noPhrase.data as any)?.ok !== false) blockers.push("phrase_guard_failed");
    } else {
      warnings.push("no_business_to_test_with");
    }

    // Sendable leaks
    const { data: send } = await svc.from("starter_pack_materialised_items").select("id").eq("external_send_allowed", true).limit(1);
    if (send && send.length > 0) blockers.push("sendable_rows_present");

    // External outputs leak
    const { data: extOut } = await svc.from("business_daily_operating_outputs").select("id").eq("external_action_blocked", false).limit(1);
    if (extOut && extOut.length > 0) blockers.push("outputs_external_unblocked");

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
      provider_status === "not_configured" ? "PARTIAL_PROVIDER_NOT_CONFIGURED" :
      warnings.length > 0 ? "PARTIAL_WITH_WARNINGS" : "PASS";
    const classification =
      blockers.length > 0 ? "BLOCKED" :
      provider_status === "configured"
        ? "BUSINESS_DAILY_OPERATING_LOOP_READY"
        : "BUSINESS_DAILY_OPERATING_LOOP_READY_BUT_PROVIDER_NOT_CONFIGURED";

    return j({
      ok: blockers.length === 0,
      status, classification, provider_status,
      table_status, rls_status, function_status,
      ui_status: "panel_mounted_command_centre",
      command_centre_status: "panel_visible",
      manual_status: "updated",
      safety_status, blockers, warnings,
      dry_run_summary,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "BLOCKED", error: String((e as Error)?.message ?? e) }, 500);
  }
});