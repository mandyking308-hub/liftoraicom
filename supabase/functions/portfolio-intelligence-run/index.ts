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

    const body = await req.json().catch(() => ({}));
    const persist = body?.persist === true;

    const { data: businesses, error: bErr } = await admin.from("businesses").select("*").limit(200);
    if (bErr) throw bErr;

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const scores: any[] = [];
    const recs: any[] = [];

    for (const b of businesses || []) {
      const bid = b.id;
      const [contacts, recentInteractions, openApprovals, blockedFlag, paidInvoices, overdueInvoices, agentTasksPending, complaints] = await Promise.all([
        safeCount(admin, "crm_contacts", (q) => q.eq("business_id", bid)),
        safeCount(admin, "crm_interactions", (q) => q.eq("business_id", bid).gte("created_at", weekAgo)),
        safeCount(admin, "founder_approvals", (q) => q.eq("business_id", bid).eq("status", "pending")),
        Promise.resolve(b.status === "blocked" ? 1 : 0),
        safeCount(admin, "invoices", (q) => q.eq("business_id", bid).eq("status", "paid").gte("paid_at", monthAgo)),
        safeCount(admin, "invoices", (q) => q.eq("business_id", bid).neq("status", "paid").lt("due_date", new Date().toISOString())),
        safeCount(admin, "ai_agent_task_queue", (q) => q.eq("business_id", bid).eq("status", "pending")),
        safeCount(admin, "business_learning_signals", (q) => q.eq("business_id", bid).eq("signal_type", "complaint")),
      ]);

      const growth = clamp(recentInteractions * 4 + contacts * 0.5);
      const revenue = clamp(paidInvoices * 10 - overdueInvoices * 8);
      const risk = clamp(blockedFlag * 60 + overdueInvoices * 8 + complaints * 10);
      const attention = clamp(openApprovals * 12 + agentTasksPending * 3 + blockedFlag * 30);
      const readiness = clamp(100 - blockedFlag * 50 - openApprovals * 5);
      const opportunity = clamp(growth * 0.6 + revenue * 0.4);
      const overall = clamp(opportunity * 0.4 + attention * 0.3 + risk * 0.2 + (100 - readiness) * 0.1);

      let recommended_status: string | null = "monitor";
      let recommended_action: string | null = "Continue monitoring";
      const evidence: any[] = [
        { contacts, recentInteractions, openApprovals, paidInvoices, overdueInvoices, agentTasksPending, complaints, blocked: !!blockedFlag },
      ];

      if (blockedFlag) {
        recommended_status = "blocked";
        recommended_action = "Resolve blockers";
        recs.push({
          business_id: bid, recommendation_key: `fix_blocker_${bid}`,
          recommendation_title: `Fix blockers on ${b.name || "business"}`,
          recommendation_summary: "Business is currently marked blocked.",
          recommendation_type: "fix_blocker", priority_level: "high",
          confidence: 0.8, expected_impact: "high", evidence,
        });
      } else if (overdueInvoices > 0) {
        recommended_status = "needs_finance_review";
        recommended_action = "Resolve overdue invoices";
        recs.push({
          business_id: bid, recommendation_key: `review_finance_${bid}`,
          recommendation_title: `Review finance for ${b.name || "business"}`,
          recommendation_summary: `${overdueInvoices} overdue invoice(s).`,
          recommendation_type: "review_finance", priority_level: "high",
          confidence: 0.75, expected_impact: "medium", evidence,
        });
      } else if (opportunity >= 60 && risk < 30) {
        recommended_status = "scale_candidate";
        recommended_action = "Consider scaling";
        recs.push({
          business_id: bid, recommendation_key: `scale_${bid}`,
          recommendation_title: `Scale ${b.name || "business"}`,
          recommendation_summary: "Strong opportunity score with low risk.",
          recommendation_type: "scale", priority_level: "high",
          confidence: 0.65, expected_impact: "high", evidence,
        });
      } else if (recentInteractions === 0 && contacts > 10) {
        recommended_status = "needs_attention";
        recommended_action = "Re-engage existing contacts";
        recs.push({
          business_id: bid, recommendation_key: `launch_next_campaign_${bid}`,
          recommendation_title: `Launch next campaign on ${b.name || "business"}`,
          recommendation_summary: "Existing CRM is stale; consider next campaign.",
          recommendation_type: "launch_next_campaign", priority_level: "normal",
          confidence: 0.5, expected_impact: "medium", evidence,
        });
      } else if (contacts === 0 && agentTasksPending === 0) {
        recommended_status = "pause_candidate";
        recommended_action = "Consider pausing until activated";
        recs.push({
          business_id: bid, recommendation_key: `pause_${bid}`,
          recommendation_title: `Pause inactive business ${b.name || ""}`.trim(),
          recommendation_summary: "No CRM activity or pending tasks.",
          recommendation_type: "pause", priority_level: "low",
          confidence: 0.5, expected_impact: "low", evidence,
        });
      }

      if (openApprovals >= 3) {
        recs.push({
          business_id: bid, recommendation_key: `founder_attention_${bid}`,
          recommendation_title: `Founder attention required on ${b.name || "business"}`,
          recommendation_summary: `${openApprovals} pending approval(s).`,
          recommendation_type: "founder_attention_required",
          priority_level: "high", confidence: 0.7, expected_impact: "medium", evidence,
        });
      }

      scores.push({
        business_id: bid, score_date: today,
        growth_score: growth, revenue_score: revenue, risk_score: risk,
        attention_score: attention, readiness_score: readiness, opportunity_score: opportunity,
        overall_priority_score: overall, recommended_status, recommended_action,
        evidence, metadata: { name: b.name || null },
      });
    }

    let scoresSaved = 0;
    let recsSaved = 0;
    if (persist) {
      if (scores.length > 0) {
        const { data, error } = await admin
          .from("portfolio_intelligence_scores")
          .upsert(scores, { onConflict: "business_id,score_date" })
          .select("id");
        if (error) throw error;
        scoresSaved = data?.length || 0;
      }
      if (recs.length > 0) {
        const { data, error } = await admin
          .from("portfolio_strategy_recommendations")
          .insert(recs.map((r) => ({ ...r, founder_approval_required: true, status: "pending" })))
          .select("id");
        if (error) throw error;
        recsSaved = data?.length || 0;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      businesses_analysed: (businesses || []).length,
      scores_preview: scores.slice(0, 10),
      recommendations_preview: recs.slice(0, 20),
      scores_saved: scoresSaved,
      recommendations_saved: recsSaved,
      auto_apply: false,
      no_external_action: true,
      no_provider_call: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});