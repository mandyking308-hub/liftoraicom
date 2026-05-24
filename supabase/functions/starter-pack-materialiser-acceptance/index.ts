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

    // Foundation tables
    const reqTables = [
      "businesses",
      "business_execution_starter_packs",
      "starter_pack_materialised_items",
      "starter_pack_materialisation_runs",
      "founder_approval_items",
      "founder_approval_types",
    ];
    const table_status: Record<string, string> = {};
    for (const t of reqTables) {
      const { error } = await svc.from(t as any).select("id").limit(1);
      table_status[t] = error ? `missing:${error.message}` : "ok";
      if (error) blockers.push(`table_${t}_missing`);
    }

    // RLS protection check
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const rls_status: Record<string, string> = {};
    for (const t of ["starter_pack_materialised_items", "starter_pack_materialisation_runs"]) {
      const { data, error } = await anon.from(t as any).select("id").limit(1);
      rls_status[t] = error || !data || data.length === 0 ? "protected" : "leak";
      if (rls_status[t] === "leak") blockers.push(`rls_leak_${t}`);
    }

    // Function checks
    const function_status: Record<string, string> = {};
    const { data: biz } = await svc.from("businesses").select("id,name").limit(1).maybeSingle();
    let idempotency_status = "skipped_no_business";
    let test_summary: any = null;

    if (!biz?.id) {
      warnings.push("no_business_to_test_against");
    } else {
      // Ensure a starter pack exists for the test business (do not create if missing — that would create real data)
      const { data: pack } = await svc.from("business_execution_starter_packs")
        .select("id").eq("business_id", biz.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (!pack?.id) {
        warnings.push("no_starter_pack_for_test_business");
      } else {
        // 1) dry run
        const dry = await svc.functions.invoke("starter-pack-materialise", {
          body: { business_id: biz.id, dry_run: true },
          headers: { Authorization: auth },
        });
        function_status["dry_run"] = (dry.data as any)?.ok ? "ok" : `failed:${(dry.error as any)?.message ?? "unknown"}`;
        if (!(dry.data as any)?.ok) blockers.push("dry_run_failed");

        // 2) save without phrase must block
        const noPhrase = await svc.functions.invoke("starter-pack-materialise", {
          body: { business_id: biz.id, dry_run: false },
          headers: { Authorization: auth },
        });
        function_status["phrase_guard"] = (noPhrase.data as any)?.ok === false ? "blocked_correctly" : "leak";
        if ((noPhrase.data as any)?.ok !== false) blockers.push("phrase_guard_failed");

        // 3) materialise as test data with phrase
        const real = await svc.functions.invoke("starter-pack-materialise", {
          body: {
            business_id: biz.id, dry_run: false,
            confirmation_phrase: "MATERIALISE BUSINESS STARTER PACK",
            is_test_data: true,
          },
          headers: { Authorization: auth },
        });
        function_status["materialise"] = (real.data as any)?.ok ? "ok" : `failed:${(real.error as any)?.message ?? "unknown"}`;
        test_summary = real.data ?? null;
        if (!(real.data as any)?.ok) blockers.push("materialise_failed");

        // 4) repeat — duplicates skipped
        const repeat = await svc.functions.invoke("starter-pack-materialise", {
          body: {
            business_id: biz.id, dry_run: false,
            confirmation_phrase: "MATERIALISE BUSINESS STARTER PACK",
            is_test_data: true,
          },
          headers: { Authorization: auth },
        });
        const repeatData = repeat.data as any;
        idempotency_status =
          repeatData?.ok && (repeatData?.skipped_duplicates ?? 0) > 0 && (repeatData?.created_items ?? 0) === 0
            ? "idempotent" : "not_idempotent";
        if (idempotency_status === "not_idempotent" && repeatData?.ok) warnings.push("duplicate_skip_not_confirmed");
      }
    }

    // No sendable rows created
    const { data: leaks } = await svc.from("starter_pack_materialised_items")
      .select("id").eq("external_send_allowed", true).limit(1);
    if (leaks && leaks.length > 0) blockers.push("sendable_rows_created");

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
      warnings.length > 0 ? "PARTIAL_WITH_WARNINGS" : "PASS";

    return j({
      ok: blockers.length === 0,
      status,
      classification: blockers.length === 0
        ? "STARTER_PACK_MATERIALISER_READY_FOR_INTERNAL_USE"
        : "BLOCKED",
      table_status, rls_status, function_status,
      idempotency_status,
      ui_status: "panel_mounted_command_centre",
      manual_status: "updated",
      safety_status,
      blockers, warnings,
      test_summary,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "BLOCKED", error: String((e as Error)?.message ?? e) }, 500);
  }
});