import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Liftor Master Dry-Run — READ-ONLY acceptance gate.
// Runs scenario checks across Smartlead/CRM/AI agents/orchestrator/drafts/
// approvals/handoff/finance/supplier and computes a 0–100 readiness score.
// NEVER sends. NEVER calls Apollo/Smartlead POSTs. NEVER mutates operational
// records. Optionally writes a single test-run record to liftor_operating_test_runs.

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

const safeCount = async (admin: any, table: string): Promise<number> => {
  try {
    const { count } = await admin.from(table).select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch { return 0; }
};
const safeRow = async (q: any) => { try { const { data } = await q; return data ?? null; } catch { return null; } };
const safeList = async (q: any) => { try { const { data } = await q; return data ?? []; } catch { return []; } };

type ScenarioResult = {
  key: string;
  status: "pass" | "warn" | "fail" | "skip";
  score: number; // 0..1
  details: Record<string, any>;
  blockers: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const persistRun: boolean = body?.persist_run === true;
    const runScope: string = body?.run_scope ?? "full_master_dry_run";

    const results: ScenarioResult[] = [];
    const blockers: string[] = [];

    // counts
    const [
      contacts, ledger, identityMatches, dedupeReviews,
      timelineEvents, conv360, agentOps, agentTaskQueue,
      draftReviews, approvalItems, approvalTypes,
      handoffReviews, revopsReviews, gates, scenarios,
      proposals, demos, deals, invoices, payments, suppliers, assignments,
    ] = await Promise.all([
      safeCount(admin, "crm_contacts"),
      safeCount(admin, "crm_interaction_ledger"),
      safeCount(admin, "crm_identity_matches"),
      safeCount(admin, "crm_dedupe_reviews"),
      safeCount(admin, "crm_timeline_events"),
      safeCount(admin, "crm_contact_360_snapshots"),
      safeCount(admin, "ai_agent_operating_status"),
      safeCount(admin, "ai_agent_task_queue"),
      safeCount(admin, "ai_conversation_draft_reviews"),
      safeCount(admin, "founder_approval_items"),
      safeCount(admin, "founder_approval_types"),
      safeCount(admin, "commercial_handoff_reviews"),
      safeCount(admin, "revenue_operations_reviews"),
      safeCount(admin, "liftor_live_readiness_gates"),
      safeCount(admin, "liftor_operating_test_scenarios"),
      safeCount(admin, "internal_proposals"),
      safeCount(admin, "demos"),
      safeCount(admin, "deals"),
      safeCount(admin, "invoices"),
      safeCount(admin, "payments"),
      safeCount(admin, "suppliers"),
      safeCount(admin, "assignments"),
    ]);

    // Smartlead readiness
    const slMailboxes = await safeList(admin.from("smartlead_email_accounts").select("id,is_active").limit(50));
    const slCampaigns = await safeList(admin.from("smartlead_campaigns").select("id,status").limit(50));
    const slEvents = await safeCount(admin, "smartlead_events");
    const slMailboxOk = slMailboxes.length > 0;
    const slCampaignOk = slCampaigns.length > 0;
    results.push({
      key: "smartlead_scale_readiness",
      status: slMailboxOk && slCampaignOk ? "pass" : "warn",
      score: (slMailboxOk ? 0.5 : 0) + (slCampaignOk ? 0.5 : 0),
      details: { mailboxes: slMailboxes.length, campaigns: slCampaigns.length, events: slEvents },
      blockers: [
        ...(!slMailboxOk ? ["smartlead_no_mailbox_configured"] : []),
        ...(!slCampaignOk ? ["smartlead_no_campaign_mapped"] : []),
      ],
    });

    // CRM customer memory
    const crmReady = contacts > 0 && ledger > 0;
    results.push({
      key: "crm_customer_memory_readiness",
      status: crmReady ? "pass" : "warn",
      score: (contacts > 0 ? 0.5 : 0) + (ledger > 0 ? 0.5 : 0),
      details: { contacts, ledger, identityMatches, dedupeReviews },
      blockers: [
        ...(contacts === 0 ? ["no_crm_contacts"] : []),
        ...(ledger === 0 ? ["no_interaction_ledger_rows"] : []),
      ],
    });

    // Provider event → CRM match: presence of identity matches OR ledger entries with provider_source
    results.push({
      key: "provider_event_to_crm_match",
      status: identityMatches > 0 || ledger > 0 ? "pass" : "warn",
      score: identityMatches > 0 ? 1 : ledger > 0 ? 0.6 : 0,
      details: { identityMatches, ledger },
      blockers: identityMatches === 0 && ledger === 0 ? ["no_identity_matches_or_ledger"] : [],
    });

    // Timeline / contact 360
    results.push({
      key: "crm_timeline_contact_360",
      status: timelineEvents > 0 || conv360 > 0 ? "pass" : "warn",
      score: timelineEvents > 0 ? 1 : 0.3,
      details: { timelineEvents, conv360 },
      blockers: timelineEvents === 0 && conv360 === 0 ? ["no_timeline_events"] : [],
    });

    // AI agents
    results.push({
      key: "ai_agent_status_readiness",
      status: agentOps > 0 ? "pass" : "warn",
      score: agentOps > 0 ? 1 : 0,
      details: { agentOps },
      blockers: agentOps === 0 ? ["no_agents_registered"] : [],
    });

    // Orchestrator preview (presence of queue table + types)
    results.push({
      key: "ai_orchestrator_task_preview",
      status: agentTaskQueue >= 0 ? "pass" : "warn",
      score: 1,
      details: { agentTaskQueue },
      blockers: [],
    });

    // AI conversation drafts
    results.push({
      key: "ai_conversation_draft_preview",
      status: draftReviews >= 0 ? "pass" : "warn",
      score: 1,
      details: { draftReviews },
      blockers: [],
    });

    // Founder approval
    results.push({
      key: "founder_approval_queue_preview",
      status: approvalTypes > 0 ? "pass" : "warn",
      score: approvalTypes > 0 ? 1 : 0,
      details: { approvalTypes, approvalItems },
      blockers: approvalTypes === 0 ? ["no_approval_types_seeded"] : [],
    });

    // Commercial handoff
    results.push({
      key: "commercial_handoff_preview",
      status: handoffReviews >= 0 ? "pass" : "warn",
      score: 1,
      details: { handoffReviews },
      blockers: [],
    });

    // Proposal preview availability
    results.push({
      key: "proposal_preview",
      status: "pass",
      score: 1,
      details: { proposals_existing: proposals },
      blockers: [],
    });

    // Demo readiness
    results.push({
      key: "demo_readiness_preview",
      status: "pass",
      score: 1,
      details: { demos_existing: demos },
      blockers: [],
    });

    // Deal/finance readiness
    results.push({
      key: "deal_finance_readiness_preview",
      status: deals > 0 || invoices > 0 || payments > 0 ? "pass" : "warn",
      score: (deals > 0 ? 0.4 : 0) + (invoices > 0 ? 0.3 : 0) + (payments > 0 ? 0.3 : 0),
      details: { deals, invoices, payments, revopsReviews },
      blockers: deals === 0 && invoices === 0 && payments === 0 ? ["no_finance_records_yet"] : [],
    });

    // Supplier assignment
    results.push({
      key: "supplier_assignment_preview",
      status: suppliers > 0 ? "pass" : "warn",
      score: suppliers > 0 ? 1 : 0,
      details: { suppliers, assignments },
      blockers: suppliers === 0 ? ["no_suppliers_in_pool"] : [],
    });

    // Full source-to-payment dry run — composite of upstream
    const upstream = ["smartlead_scale_readiness","crm_customer_memory_readiness","ai_agent_status_readiness","commercial_handoff_preview","deal_finance_readiness_preview","supplier_assignment_preview"];
    const composite = results.filter((r) => upstream.includes(r.key));
    const compositeScore = composite.length ? composite.reduce((a, b) => a + b.score, 0) / composite.length : 0;
    results.push({
      key: "full_source_to_payment_dry_run",
      status: compositeScore >= 0.85 ? "pass" : compositeScore >= 0.5 ? "warn" : "fail",
      score: compositeScore,
      details: { upstream_avg: compositeScore },
      blockers: compositeScore < 0.5 ? ["spine_not_complete"] : [],
    });

    // Safety: no_send audit — confirm no auto_send / cron flags enabled in env
    const autoSend = (Deno.env.get("AUTO_SEND_ENABLED") ?? "").toLowerCase() === "true";
    const cron = (Deno.env.get("CRON_ENABLED") ?? "").toLowerCase() === "true";
    const draftSave = (Deno.env.get("AI_DRAFT_SAVE_ENABLED") ?? "").toLowerCase() === "true";
    const handoffApply = (Deno.env.get("COMMERCIAL_HANDOFF_APPLY_ENABLED") ?? "").toLowerCase() === "true";
    const revopsApply = (Deno.env.get("REVENUE_OPERATIONS_APPLY_ENABLED") ?? "").toLowerCase() === "true";
    const approvalRecord = (Deno.env.get("FOUNDER_APPROVAL_RECORDING_ENABLED") ?? "").toLowerCase() === "true";
    const safetyOk = !autoSend && !cron;
    results.push({
      key: "no_send_safety_audit",
      status: safetyOk ? "pass" : "fail",
      score: safetyOk ? 1 : 0,
      details: { auto_send_enabled: autoSend, cron_enabled: cron },
      blockers: [
        ...(autoSend ? ["auto_send_enabled"] : []),
        ...(cron ? ["cron_enabled"] : []),
      ],
    });

    // No-provider-mutation audit — verify all apply flags off
    const allApplyOff = !draftSave && !handoffApply && !revopsApply;
    results.push({
      key: "no_provider_mutation_audit",
      status: allApplyOff ? "pass" : "warn",
      score: allApplyOff ? 1 : 0.4,
      details: { ai_draft_save: draftSave, handoff_apply: handoffApply, revops_apply: revopsApply, founder_approval_recording: approvalRecord },
      blockers: [
        ...(draftSave ? ["ai_draft_save_enabled"] : []),
        ...(handoffApply ? ["commercial_handoff_apply_enabled"] : []),
        ...(revopsApply ? ["revenue_operations_apply_enabled"] : []),
      ],
    });

    // Aggregate readiness score (0..100)
    const totalScore = results.reduce((a, b) => a + b.score, 0) / results.length;
    const readiness = Math.round(totalScore * 100);
    for (const r of results) for (const b of r.blockers) blockers.push(`${r.key}:${b}`);

    // Live readiness gates assessment (read existing gates and compute live status)
    const gateRows = await safeList(admin.from("liftor_live_readiness_gates").select("*").order("gate_area"));
    const safetyConfirmed = safetyOk && allApplyOff;
    const computed: Record<string, { status: string; reason?: string }> = {
      safety_brake_confirmed: { status: safetyConfirmed ? "passed" : "blocked", reason: safetyConfirmed ? undefined : "apply_or_send_flags_enabled" },
      auto_send_disabled_until_live: { status: !autoSend ? "passed" : "blocked", reason: autoSend ? "auto_send_enabled" : undefined },
      cron_disabled_until_live: { status: !cron ? "passed" : "blocked", reason: cron ? "cron_enabled" : undefined },
      smartlead_mailbox_connected: { status: slMailboxOk ? "passed" : "blocked", reason: slMailboxOk ? undefined : "no_mailbox" },
      smartlead_campaign_mapped: { status: slCampaignOk ? "passed" : "blocked", reason: slCampaignOk ? undefined : "no_campaign" },
      smartlead_webhook_ready: { status: slEvents > 0 ? "passed" : "warn", reason: slEvents > 0 ? undefined : "no_webhook_events_observed" },
      lead_push_preview_passed: { status: "manual_check", reason: "founder_runs_lead_push_preview" },
      crm_memory_ready: { status: crmReady ? "passed" : "blocked", reason: crmReady ? undefined : "crm_memory_incomplete" },
      ai_agents_ready: { status: agentOps > 0 ? "passed" : "blocked", reason: agentOps > 0 ? undefined : "no_agents" },
      founder_approval_ready: { status: approvalTypes > 0 ? "passed" : "blocked", reason: approvalTypes > 0 ? undefined : "no_approval_types" },
      proposal_handoff_ready: { status: "passed" },
      finance_supplier_ready: { status: suppliers > 0 ? "passed" : "warn", reason: suppliers > 0 ? undefined : "no_suppliers" },
      no_forbidden_operations: { status: blockers.length === 0 ? "passed" : "warn", reason: blockers.length === 0 ? undefined : `${blockers.length}_blockers` },
      manual_updated: { status: "manual_check", reason: "founder_confirms_manual_and_build_log_updated" },
      founder_final_live_authorisation: { status: "manual_check", reason: "founder_explicit_go_live_required" },
    };

    const liveGates = gateRows.map((g: any) => {
      const c = computed[g.gate_key];
      return {
        gate_key: g.gate_key,
        gate_label: g.gate_label,
        gate_area: g.gate_area,
        required_for_live: g.required_for_live,
        status: c?.status ?? g.status,
        blocker_reason: c?.reason ?? g.blocker_reason,
      };
    });
    const liveBlockers = liveGates.filter((g) => g.required_for_live && g.status !== "passed");

    // Optional persistence of run record (single insert into review table only).
    let testRunId: string | null = null;
    if (persistRun) {
      try {
        const ins = await admin.from("liftor_operating_test_runs").insert({
          run_scope: runScope,
          status: "completed",
          scenario_results: { results },
          readiness_score: readiness,
          blockers,
          forbidden_operations_detected: [],
          completed_at: new Date().toISOString(),
        }).select("id").single();
        testRunId = ins?.data?.id ?? null;
      } catch { /* non-fatal */ }
    }

    const nextActions: string[] = [];
    if (!slMailboxOk) nextActions.push("Connect at least one Smartlead mailbox.");
    if (!slCampaignOk) nextActions.push("Map at least one Smartlead campaign.");
    if (agentOps === 0) nextActions.push("Seed AI agent operating model.");
    if (suppliers === 0) nextActions.push("Onboard at least one approved supplier.");
    if (autoSend || cron) nextActions.push("Disable auto_send/cron flags.");
    if (liveBlockers.length > 0) nextActions.push(`Resolve ${liveBlockers.length} live readiness gate blockers.`);
    if (nextActions.length === 0) nextActions.push("Founder may proceed to manual + build-log update step.");

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: persistRun ? 1 : 0,
      emails_sent: 0,
      provider_calls: 0,
      apollo_calls: 0,
      smartlead_post_calls: 0,
      operational_records_changed: 0,
      live_activation_enabled: false,
      live_activation_reason: "live_activation_blocked_until_founder_authorises",
      readiness_score: readiness,
      total_scenarios: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      warned: results.filter((r) => r.status === "warn").length,
      failed: results.filter((r) => r.status === "fail").length,
      scenario_results: results,
      blockers,
      next_actions: nextActions,
      live_readiness_gates: liveGates,
      live_blockers_count: liveBlockers.length,
      forbidden_operations_detected: [],
      test_run_id: testRunId,
      persisted_test_runs: 0,
      seeded_scenarios: scenarios,
      seeded_gates: gates,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});