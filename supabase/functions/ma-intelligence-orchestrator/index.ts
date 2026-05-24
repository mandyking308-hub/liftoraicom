import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MODEL = "google/gemini-2.5-pro";

const SYSTEM_PRINCIPLES = `You are the Liftor Portfolio & Exit Intelligence Orchestrator.
You reason across portfolio assets, buyer/investor signals, competitors, valuation benchmarks, execution targets, data-room readiness and jurisdiction notes.

HARD RULES (never break):
1. You can recommend actions but you CANNOT send external messages. Founder approval is required for any buyer outreach, investor contact, external email, or legal/tax-sensitive decision.
2. You can draft warm-up messaging but must mark drafts as "requires founder approval".
3. You can flag legal/tax/entity issues but must NEVER state a legal/tax conclusion. Recommend "adviser_review" instead.
4. Always include a confidence score (0-100) and cite which records support each claim (by table + id).
5. If supporting evidence is weak (few/no signals, missing data), say so explicitly and lower confidence.
6. NEVER encourage copying competitor code, branding, protected wording, customer lists, trade dress or confidential material. Use the principle: "Adopt the market signal, do not copy protected assets."
7. Flag paid-source / licence_status=do_not_store records as restricted.
8. Mark any recommendation as requiring human approval if risk is medium or high.
9. You are not omniscient. State which data is missing that would improve the recommendation.

Output ONLY valid JSON matching the requested schema. No prose outside the JSON.`;

type Mode =
  | "portfolio_briefing"
  | "asset_analysis"
  | "build_memo"
  | "generate_recommendations";

async function callAI(
  prompt: string,
  schema: Record<string, unknown>,
  toolName: string,
) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PRINCIPLES },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: { name: toolName, description: "Return structured analysis", parameters: schema },
      }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (res.status === 429) {
    throw new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (res.status === 402) {
    throw new Response(JSON.stringify({ error: "AI credits exhausted. Add credits at Settings → Workspace → Usage." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!res.ok) {
    const text = await res.text();
    console.error("AI gateway error", res.status, text);
    throw new Response(JSON.stringify({ error: "AI gateway failure" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool_call returned");
  return JSON.parse(call.function.arguments);
}

// ============ SCHEMAS ============

const portfolioSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-3 sentence executive overview" },
    strongest_asset: { type: "object", properties: { asset_id: { type: "string" }, name: { type: "string" }, reason: { type: "string" } } },
    weakest_asset: { type: "object", properties: { asset_id: { type: "string" }, name: { type: "string" }, reason: { type: "string" } } },
    highest_exit_potential: { type: "object", properties: { asset_id: { type: "string" }, name: { type: "string" }, reason: { type: "string" } } },
    most_urgent_data_room_gap: { type: "string" },
    strongest_buyer_signal: { type: "string" },
    strongest_investor_signal: { type: "string" },
    biggest_execution_gap: { type: "string" },
    highest_legal_ip_risk: { type: "string" },
    next_7_day_actions: { type: "array", items: { type: "string" } },
    next_30_day_actions: { type: "array", items: { type: "string" } },
    intelligence_gaps: { type: "array", items: { type: "string" }, description: "Missing data that would improve confidence" },
    confidence_score: { type: "integer", minimum: 0, maximum: 100 },
    evidence_strength: { type: "string", enum: ["weak", "moderate", "strong"] },
  },
  required: ["summary","next_7_day_actions","next_30_day_actions","intelligence_gaps","confidence_score","evidence_strength"],
};

const assetSchema = {
  type: "object",
  properties: {
    becoming: { type: "string", description: "What is this business trying to become" },
    likely_buyer_universe: { type: "string" },
    exit_readiness_position: { type: "string" },
    biggest_blocker_to_value: { type: "string" },
    next_targets: { type: "array", items: { type: "string" } },
    agents_actions_this_month: { type: "array", items: { type: "string" } },
    recommended_decision: { type: "string", enum: ["scale","iterate","park","warm_buyers","sell","kill","adviser_review"] },
    reasoning: { type: "string" },
    confidence_score: { type: "integer", minimum: 0, maximum: 100 },
    evidence_strength: { type: "string", enum: ["weak","moderate","strong"] },
    missing_information: { type: "array", items: { type: "string" } },
  },
  required: ["becoming","recommended_decision","reasoning","confidence_score","evidence_strength","missing_information"],
};

const buildMemoSchema = {
  type: "object",
  properties: {
    why_recommended: { type: "string" },
    why_others_rejected: { type: "string" },
    supporting_buyer_or_investor_signal: { type: "string" },
    competitor_demand_proof: { type: "string" },
    why_lovable_buildable: { type: "string" },
    why_liftor_operable: { type: "string" },
    must_prove_in_90_days: { type: "array", items: { type: "string" } },
    kill_park_scale_triggers: { type: "string" },
    human_approvals_required: { type: "array", items: { type: "string" } },
    confidence_score: { type: "integer", minimum: 0, maximum: 100 },
    evidence_strength: { type: "string", enum: ["weak","moderate","strong"] },
  },
  required: ["why_recommended","must_prove_in_90_days","kill_park_scale_triggers","human_approvals_required","confidence_score","evidence_strength"],
};

const recommendationsSchema = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          portfolio_asset_id: { type: ["string","null"] },
          recommendation_type: { type: "string", enum: ["build","scale","iterate","park","kill","warm_buyer","adviser_review","improve_data_room","increase_outreach","adjust_positioning","update_jurisdiction_review"] },
          summary: { type: "string" },
          reasoning: { type: "string" },
          supporting_signals: { type: "array", items: { type: "string" }, description: "Table+id references e.g. 'ma_weekly_signals:<id>'" },
          confidence_score: { type: "integer", minimum: 0, maximum: 100 },
          urgency_score: { type: "integer", minimum: 0, maximum: 100 },
          risk_level: { type: "string", enum: ["low","medium","high"] },
          recommended_owner: { type: "string" },
          due_days: { type: "integer", description: "Days from today for due date" },
        },
        required: ["recommendation_type","summary","reasoning","supporting_signals","confidence_score","urgency_score","risk_level"],
      },
    },
  },
  required: ["recommendations"],
};

