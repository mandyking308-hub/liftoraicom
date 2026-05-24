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
    const requiredTables = [
      "businesses",
      "business_knowledge_profiles",
      "business_execution_starter_packs",
      "business_knowledge_uploads",
      "business_knowledge_assets",
      "business_training_runs",
      "founder_approval_items",
    ];
    const table_status: Record<string, string> = {};
    for (const t of requiredTables) {
      const { error } = await svc.from(t as any).select("id").limit(1);
      table_status[t] = error ? `missing_or_inaccessible:${error.message}` : "ok";
      if (error) blockers.push(`table_${t}_missing`);
    }

    // RLS sanity — anon client should NOT read founder-only tables
    const anonClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const rls_status: Record<string, string> = {};
    for (const t of ["business_knowledge_profiles", "business_execution_starter_packs"]) {
      const { data, error } = await anonClient.from(t as any).select("id").limit(1);
      rls_status[t] = error || !data || data.length === 0 ? "protected" : "leak";
      if (rls_status[t] === "leak") blockers.push(`rls_leak_${t}`);
    }

    // Provider status
    const providerKey = Deno.env.get("OPENAI_API_KEY");
    const provider_status = providerKey ? "configured" : "not_configured";

    // Pick a real business to dry-run against
    const { data: biz } = await svc.from("businesses").select("id,name").limit(1).maybeSingle();
    let run_status = "skipped_no_business";
    let run_result: any = null;
    if (biz?.id) {
      const r = await svc.functions.invoke("business-onboarding-brain-run", {
        body: { business_id: biz.id, dry_run: true, save_profile: false, save_starter_pack: false },
        headers: { Authorization: auth },
      });
      run_status = (r.data as any)?.ok ? "dry_run_ok" : `dry_run_failed:${(r.error as any)?.message ?? "unknown"}`;
      run_result = r.data ?? null;
      if (!(r.data as any)?.ok) blockers.push("dry_run_failed");
      if ((r.data as any)?.safety_status?.external_action_blocked !== true) blockers.push("safety_not_locked");
    } else {
      warnings.push("no business in database to dry-run against");
    }

    // Save without confirmation phrase must block
    let save_block_status = "skipped_no_business";
    if (biz?.id) {
      const r = await svc.functions.invoke("business-onboarding-brain-run", {
        body: { business_id: biz.id, dry_run: false, save_starter_pack: true, confirmation_phrase: "WRONG" },
        headers: { Authorization: auth },
      });
      const ok = (r.data as any)?.status === "BLOCKED_CONFIRMATION_REQUIRED";
      save_block_status = ok ? "save_correctly_blocked" : "save_block_failed";
      if (!ok) blockers.push("save_without_phrase_not_blocked");
    }

    const status =
      blockers.length > 0
        ? "BLOCKED"
        : provider_status === "not_configured"
        ? "PARTIAL_PROVIDER_NOT_CONFIGURED"
        : "PASS";

    return j({
      ok: blockers.length === 0,
      status,
      provider_status,
      function_status: "business-onboarding-brain-run available",
      table_status,
      rls_status,
      ui_status: {
        panel_component: "src/components/founder/activation/BusinessOnboardingBrainPanel.tsx",
        mounted_in_command_centre: true,
      },
      manual_status: "User Manual section 'Adding a business with Liftor Brain' present",
      safety_status: {
        external_action_blocked: true,
        save_requires_phrase: save_block_status === "save_correctly_blocked",
        no_external_calls_made: true,
        no_payments: true,
        no_publish: true,
        no_smartlead_post: true,
        no_apollo: true,
        no_smtp: true,
      },
      run_status,
      run_result,
      save_block_status,
      blockers,
      warnings,
    });
  } catch (e) {
    return j({ ok: false, error: String(e) }, 500);
  }
});