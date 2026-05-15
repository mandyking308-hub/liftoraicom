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

    const body = await req.json().catch(() => ({}));
    const persist = body?.persist === true;

    const [
      businessesTotal,
      businessesActive,
      agentTasksPending,
      approvalsPending,
      gates,
      findings,
      portfolioScores,
      multilingualQueue,
      jurisdictionQueue,
      channelEvents,
      handovers,
      learningSignals,
      revenueRecs,
    ] = await Promise.all([
      safeCount(admin, "businesses"),
      safeCount(admin, "businesses", (q) => q.eq("status", "active")),
      safeCount(admin, "ai_agent_task_queue", (q) => q.eq("status", "pending")),
      safeCount(admin, "founder_approval_items", (q) => q.eq("status", "pending")),
      safeSelect(admin, "autopilot_activation_gates", (q) => q.select("*")),
      safeSelect(admin, "self_healing_findings", (q) => q.select("*").eq("repair_status", "open")),
      safeSelect(admin, "portfolio_intelligence_scores", (q) => q.select("business_id, overall_priority_score, recommended_action, evidence, created_at").order("created_at", { ascending: false }).limit(50)),
      safeSelect(admin, "multilingual_message_queue", (q) => q.select("id, language_code, status").eq("status", "needs_review").limit(20)),
      safeSelect(admin, "jurisdiction_action_check_log", (q) => q.select("id, jurisdiction_code, status").order("created_at", { ascending: false }).limit(20)),
      safeSelect(admin, "channel_events", (q) => q.select("channel_key, created_at").order("created_at", { ascending: false }).limit(100)),
      safeSelect(admin, "agent_handover_log", (q) => q.select("from_agent_key, to_agent_key, status, created_at").order("created_at", { ascending: false }).limit(20)),
      safeSelect(admin, "business_learning_signals", (q) => q.select("signal_type, weight, created_at").order("created_at", { ascending: false }).limit(50)),
      safeSelect(admin, "portfolio_strategy_recommendations", (q) => q.select("business_id, recommendation_type, priority_level, expected_impact, evidence").eq("status", "pending").order("created_at", { ascending: false }).limit(20)),
    ]);

    const gatesEnabled = (gates || []).filter((g: any) => g.enabled).length;
    const highRiskLocked = (gates || []).filter((g: any) => g.external_action && !g.enabled).length;

    // Markets/languages
    const markets = new Set<string>();
    const languages = new Set<string>();
    for (const j of jurisdictionQueue || []) if (j.jurisdiction_code) markets.add(j.jurisdiction_code);
    for (const m of multilingualQueue || []) if (m.language_code) languages.add(m.language_code);
    for (const c of channelEvents || []) { /* channels not market */ }

    // Agents active = unique from handovers + tasks recent
    const agentSet = new Set<string>();
    for (const h of handovers || []) { if (h.from_agent_key) agentSet.add(h.from_agent_key); if (h.to_agent_key) agentSet.add(h.to_agent_key); }

    // Top blockers: from open critical findings + blocked recommendations + open approvals
    const topBlockers: any[] = [];
    for (const f of (findings || []).slice(0, 5)) {
      topBlockers.push({ kind: "self_healing", severity: f.severity, summary: f.summary || f.rule_key, business_id: f.business_id || null });
    }
    for (const r of (revenueRecs || []).filter((r: any) => r.priority_level === "high" || r.priority_level === "critical").slice(0, 5)) {
      topBlockers.push({ kind: "portfolio_recommendation", priority: r.priority_level, summary: r.recommendation_type, business_id: r.business_id });
    }

    // Top opportunities: highest portfolio scores + scale recommendations
    const topOpportunities: any[] = [];
    for (const s of (portfolioScores || []).slice(0, 5)) {
      topOpportunities.push({ kind: "portfolio_score", business_id: s.business_id, score: s.overall_priority_score, recommended_action: s.recommended_action });
    }
    for (const r of (revenueRecs || []).filter((r: any) => /scale|launch|opportunity/i.test(r.recommendation_type)).slice(0, 5)) {
      topOpportunities.push({ kind: "scale_recommendation", business_id: r.business_id, expected_impact: r.expected_impact, summary: r.recommendation_type });
    }

    // Revenue signals aggregate
    const positiveSignals = (learningSignals || []).filter((s: any) => Number(s.weight || 0) > 0).length;
    const negativeSignals = (learningSignals || []).filter((s: any) => Number(s.weight || 0) < 0).length;

    const snapshot = {
      businesses_total: businessesTotal,
      businesses_active: businessesActive,
      markets_active: markets.size,
      languages_detected: languages.size,
      agents_active: agentSet.size,
      agent_tasks_pending: agentTasksPending,
      founder_approvals_pending: approvalsPending,
      autopilot_gates_enabled: gatesEnabled,
      high_risk_gates_locked: highRiskLocked,
      open_self_healing_findings: (findings || []).length,
      revenue_signals: {
        positive: positiveSignals,
        negative: negativeSignals,
        pending_recommendations: (revenueRecs || []).length,
      },
      top_blockers: topBlockers,
      top_opportunities: topOpportunities,
      metadata: {
        channel_events_recent: (channelEvents || []).length,
        handovers_recent: (handovers || []).length,
        multilingual_review: (multilingualQueue || []).length,
        jurisdiction_review: (jurisdictionQueue || []).length,
        generated_by: user.id,
      },
    };

    let snapshot_id: string | null = null;
    if (persist) {
      const { data: ins, error: insErr } = await admin.from("global_brain_status_snapshots").insert(snapshot).select().single();
      if (insErr) throw insErr;
      snapshot_id = ins.id;
    }

    // Next best action heuristic
    let next_best_action = "All systems calm — review portfolio opportunities.";
    if ((findings || []).some((f: any) => f.severity === "critical")) next_best_action = "Resolve critical self-healing findings.";
    else if (approvalsPending > 0) next_best_action = `Review ${approvalsPending} pending founder approval(s).`;
    else if ((multilingualQueue || []).length > 0) next_best_action = "Review multilingual queue items needing translation review.";
    else if (topOpportunities.length > 0) next_best_action = "Promote top portfolio opportunity for scale review.";

    return new Response(JSON.stringify({ ok: true, snapshot_id, snapshot, next_best_action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});