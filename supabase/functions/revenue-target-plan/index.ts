import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAFE_PHRASE = "CREATE REVENUE TARGET PLAN";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const {
      business_id,
      target_name = "Monthly revenue target",
      target_type = "new_subscriptions",
      target_amount = 0,
      target_count = null,
      currency = "GBP",
      period_start,
      period_end,
      confirmation_phrase,
      dry_run = true,
    } = body ?? {};

    if (!business_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: "missing business_id / period_start / period_end" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Conservative placeholder assumptions (flagged when historical data missing)
    const assumptions = {
      avg_subscription_value: 49,
      avg_deal_value: 250,
      proposal_acceptance_rate: 0.25,
      demo_to_close_rate: 0.30,
      outreach_to_reply_rate: 0.05,
      reply_to_meeting_rate: 0.30,
      social_to_lead_rate: 0.01,
      assumed_conversion_rate: 0.02,
      historical_data_available: false,
    };

    const required_customers = target_count ?? Math.max(1, Math.ceil(Number(target_amount) / assumptions.avg_subscription_value));
    const required_proposals = Math.ceil(required_customers / assumptions.proposal_acceptance_rate);
    const required_demos = Math.ceil(required_proposals / assumptions.demo_to_close_rate);
    const required_followups = required_proposals * 3;
    const required_outreach_actions = Math.ceil(required_customers / assumptions.assumed_conversion_rate);
    const required_prospects = required_outreach_actions * 2;
    const required_social_actions = Math.max(8, Math.ceil(required_customers * 4));
    const required_upsells = Math.ceil(required_customers / 4);

    const recommended_agent_actions = [
      { agent: "prospecting_agent", action: `Build a list of ${required_prospects} qualified prospects (internal only)` },
      { agent: "outreach_agent", action: `Draft ${required_outreach_actions} outreach messages — gated, no send` },
      { agent: "social_agent", action: `Plan ${required_social_actions} content/social actions — drafts only` },
      { agent: "proposal_agent", action: `Draft ${required_proposals} proposals — internal only` },
      { agent: "demo_agent", action: `Schedule ${required_demos} demo slots — internal only` },
      { agent: "customer_success_agent", action: `Plan ${required_upsells} upsell touches with existing customers` },
      { agent: "winback_agent", action: `Identify churned customers worth re-engaging — drafts only` },
    ];

    const recommended_founder_actions = [
      "Confirm target & assumptions are realistic",
      "Approve outreach drafts before any external send",
      "Approve proposal templates and pricing",
      "Review pace twice weekly in Command Centre",
    ];

    const risk_flags: string[] = [];
    if (!assumptions.historical_data_available) risk_flags.push("Using conservative placeholder assumptions — accuracy improves once Liftor has 30+ days of history");
    if (required_prospects > 1000) risk_flags.push("Required prospect volume is high — consider lower target or stronger conversion");
    if (Number(target_amount) <= 0 && !target_count) risk_flags.push("Target amount/count is zero");

    const plan = {
      target_gap: Number(target_amount),
      required_customers,
      assumed_conversion_rate: assumptions.assumed_conversion_rate,
      required_prospects,
      required_outreach_actions,
      required_social_actions,
      required_followups,
      required_proposals,
      required_demos,
      required_upsells,
      assumptions,
      recommended_agent_actions,
      recommended_founder_actions,
      risk_flags,
    };

    if (dry_run || confirmation_phrase !== SAFE_PHRASE) {
      return new Response(JSON.stringify({
        dry_run: true,
        confirmation_phrase_required: SAFE_PHRASE,
        external_action_taken: false,
        target: { business_id, target_name, target_type, target_amount, target_count, currency, period_start, period_end },
        plan,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tgt, error: tErr } = await supabase
      .from("business_revenue_targets")
      .insert({ business_id, target_name, target_type, target_amount, target_count, currency, period_start, period_end })
      .select("*").single();
    if (tErr) throw tErr;

    const { data: planRow, error: pErr } = await supabase
      .from("revenue_target_activity_plans")
      .insert({ business_id, revenue_target_id: tgt.id, plan_status: "active", ...plan })
      .select("*").single();
    if (pErr) throw pErr;

    return new Response(JSON.stringify({
      dry_run: false,
      external_action_taken: false,
      target: tgt,
      plan: planRow,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});