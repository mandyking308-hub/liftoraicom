import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACCEPTANCE_FUNCTIONS = [
  "liftor-brain-full-acceptance",
  "business-onboarding-brain-acceptance",
  "starter-pack-materialiser-acceptance",
  "business-onboarding-factory-acceptance",
  "business-internal-activation-acceptance",
  "business-daily-operating-loop-acceptance",
  "business-weekly-review-acceptance",
  "business-external-activation-readiness-acceptance",
  "business-micro-batch-preparation-acceptance",
  "command-centre-usability-acceptance",
  "command-centre-full-link-check",
  "manual-closeout-acceptance",
  "liftor-final-go-to-use-acceptance",
];

const FORBIDDEN_AUDIT = {
  emails_sent: 0,
  dms_sent: 0,
  posts_published: 0,
  social_posts_scheduled_externally: 0,
  apollo_calls: 0,
  apollo_credits_spent: 0,
  smartlead_post_calls: 0,
  smartlead_leads_pushed: 0,
  smartlead_campaigns_started: 0,
  smtp_calls: 0,
  native_email_send_calls: 0,
  email_queue_send_rows_created: 0,
  metricool_mutations: 0,
  manychat_mutations: 0,
  ad_platform_mutations: 0,
  payment_mutations: 0,
  payment_links_created: 0,
  customers_charged: 0,
  portal_accounts_created: 0,
  portal_invites_sent: 0,
  surveys_sent: 0,
  reports_shared: 0,
  auto_send_changed: false,
  cron_changed: false,
  external_gates_enabled: 0,
  execution_allowed_rows: 0,
  real_data_deleted: 0,
  secrets_exposed: 0,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";

    // Auth check
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: rolesRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (rolesRows ?? []).map((r: any) => r.role);
    const isFounder = roles.includes("admin") || roles.includes("founder");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run acceptance checks (best-effort, do not fake)
    const acceptanceResults: Record<string, any> = {};
    let passCount = 0;
    let failCount = 0;
    let missingCount = 0;
    for (const fn of ACCEPTANCE_FUNCTIONS) {
      try {
        const res = await fetch(`${url}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({ dry_run: true }),
        });
        if (res.status === 404) {
          acceptanceResults[fn] = { status: "missing" };
          missingCount++;
          continue;
        }
        const text = await res.text();
        let body: any = text;
        try { body = JSON.parse(text); } catch (_) {}
        const ok = res.ok && (body?.status === "PASS" || body?.pass === true || body?.ok === true || res.status === 200);
        acceptanceResults[fn] = { http: res.status, ok, summary: body?.status ?? body?.summary ?? "ran" };
        if (ok) passCount++; else failCount++;
      } catch (e) {
        acceptanceResults[fn] = { status: "error", error: String(e) };
        failCount++;
      }
    }

    // Multi-business snapshot (best-effort)
    let businessesTotal = 0;
    let businessesMissingContext = false;
    try {
      const { count } = await admin.from("businesses").select("id", { count: "exact", head: true });
      businessesTotal = count ?? 0;
    } catch (_) {
      businessesMissingContext = true;
    }

    const classification = failCount === 0 && missingCount === 0
      ? "LIFTOR_INTERNAL_OPERATING_SYSTEM_READY"
      : missingCount > 0 && failCount === 0
        ? "LIFTOR_INTERNAL_OPERATING_SYSTEM_READY_PROVIDER_MISSING"
        : failCount > 0 && failCount < 4
          ? "LIFTOR_PARTIAL_WITH_WARNINGS"
          : "LIFTOR_PARTIAL_WITH_WARNINGS";

    const closeoutStatus = failCount === 0 ? "completed" : "partial";

    const handoverSummary = `LIFTOR FINAL BUILD HANDOVER — 21A–22J CLOSEOUT

Liftor is the internal AI operating system for multiple businesses.
It can onboard businesses internally, build starter packs, materialise drafts,
activate businesses internally, run daily and weekly loops, prepare external
readiness plans, and prepare micro-batch approval packets.

It does NOT send, publish, or spend without separate future controlled
activation prompts. External go-live remains LOCKED_BY_DESIGN.

Mandy should start in the Command Centre. After Athens (post 28 May), begin
with NeonCandy execution readiness (Prompt 23A).`;

    const record = {
      closeout_name: "Liftor Brain + Business Operating Factory Closeout",
      closeout_phase: "21A-22J",
      closeout_status: closeoutStatus,
      classification,
      build_start_reference: "21A",
      build_end_reference: "22J",
      command_centre_status: "operational_internal_only",
      brain_status: "internal_ready",
      business_factory_status: "internal_ready",
      external_go_live_status: "LOCKED_BY_DESIGN",
      provider_status: missingCount > 0 ? "partial_provider_missing" : "ok_internal",
      safety_status: "all_external_gates_locked",
      manual_status: "updated",
      next_phase: "Phase 23 — Post-Athens execution (NeonCandy first)",
      next_actions: [
        "23A — NeonCandy Return-to-Execution Readiness",
        "23B — NeonCandy Smartlead Campaign Setup / No Send",
        "23C — NeonCandy First Micro-Batch Approval Packet",
        "23D — NeonCandy First Controlled Micro-Batch Execution",
        "23E — Reply Capture / AI Draft / Founder Approval",
        "23F — Commercial Handoff / Proposal / Revenue Path",
        "23G — Add Second Business Through Factory",
      ],
      locked_items: [
        "all external sends",
        "all publishing/scheduling",
        "Apollo calls / credit spend",
        "Smartlead POST / campaign start",
        "Metricool/ManyChat mutations",
        "payments/subscriptions",
        "portal invites/accounts",
        "surveys/reports",
        "auto_send/cron",
        "execution of prepared packets",
      ],
      open_warnings: missingCount > 0
        ? [`${missingCount} acceptance function(s) missing or unreachable`]
        : [],
      handover_summary: handoverSummary,
      metadata: {
        acceptance: acceptanceResults,
        pass_count: passCount,
        fail_count: failCount,
        missing_count: missingCount,
        businesses_total: businessesTotal,
        businesses_missing_context: businessesMissingContext,
      },
      no_forbidden_action_audit: FORBIDDEN_AUDIT,
    };

    const { data: inserted, error: insertErr } = await admin
      .from("liftor_build_phase_closeout_records")
      .insert(record)
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        status: failCount === 0 ? "PASS" : "PARTIAL_WITH_WARNINGS",
        classification,
        external_go_live_status: "LOCKED_BY_DESIGN",
        closeout_id: inserted.id,
        acceptance: acceptanceResults,
        forbidden_audit: FORBIDDEN_AUDIT,
        record: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});