// ============ MAIN ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Authn / authz
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isFounderOrAdmin = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounderOrAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: founder/admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { mode, asset_id, build_candidate_id } = await req.json() as {
      mode: Mode;
      asset_id?: string;
      build_candidate_id?: string;
    };

    // Pull context (uses service role - admins/founders only)
    const [assets, exitTargets, execTargets, buyers, investors, competitors, signals, sources, dataRoom, benchmarks, deals, candidates] = await Promise.all([
      admin.from("ma_portfolio_assets").select("*"),
      admin.from("ma_exit_targets").select("*"),
      admin.from("ma_execution_targets").select("*"),
      admin.from("ma_buyer_matches").select("*"),
      admin.from("ma_investors").select("*"),
      admin.from("ma_competitor_profiles").select("*"),
      admin.from("ma_weekly_signals").select("*").order("created_at", { ascending: false }).limit(50),
      admin.from("ma_intelligence_sources").select("id,source_name,licence_status,confidence_score"),
      admin.from("ma_data_room_items").select("*"),
      admin.from("ma_valuation_benchmarks").select("*"),
      admin.from("ma_deals").select("*"),
      admin.from("ma_build_candidates").select("*"),
    ]);

    const ctx: any = {
      assets: assets.data ?? [],
      exit_targets: exitTargets.data ?? [],
      execution_targets: execTargets.data ?? [],
      buyer_matches: buyers.data ?? [],
      investors: investors.data ?? [],
      competitor_profiles: competitors.data ?? [],
      weekly_signals: signals.data ?? [],
      intelligence_sources: sources.data ?? [],
      data_room_items: dataRoom.data ?? [],
      valuation_benchmarks: benchmarks.data ?? [],
      deals: deals.data ?? [],
      build_candidates: candidates.data ?? [],
    };
    const sourceCount =
      (sources.data?.length ?? 0) + (signals.data?.length ?? 0) +
      (competitors.data?.length ?? 0) + (benchmarks.data?.length ?? 0);

    let result: any;
    let inserted: any = null;

    if (mode === "portfolio_briefing") {
      const prompt = `Generate a portfolio-wide intelligence briefing. Data:\n${JSON.stringify(ctx).slice(0, 60000)}`;
      result = await callAI(prompt, portfolioSchema, "portfolio_briefing");
      const { data: row } = await admin.from("ma_ai_briefings").insert({
        kind: "portfolio",
        title: "Portfolio Intelligence Briefing",
        summary: result.summary,
        body: result,
        confidence_score: result.confidence_score,
        ai_model: MODEL,
        source_count: sourceCount,
        evidence_strength: result.evidence_strength,
      }).select().single();
      inserted = row;
    } else if (mode === "asset_analysis") {
      if (!asset_id) throw new Error("asset_id required");
      const asset = ctx.assets.find((a: any) => a.id === asset_id);
      if (!asset) throw new Error("asset not found");
      const scoped = {
        asset,
        exit_targets: ctx.exit_targets.filter((t: any) => t.portfolio_asset_id === asset_id),
        execution_targets: ctx.execution_targets.filter((t: any) => t.portfolio_asset_id === asset_id),
        buyer_matches: ctx.buyer_matches.filter((b: any) => b.portfolio_asset_id === asset_id),
        data_room_items: ctx.data_room_items.filter((d: any) => d.portfolio_asset_id === asset_id),
        weekly_signals: ctx.weekly_signals.filter((s: any) => s.related_portfolio_asset_id === asset_id),
        competitor_profiles: ctx.competitor_profiles,
        valuation_benchmarks: ctx.valuation_benchmarks,
      };
      const prompt = `Analyse this portfolio asset deeply. Data:\n${JSON.stringify(scoped).slice(0, 60000)}`;
      result = await callAI(prompt, assetSchema, "asset_analysis");
      const { data: row } = await admin.from("ma_ai_briefings").insert({
        kind: "asset",
        portfolio_asset_id: asset_id,
        title: `Asset Analysis: ${asset.asset_name}`,
        summary: result.reasoning,
        body: result,
        confidence_score: result.confidence_score,
        ai_model: MODEL,
        source_count: scoped.weekly_signals.length + scoped.buyer_matches.length,
        evidence_strength: result.evidence_strength,
      }).select().single();
      inserted = row;
    } else if (mode === "build_memo") {
      if (!build_candidate_id) throw new Error("build_candidate_id required");
      const cand = ctx.build_candidates.find((c: any) => c.id === build_candidate_id);
      if (!cand) throw new Error("candidate not found");
      const prompt = `Write a quarterly build recommendation memo for this candidate. Context:\n${JSON.stringify({ candidate: cand, all_candidates: ctx.build_candidates, weekly_signals: ctx.weekly_signals, competitors: ctx.competitor_profiles, buyers: ctx.buyer_matches, valuation_benchmarks: ctx.valuation_benchmarks }).slice(0, 60000)}`;
      result = await callAI(prompt, buildMemoSchema, "build_memo");
      const { data: row } = await admin.from("ma_ai_briefings").insert({
        kind: "build_memo",
        build_candidate_id,
        title: `Build Memo: ${cand.candidate_name ?? cand.title ?? "Candidate"}`,
        summary: result.why_recommended,
        body: result,
        confidence_score: result.confidence_score,
        ai_model: MODEL,
        source_count: sourceCount,
        evidence_strength: result.evidence_strength,
      }).select().single();
      inserted = row;
    } else if (mode === "generate_recommendations") {
      const prompt = `Generate 3-8 high-value recommendations across the portfolio. Each must cite supporting record ids. Data:\n${JSON.stringify(ctx).slice(0, 60000)}`;
      result = await callAI(prompt, recommendationsSchema, "recommendations");
      const today = new Date();
      const rows = (result.recommendations ?? []).map((r: any) => ({
        portfolio_asset_id: r.portfolio_asset_id || null,
        recommendation_type: r.recommendation_type,
        summary: r.summary,
        reasoning: r.reasoning,
        supporting_signals: r.supporting_signals ?? [],
        confidence_score: r.confidence_score,
        urgency_score: r.urgency_score,
        risk_level: r.risk_level,
        required_human_approval: r.risk_level !== "low",
        recommended_owner: r.recommended_owner ?? null,
        due_date: r.due_days ? new Date(today.getTime() + r.due_days * 86400000).toISOString().slice(0, 10) : null,
        ai_model: MODEL,
        ai_generated: true,
      }));
      const { data } = await admin.from("ma_ai_recommendations").insert(rows).select();
      inserted = data;
    } else {
      return new Response(JSON.stringify({ error: "Unknown mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, result, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("orchestrator error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});