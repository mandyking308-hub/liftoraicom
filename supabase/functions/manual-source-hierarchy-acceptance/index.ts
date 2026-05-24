import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIRED_LAYERS = [
  "command_centre_truth_sync",
  "full_technical_manual",
  "user_manual",
  "build_log",
  "business_manuals",
  "slim_mandy_manual",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const checks: Record<string, any> = {};
    const warnings: string[] = [];
    let pass = true;

    // Layer registry
    const { data: layers, error: lerr } = await admin
      .from("manual_source_layers")
      .select("layer_key, retrieval_priority, is_portable");
    if (lerr) {
      pass = false;
      warnings.push(`layer registry read error: ${lerr.message}`);
    }
    const presentKeys = new Set((layers ?? []).map((l: any) => l.layer_key));
    const missingLayers = REQUIRED_LAYERS.filter((k) => !presentKeys.has(k));
    checks.layers = {
      present: [...presentKeys],
      missing: missingLayers,
      slim_mandy_portable:
        (layers ?? []).find((l: any) => l.layer_key === "slim_mandy_manual")
          ?.is_portable === true,
    };
    if (missingLayers.length > 0) pass = false;

    // Manual pages exist (full technical manual content)
    const { count: manualPagesCount } = await admin
      .from("manual_pages")
      .select("id", { count: "exact", head: true });
    checks.full_technical_manual_pages = manualPagesCount ?? 0;
    if ((manualPagesCount ?? 0) === 0) {
      warnings.push("manual_pages is empty — full technical manual has no content");
    }

    // Build log exists
    const { count: buildLogCount } = await admin
      .from("build_log_entries")
      .select("id", { count: "exact", head: true });
    checks.build_log_entries = buildLogCount ?? 0;

    // Manual update drafts table reachable
    const { count: draftsCount, error: derr } = await admin
      .from("manual_update_drafts")
      .select("id", { count: "exact", head: true });
    if (derr) {
      pass = false;
      warnings.push(`manual_update_drafts unreachable: ${derr.message}`);
    }
    checks.update_drafts = draftsCount ?? 0;

    // Versioned summary
    const { count: versionsCount } = await admin
      .from("manual_versions")
      .select("id", { count: "exact", head: true });
    checks.manual_versions = versionsCount ?? 0;

    // Source priority order
    const sortedLayers = (layers ?? [])
      .sort((a: any, b: any) => a.retrieval_priority - b.retrieval_priority)
      .map((l: any) => l.layer_key);
    const expectedOrder = [
      "command_centre_truth_sync",
      "full_technical_manual",
      "user_manual",
      "build_log",
      "business_manuals",
      "slim_mandy_manual",
    ];
    checks.source_priority_order = sortedLayers;
    checks.priority_order_correct =
      JSON.stringify(sortedLayers) === JSON.stringify(expectedOrder);
    if (!checks.priority_order_correct) {
      warnings.push("source layer retrieval priority does not match expected order");
    }

    // No external action audit (constant — this function performs none)
    const noExternalAudit = {
      emails_sent: 0,
      dms_sent: 0,
      posts_published: 0,
      apollo_calls: 0,
      smartlead_post: 0,
      payment_mutations: 0,
      secrets_exposed: 0,
      data_deleted: 0,
      manuals_overwritten: 0,
    };

    return new Response(
      JSON.stringify({
        status: pass ? "PASS" : "PARTIAL_WITH_WARNINGS",
        external_go_live_status: "LOCKED_BY_DESIGN",
        checks,
        warnings,
        no_forbidden_action_audit: noExternalAudit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ status: "ERROR", error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});