import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeCount(admin: any, table: string, filter?: (q: any) => any): Promise<number> {
  try {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

async function safeSelect(admin: any, table: string, builder: (q: any) => any) {
  try {
    const { data, error } = await builder(admin.from(table));
    if (error) return [];
    return data || [];
  } catch { return []; }
}

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ---- Global / portfolio
    const businesses = await safeSelect(admin, "businesses", (q: any) => q.select("id,name,status,execution_mode_id"));
    const businessesTotal = businesses.length;
    const activeBusinesses = businesses.filter((b: any) => (b.status || "").toLowerCase() === "active").length;
    const setupBusinesses = businesses.filter((b: any) => /setup|setting|onboard/i.test(b.status || "")).length;
    const blockedBusinesses = businesses.filter((b: any) => /block|paused|halt/i.test(b.status || "")).length;

    const portfolioScores = await safeSelect(admin, "portfolio_intelligence_scores", (q: any) => q.select("business_id,readiness_score,attention_score").order("created_at", { ascending: false }).limit(50));
    const portfolioReadiness = portfolioScores.length
      ? Math.round(portfolioScores.reduce((a: number, r: any) => a + (Number(r.readiness_score) || 0), 0) / portfolioScores.length)
      : null;

    const lastBrainSnap = await safeSelect(admin, "global_brain_status_snapshots", (q: any) => q.select("readiness_score,snapshot_data").order("created_at", { ascending: false }).limit(1));
    const globalBrainReadiness = lastBrainSnap[0]?.readiness_score ?? null;

    // ---- Neon Candy
    const neon = businesses.find((b: any) => /neon\s*candy/i.test(b.name || ""));
    const neonId = neon?.id ?? null;
    const neonInbox = neonId ? await safeSelect(admin, "inboxes", (q: any) => q.select("id,email,status").eq("business_id", neonId).limit(5)) : [];
    const integrations = await safeSelect(admin, "integrations", (q: any) => q.select("provider_name,provider_type,status,credentials_present,webhook_configured,warmup_status,from_email").limit(50));
    const smartlead = integrations.find((i: any) => i.provider_type === "smartlead");
    const smartleadReady = smartlead ? {
      api_connected: !!smartlead.credentials_present,
      mailbox_connected: true, // user-reported state
      campaign_present: false,
      mapping_present: false,
      webhook_configured: !!smartlead.webhook_configured,
      warmup_enabled: !!smartlead.warmup_status && smartlead.warmup_status !== "not_configured",
      status: smartlead.status,
    } : null;
    const ionosNative = { lane: "native_ionos", status: "SAFE_BLOCKED", auto_send_enabled: false, cron_enabled: false, worker: "fail-closed" };

    // ---- CRM
    const contactsTotal = await safeCount(admin, "contacts");
    const contactsLinked = await safeCount(admin, "contacts", (q: any) => q.not("assigned_business", "is", null));
    const interactionLedgerCount = await safeCount(admin, "crm_interaction_ledger").catch(() => 0);
    const founderReviewQueue = await safeCount(admin, "contacts", (q: any) => q.not("founder_review_requested_at", "is", null));
    const activeConversations = await safeCount(admin, "conversations", (q: any) => q.eq("status", "active")).catch(() => 0);
    const warmLeads = await safeCount(admin, "contacts", (q: any) => q.gte("intent_score", 60));

    // ---- Agents
    const aiAgents = await safeSelect(admin, "ai_agents", (q: any) => q.select("id,status").limit(200));
    const activeAgents = aiAgents.filter((a: any) => (a.status || "").toLowerCase() === "active").length;
    const blockedAgents = aiAgents.filter((a: any) => /block|fail|err/i.test(a.status || "")).length;
    const agentTasksPending = await safeCount(admin, "ai_agent_task_queue", (q: any) => q.in("status", ["pending", "queued", "in_progress"]));
    const aiDraftsPending = await safeCount(admin, "ai_drafts", (q: any) => q.in("status", ["pending_review", "draft"]));
    const handoversPending = await safeCount(admin, "agent_handover_log", (q: any) => q.in("status", ["pending", "open"]));
    const stewardships = await safeSelect(admin, "customer_stewardship_assignments", (q: any) => q.select("id,current_owner_agent_key,founder_review_required,stewardship_status").eq("stewardship_status", "active"));

    // ---- Approvals
    const approvalsPending = await safeCount(admin, "founder_approval_items", (q: any) => q.eq("status", "pending"));
    const approvalsApproved = await safeCount(admin, "founder_approval_items", (q: any) => q.eq("status", "approved"));
    const lockedExternalGates = await safeCount(admin, "autopilot_activation_gates", (q: any) => q.eq("activation_state", "locked"));
    const eligibleSafeGates = await safeCount(admin, "autopilot_activation_gates", (q: any) => q.in("activation_state", ["eligible", "ready"]));

    // ---- Customer journey
    const newReplies = await safeCount(admin, "ai_drafts", (q: any) => q.eq("status", "pending_review"));
    const proposalDrafts = await safeCount(admin, "internal_proposals", (q: any) => q.in("status", ["draft", "review"]));
    const openDeals = await safeCount(admin, "deals", (q: any) => q.not("status", "in", "(won,lost)"));
    const invoicesOutstanding = await safeCount(admin, "invoices", (q: any) => q.not("status", "in", "(paid,void)"));
    const supplierReviews = await safeCount(admin, "suppliers", (q: any) => q.in("status", ["review", "pending"])).catch(() => 0);

    // ---- Risks
    const complianceBlockers = await safeCount(admin, "compliance_events", (q: any) => q.eq("status", "blocker")).catch(() => 0);
    const jurisdictionQueue = await safeCount(admin, "jurisdiction_review_queue", (q: any) => q.eq("status", "pending")).catch(() => 0);
    const selfHealingFindings = await safeCount(admin, "self_healing_findings", (q: any) => q.in("status", ["open", "detected"]));
    const highRiskGatesLocked = await safeCount(admin, "autopilot_activation_gates", (q: any) => q.eq("activation_state", "locked").eq("risk_tier", "high"));

    // Readiness scoring
    const readiness_scores = {
      portfolio: portfolioReadiness ?? clamp(activeBusinesses ? 60 : 30),
      crm: clamp(contactsLinked > 0 ? 70 : 30 + (interactionLedgerCount > 0 ? 30 : 0)),
      agents: clamp(activeAgents > 0 ? 75 - blockedAgents * 5 : 30),
      approvals: clamp(approvalsPending === 0 ? 90 : Math.max(40, 90 - approvalsPending * 3)),
      outbound_smartlead: clamp(
        (smartleadReady?.api_connected ? 25 : 0) +
        (smartleadReady?.mailbox_connected ? 20 : 0) +
        (smartleadReady?.campaign_present ? 20 : 0) +
        (smartleadReady?.mapping_present ? 15 : 0) +
        (smartleadReady?.webhook_configured ? 10 : 0) +
        (smartleadReady?.warmup_enabled ? 10 : 0)
      ),
      outbound_native: 30, // SAFE_BLOCKED
      customer_journey: clamp(60 - newReplies * 2),
      revenue: clamp((openDeals + proposalDrafts) > 0 ? 65 : 35),
      risks: clamp(100 - (complianceBlockers * 10 + selfHealingFindings * 3 + highRiskGatesLocked * 0)),
      global_brain: globalBrainReadiness ?? 50,
    };
    const overallReadiness = Math.round(
      Object.values(readiness_scores).reduce((a, b) => a + (b as number), 0) / Object.values(readiness_scores).length
    );
    const overall_status =
      overallReadiness >= 80 ? "ready" :
      overallReadiness >= 55 ? "operating" :
      overallReadiness >= 35 ? "setup" : "blocked";

    // Top next action heuristic (internal-safe only)
    const blockers: string[] = [];
    if (smartleadReady && !smartleadReady.campaign_present) blockers.push("Smartlead campaign missing");
    if (smartleadReady && !smartleadReady.mapping_present) blockers.push("Smartlead mapping missing");
    if (smartleadReady && !smartleadReady.webhook_configured) blockers.push("Smartlead webhook not configured");
    if (smartleadReady && !smartleadReady.warmup_enabled) blockers.push("Smartlead warmup not enabled");
    if (interactionLedgerCount === 0) blockers.push("CRM interaction ledger empty (0 captured)");
    if (approvalsPending > 0) blockers.push(`${approvalsPending} founder approvals pending`);
    if (selfHealingFindings > 0) blockers.push(`${selfHealingFindings} self-healing findings open`);
    if (complianceBlockers > 0) blockers.push(`${complianceBlockers} compliance blockers`);

    const top_next_action =
      approvalsPending > 0 ? "Review founder approvals (internal, safe)" :
      newReplies > 0 ? "Review pending AI drafts (no auto-send)" :
      interactionLedgerCount === 0 ? "Run CRM interaction capture (read-only)" :
      smartleadReady && !smartleadReady.campaign_present ? "Create draft Smartlead campaign manually, then refresh" :
      "Run global brain status snapshot";

    const top_10_founder_actions = [
      { key: "global_brain", label: "Run global brain status snapshot", safe: true },
      { key: "approvals", label: `Review ${approvalsPending} founder approvals`, safe: true, count: approvalsPending },
      { key: "drafts", label: `Review ${aiDraftsPending} AI drafts`, safe: true, count: aiDraftsPending },
      { key: "stewardship", label: "Refresh customer stewardship", safe: true },
      { key: "handovers", label: `Resolve ${handoversPending} agent handovers`, safe: true, count: handoversPending },
      { key: "self_healing", label: `Inspect ${selfHealingFindings} self-healing findings`, safe: true, count: selfHealingFindings },
      { key: "portfolio", label: "Run portfolio intelligence", safe: true },
      { key: "ledger", label: "Review CRM interaction ledger", safe: true },
      { key: "compliance", label: `Resolve ${complianceBlockers} compliance blockers`, safe: true, count: complianceBlockers },
      { key: "smartlead_setup", label: "Smartlead: create draft campaign + enable warmup (manual)", safe: true },
    ];

    return new Response(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      overall_status,
      overall_readiness: overallReadiness,
      top_next_action,
      top_10_founder_actions,
      readiness_scores,
      blockers,
      global: { businessesTotal, activeBusinesses, setupBusinesses, blockedBusinesses, portfolioReadiness, globalBrainReadiness },
      neon_candy: { business_id: neonId, inbox: neonInbox[0] ?? null, smartlead: smartleadReady, native_ionos: ionosNative },
      crm: { contactsTotal, contactsLinked, interactionLedgerCount, founderReviewQueue, activeConversations, warmLeads },
      agents: { activeAgents, blockedAgents, agentTasksPending, aiDraftsPending, handoversPending, stewardships: stewardships.length },
      approvals: { approvalsPending, approvalsApproved, lockedExternalGates, eligibleSafeGates },
      outbound: {
        smartlead: smartleadReady,
        native_ionos: ionosNative,
        external_send_gates: { auto_send_enabled: false, cron_enabled: false, native_lane: "SAFE_BLOCKED" },
      },
      customer_journey: { newReplies, aiDraftsPending, proposalDrafts, openDeals, invoicesOutstanding, supplierReviews },
      revenue: { proposalDrafts, openDeals, invoicesOutstanding, supplierReviews },
      risks: { complianceBlockers, jurisdictionQueue, selfHealingFindings, highRiskGatesLocked },
      no_send_audit: { emails_sent: 0, providers_called: 0, smartlead_posts: 0, apollo_credits_spent: 0 },
      no_provider_mutation_audit: { mutations: 0, locked_external: highRiskGatesLocked },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});