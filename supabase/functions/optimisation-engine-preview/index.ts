import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Rec = {
  business_id: string | null;
  recommendation_type: string;
  title: string;
  summary: string;
  evidence: any[];
  recommended_change: Record<string, unknown>;
  confidence: number;
  impact_estimate: string;
  risk_level: "low" | "medium" | "high";
};

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
    const businessId: string | null = body?.business_id ?? null;

    let q = admin.from("business_learning_signals").select("*").order("captured_at", { ascending: false }).limit(2000);
    if (businessId) q = q.eq("business_id", businessId);
    const { data: signals, error } = await q;
    if (error) throw error;

    const list = signals || [];
    const count = (t: string) => list.filter((s: any) => s.signal_type === t).length;
    const byAgent: Record<string, { pos: number; neg: number }> = {};
    for (const s of list) {
      const k = s.agent_key || "unknown";
      byAgent[k] ||= { pos: 0, neg: 0 };
      if (s.positive_signal) byAgent[k].pos++;
      if (s.negative_signal) byAgent[k].neg++;
    }

    const recs: Rec[] = [];

    const replies = count("email_reply");
    const bounces = count("bounce");
    const unsubs = count("unsubscribe");
    if (bounces > Math.max(5, replies)) {
      recs.push({
        business_id: businessId,
        recommendation_type: "campaign_improvement",
        title: "Bounce rate exceeds reply rate — pause and clean list",
        summary: `Detected ${bounces} bounces vs ${replies} replies in recent signals.`,
        evidence: [{ bounces, replies }],
        recommended_change: { action: "pause_campaign", suggestion: "List hygiene + warmup review" },
        confidence: 0.7,
        impact_estimate: "high",
        risk_level: "high",
      });
    }
    if (unsubs > 0 && replies < unsubs * 2) {
      recs.push({
        business_id: businessId,
        recommendation_type: "subject_line_improvement",
        title: "Unsubscribes outpacing replies — revise subject and opener",
        summary: `${unsubs} unsubscribes vs ${replies} replies suggests messaging mismatch.`,
        evidence: [{ unsubs, replies }],
        recommended_change: { suggestion: "Test a softer, more specific subject line" },
        confidence: 0.55,
        impact_estimate: "medium",
        risk_level: "medium",
      });
    }

    const propViews = count("proposal_view");
    const propAccepts = count("proposal_accept");
    if (propViews >= 5 && propAccepts / Math.max(1, propViews) < 0.15) {
      recs.push({
        business_id: businessId,
        recommendation_type: "proposal_conversion_issue",
        title: "Low proposal acceptance rate",
        summary: `${propAccepts}/${propViews} proposals accepted (<15%).`,
        evidence: [{ propViews, propAccepts }],
        recommended_change: { suggestion: "Revisit pricing tiers and offer framing" },
        confidence: 0.6,
        impact_estimate: "high",
        risk_level: "medium",
      });
    }

    const won = count("deal_won");
    const lost = count("deal_lost");
    if (won + lost >= 5 && won / Math.max(1, won + lost) < 0.25) {
      recs.push({
        business_id: businessId,
        recommendation_type: "offer_improvement",
        title: "Win rate under 25% — review offer and qualification",
        summary: `${won} won vs ${lost} lost recent deals.`,
        evidence: [{ won, lost }],
        recommended_change: { suggestion: "Tighten ICP and add proof points to offer" },
        confidence: 0.65,
        impact_estimate: "high",
        risk_level: "medium",
      });
    }

    for (const [agent, c] of Object.entries(byAgent)) {
      const total = c.pos + c.neg;
      if (total >= 10 && c.neg / total > 0.5) {
        recs.push({
          business_id: businessId,
          recommendation_type: "agent_quality_issue",
          title: `Agent quality drift: ${agent}`,
          summary: `${c.neg}/${total} negative outcomes for ${agent}.`,
          evidence: [{ agent, ...c }],
          recommended_change: { suggestion: "Review prompts, examples, and approval thresholds" },
          confidence: 0.6,
          impact_estimate: "medium",
          risk_level: "medium",
        });
      }
    }

    if (count("supplier_delay") > count("supplier_success")) {
      recs.push({
        business_id: businessId,
        recommendation_type: "supplier_performance_issue",
        title: "Supplier delays exceed successes",
        summary: `Delays outpacing on-time delivery in recent window.`,
        evidence: [{ delays: count("supplier_delay"), success: count("supplier_success") }],
        recommended_change: { suggestion: "Trigger supplier review and backup sourcing" },
        confidence: 0.55,
        impact_estimate: "medium",
        risk_level: "medium",
      });
    }

    if (count("payment_received") === 0 && count("deal_won") > 2) {
      recs.push({
        business_id: businessId,
        recommendation_type: "revenue_bottleneck",
        title: "Deals won but no payments captured",
        summary: "Possible invoicing or finance pipeline gap.",
        evidence: [{ won: count("deal_won") }],
        recommended_change: { suggestion: "Audit finance handover from commercial agent" },
        confidence: 0.6,
        impact_estimate: "high",
        risk_level: "medium",
      });
    }

    if (count("high_value_opportunity") >= 3) {
      recs.push({
        business_id: businessId,
        recommendation_type: "business_to_scale",
        title: "High-value opportunities clustering — consider scale",
        summary: "Multiple high-value signals detected; founder review recommended.",
        evidence: [{ count: count("high_value_opportunity") }],
        recommended_change: { suggestion: "Increase capacity / approve scale plan" },
        confidence: 0.5,
        impact_estimate: "high",
        risk_level: "low",
      });
    }
    if (count("complaint") >= 3) {
      recs.push({
        business_id: businessId,
        recommendation_type: "business_to_pause",
        title: "Complaint cluster detected — consider pause",
        summary: "Multiple complaints suggest pausing outreach pending review.",
        evidence: [{ complaints: count("complaint") }],
        recommended_change: { suggestion: "Pause campaigns; founder + compliance review" },
        confidence: 0.7,
        impact_estimate: "high",
        risk_level: "high",
      });
    }

    let persisted = 0;
    if (persist && recs.length > 0) {
      const rows = recs.map((r) => ({ ...r, founder_approval_required: true, status: "pending" }));
      const { data, error: insErr } = await admin.from("optimisation_recommendations").insert(rows).select("id");
      if (insErr) throw insErr;
      persisted = data?.length || 0;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        signals_analysed: list.length,
        recommendations: recs,
        persisted_count: persisted,
        auto_apply: false,
        founder_approval_required: true,
        no_external_action: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});