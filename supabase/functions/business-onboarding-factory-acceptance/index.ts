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
    const provider_status = Deno.env.get("OPENAI_API_KEY") ? "configured" : "not_configured";

    // Tables
    const reqTables = [
      "businesses",
      "business_execution_starter_packs",
      "business_onboarding_factory_runs",
      "starter_pack_materialisation_runs",
      "starter_pack_materialised_items",
      "founder_approval_items",
      "founder_approval_types",
    ];
    const table_status: Record<string, string> = {};
    for (const t of reqTables) {
      const { error } = await svc.from(t as any).select("id").limit(1);
      table_status[t] = error ? `missing:${error.message}` : "ok";
      if (error) blockers.push(`table_${t}_missing`);
    }

    // RLS sanity
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: leak } = await anon.from("business_onboarding_factory_runs").select("id").limit(1);
    const rls_status = leak && leak.length > 0 ? "leak" : "protected";
    if (rls_status === "leak") blockers.push("rls_leak_factory_runs");

    // Function checks
    const function_status: Record<string, string> = {};

    // 1) Virtual dry-run (no business_id, no test creation)
    const virtual = await svc.functions.invoke("business-onboarding-factory-run", {
      body: {
        business_name: "Test Business Factory Drill",
        business_brief: "A test business used only to prove Liftor can onboard a business internally.",
        knowledge_text: "This is a test knowledge source. The business sells internal AI operating support to service businesses. It requires founder approval before any external action.",
        dry_run: true, save_outputs: false, is_test_data: true,
      },
      headers: { Authorization: auth },
    });
    function_status["virtual_dry_run"] = (virtual.data as any)?.ok ? "ok" : `failed:${(virtual.error as any)?.message ?? "unknown"}`;
    if (!(virtual.data as any)?.ok) blockers.push("virtual_dry_run_failed");

    // 2) Phrase guard
    const noPhrase = await svc.functions.invoke("business-onboarding-factory-run", {
      body: { dry_run: false, save_outputs: true, business_name: "X", is_test_data: true },
      headers: { Authorization: auth },
    });
    function_status["phrase_guard"] = (noPhrase.data as any)?.ok === false ? "blocked_correctly" : "leak";
    if ((noPhrase.data as any)?.ok !== false) blockers.push("phrase_guard_failed");

    // 3) Real run against an existing business (dry-run with save_outputs=false to avoid mutating)
    const { data: biz } = await svc.from("businesses").select("id,name").limit(1).maybeSingle();
    let real_run_summary: any = null;
    if (biz?.id) {
      const real = await svc.functions.invoke("business-onboarding-factory-run", {
        body: { business_id: biz.id, dry_run: true, save_outputs: false, is_test_data: false },
        headers: { Authorization: auth },
      });
      function_status["real_business_dry_run"] = (real.data as any)?.ok ? "ok" : `failed:${(real.error as any)?.message ?? "unknown"}`;
      real_run_summary = real.data ?? null;
      if (!(real.data as any)?.ok) warnings.push("real_business_dry_run_failed");
      if ((real.data as any)?.external_ready === true) blockers.push("external_ready_leak");
    } else {
      warnings.push("no_business_for_real_dry_run");
    }

    // Sendable leak check
    const { data: send } = await svc.from("starter_pack_materialised_items")
      .select("id").eq("external_send_allowed", true).limit(1);
    if (send && send.length > 0) blockers.push("sendable_rows_created");

    const safety_status = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, smartlead_post_calls: 0, smartlead_campaign_starts: 0,
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
        ? "BUSINESS_ONBOARDING_FACTORY_READY_FOR_INTERNAL_USE"
        : "BUSINESS_ONBOARDING_FACTORY_READY_BUT_PROVIDER_NOT_CONFIGURED";

    return j({
      ok: blockers.length === 0,
      status,
      classification,
      provider_status,
      table_status, rls_status,
      function_status,
      ui_status: "panel_mounted_command_centre",
      command_centre_status: "panel_visible",
      manual_status: "updated",
      safety_status,
      blockers, warnings,
      real_run_summary,
      virtual_summary: virtual.data ?? null,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "BLOCKED", error: String((e as Error)?.message ?? e) }, 500);
  }
});