import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { streamAIGateway, endGatewayLog } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Approx tokens for streaming telemetry. Real token counts are not returned
// mid-stream by the gateway; we use ~4 chars/token as a conservative estimate.
const approxTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));

async function logRuntimeEvent(
  sb: any,
  request_id: string | null,
  event_type: string,
  severity: "info" | "warning" | "error" = "info",
  metadata: Record<string, unknown> = {},
  message?: string,
) {
  try {
    await sb.from("ai_runtime_events").insert({
      request_id, event_type, severity, message: message ?? null, metadata,
    });
  } catch {/* best-effort */}
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch platform context for the system prompt
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Safely query optional tables — never crash if a table is missing/empty.
    const safe = async <T,>(p: Promise<{ data: T | null }>): Promise<T | null> => {
      try { const r = await p; return r.data ?? null; } catch { return null; }
    };
    const safeCount = async (table: string, filter?: (q: any) => any): Promise<number | null> => {
      try {
        let q: any = supabase.from(table).select("*", { count: "exact", head: true });
        if (filter) q = filter(q);
        const { count } = await q;
        return count ?? null;
      } catch { return null; }
    };

    // Gather platform signals in parallel
    const [
      { data: workflows },
      { data: agents },
      { data: systems },
      { data: orgs },
      { data: insights },
      { data: recommendations },
      { data: strategyInsights },
      { data: revenue },
      { data: templates },
    ] = await Promise.all([
      supabase.from("automation_workflows").select("name, status, success_count, failure_count, automation_type, execution_count").limit(50),
      supabase.from("ai_agents").select("name, status, tasks_completed_total, tasks_pending, agent_function").limit(50),
      supabase.from("monitored_systems").select("system_name, status").limit(50),
      supabase.from("organisations").select("name, industry, status").limit(50),
      supabase.from("brain_insights").select("title, description, priority, insight_type, status").order("created_at", { ascending: false }).limit(20),
      supabase.from("decision_recommendations").select("title, description, priority, category, status").order("created_at", { ascending: false }).limit(20),
      supabase.from("strategy_insights").select("title, description, category, confidence_level, status").order("created_at", { ascending: false }).limit(20),
      supabase.from("revenue_records").select("source_name, source_type, revenue_value, client_organisation, currency").limit(50),
      supabase.from("system_templates").select("name, template_type, usage_count").limit(20),
    ]);

    // Liftor founder/lifecycle context (best-effort; tolerant of missing tables)
    const [
      businesses,
      activationProfiles,
      onboardingRuns,
      runtimeActivation,
      dailyRuns,
      weeklyRuns,
      approvalItems,
      masterWork,
      fundingShortlist,
      maBuildCandidates,
      healthcareReadiness,
      insuranceClaims,
      statutoryFilings,
      corpSec,
      intlExpansion,
      releaseItems,
      exitTargets,
      exitAlerts,
      dataRoomTokens,
      videoAssignments,
      buyerTargets,
      buyerWarmActions,
      exitProfiles,
    ] = await Promise.all([
      safe(supabase.from("businesses").select("id, name, status").limit(50) as any),
      safe(supabase.from("business_activation_profiles").select("business_id, status, stage").limit(50) as any),
      safe(supabase.from("business_onboarding_factory_runs").select("business_id, status, readiness_score, created_at").order("created_at", { ascending: false }).limit(20) as any),
      safe(supabase.from("business_runtime_activation").select("business_id, runtime_mode, is_live").limit(50) as any),
      safe(supabase.from("business_daily_operating_runs").select("business_id, status, created_at").order("created_at", { ascending: false }).limit(20) as any),
      safe(supabase.from("business_weekly_review_runs").select("business_id, status, created_at").order("created_at", { ascending: false }).limit(20) as any),
      safe(supabase.from("founder_approval_items").select("id, title, status, priority, created_at").eq("status", "pending").limit(30) as any),
      safe(supabase.from("master_work_items").select("id, title, status, priority").limit(30) as any),
      safe(supabase.from("funding_shortlist").select("id, status").limit(20) as any),
      safe(supabase.from("ma_build_candidates").select("id, status").limit(20) as any),
      safe(supabase.from("healthcare_readiness").select("business_id, status, is_live").limit(20) as any),
      safe(supabase.from("insurance_claims").select("id, status").limit(20) as any),
      safe(supabase.from("statutory_filings").select("id, status, due_date").limit(20) as any),
      safe(supabase.from("corporate_secretarial_records").select("id, status").limit(20) as any),
      safe(supabase.from("international_expansion_runs").select("id, status").limit(20) as any),
      safe(supabase.from("release_workflow_items").select("id, status").limit(20) as any),
      safe(supabase.from("portfolio_exit_targets").select("id, status, business_id").limit(20) as any),
      safe(supabase.from("portfolio_exit_target_alerts").select("id, status, severity").limit(20) as any),
      safeCount("data_room_access_tokens", (q) => q.eq("status", "active")),
      safe(supabase.from("video_library_training_assignments").select("id, status").limit(20) as any),
      safe(supabase.from("founder_led_buyer_targets").select("id, warm_up_status, founder_approved_to_contact").limit(30) as any),
      safe(supabase.from("founder_led_buyer_warm_up_actions").select("id, status, founder_approval_required, founder_approved").limit(30) as any),
      safe(supabase.from("business_exit_intelligence_profiles").select("business_id, twelve_month_review_date, twelve_month_review_status").limit(50) as any),
    ]);

    const tunnelRuns = await safe(
      supabase
        .from("business_setup_tunnel_runs")
        .select("id, business_id, draft_business_name, is_draft, setup_status, current_step, overall_completeness, missing_context_json, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50) as any,
    );

    const liftorContext = {
      businesses: businesses || [],
      activation_profiles: activationProfiles || [],
      onboarding_runs: onboardingRuns || [],
      runtime_activation: runtimeActivation || [],
      daily_runs: dailyRuns || [],
      weekly_runs: weeklyRuns || [],
      founder_approvals_pending: approvalItems || [],
      master_work_items: masterWork || [],
      funding_shortlist: fundingShortlist || [],
      ma_build_candidates: maBuildCandidates || [],
      healthcare_readiness: healthcareReadiness || [],
      insurance_claims_summary: { count: (insuranceClaims || []).length },
      statutory_filings: statutoryFilings || [],
      corporate_secretarial: corpSec || [],
      international_expansion: intlExpansion || [],
      release_items: releaseItems || [],
      portfolio_exit_targets: exitTargets || [],
      portfolio_exit_alerts: exitAlerts || [],
      data_room_active_tokens: dataRoomTokens ?? 0,
      training_assignments: videoAssignments || [],
      buyer_targets: buyerTargets || [],
      buyer_warm_up_actions: buyerWarmActions || [],
      exit_intelligence_profiles: exitProfiles || [],
      setup_tunnel_runs: tunnelRuns || [],
    };

    const platformContext = JSON.stringify({
      workflows: workflows || [],
      agents: agents || [],
      systems: systems || [],
      organisations: orgs || [],
      brain_insights: insights || [],
      decision_recommendations: recommendations || [],
      strategy_insights: strategyInsights || [],
      revenue: revenue || [],
      templates: templates || [],
      liftor: liftorContext,
    });

    const systemPrompt = `You are the Liftor AI Founder Co-Pilot. You help Mandy (founder) understand and operate the Liftor private founder operating system.

You have access to real-time platform data. Use it to answer questions accurately.

PLATFORM DATA:
${platformContext}

GUIDELINES:
- Provide structured, concise answers
- When answering about performance, cite specific numbers from the data
- Format responses with clear sections: Insight, Supporting Data, Recommended Actions
- Use markdown formatting for clarity
- If asked about something not in the data, say so honestly
- Always be strategic and actionable in your recommendations
- You are speaking to the founder/CEO — be direct and business-focused

SAFETY RULES:
- Healthcare overlay is NOT LIVE / BLOCKED — never recommend flipping it live without clinical + insurance + founder sign-off.
- Data room is closed by default — never recommend issuing external tokens without founder approval.
- Buyer warm-up is quiet tracking — never recommend outbound contact unless founder_approved_to_contact is true.
- Never recommend enabling cron, sending emails, activating providers, or exposing founder/admin routes publicly.
- Treat all activation as draft / not_live unless data confirms otherwise.

KNOWN QUESTIONS YOU SHOULD ANSWER WELL:
- "What should I do first?" → point to /founder/start-here.
- "Which business needs setup?" → use businesses + activation_profiles + onboarding_runs.
- "What is missing before launch?" → use onboarding_runs.readiness_score + activation_profiles.stage.
- "What is blocked?" → master_work_items where status implies blocked.
- "What needs founder approval?" → founder_approvals_pending.
- "Is healthcare still blocked?" → healthcare_readiness.is_live (should be false everywhere).
- "Is anything external live?" → runtime_activation.is_live / runtime_mode; data_room_active_tokens.
- "Which businesses are due for sale review?" → exit_intelligence_profiles.twelve_month_review_status.
- "What should I test next?" → cite next pending approval / lowest readiness business.
- "What are my first 10 clicks?" → list the StartHere 10-step path.
- "Where do I start?" → /founder/start-here, then /founder/business-setup-tunnel.
- "What step am I on?" → Look at the active business in the setup tunnel; tell the founder the lowest step that is not 'saved'.
- "Is marketing set up?" → setup-tunnel marketing step status.
- "Is sales set up?" → setup-tunnel sales step status.
- "Are emails safe to draft?" → Yes (drafts only). Sending stays off until founder approval + provider activation.
- "Is this business ready to operate?" → Only if every setup-tunnel step is 'saved' AND runtime_activation.is_live is false (still draft) AND no blockers.
- "Is data room closed?" → data_room_active_tokens should be 0.
- "Is buyer warm-up only internal?" → All buyer_targets.founder_approved_to_contact should be false.`;

    // Setup tunnel-aware answers — appended so existing prompt structure is preserved.
    const tunnelHints = `\n\nSETUP TUNNEL DATA (canonical setup journey at /founder/business-setup-tunnel):\n` +
      `Use setup_tunnel_runs to answer:\n` +
      `- "Which setup step is incomplete?" → row.missing_context_json / current_step.\n` +
      `- "Which business is closest to ready?" → highest overall_completeness < 100.\n` +
      `- "Is NeonCandy fully wired?" → match draft_business_name ~ /neon\\s*candy/i OR business_id of the matching business; report overall_completeness, current_step, is_draft.\n` +
      `- "Is the new marketing business only a draft or properly attached?" → is_draft + whether business_id is set.\n` +
      `- "What should I do next?" → lowest-completeness business, then its current_step.\n` +
      `Canonical routes: setup tunnel /founder/business-setup-tunnel, daily operator /founder/daily-operator, buyer warm-up /founder/portfolio-exit/buyer-warmup, finance /founder/finance, marketing /founder/marketing.`;
    const finalSystemPrompt = systemPrompt + tunnelHints;

    const __gwInput = {
      action_type: "founder_copilot_stream",
      task_category: "founder_copilot",
      model: "google/gemini-3-flash-preview",
      fallback_model: "google/gemini-2.5-flash",
      risk_level: "medium" as const,
      request_type: "copilot_chat",
      messages: [
        { role: "system" as const, content: finalSystemPrompt },
        ...messages,
      ],
      metadata: { streaming: true },
    };
    const fullPrompt = JSON.stringify({ system: systemPrompt, messages });
    const promptTokens = approxTokens(fullPrompt);
    const t0 = Date.now();
    const __log = { trace_id: "", request_id: "" } as { trace_id: string; request_id: string };
    const stream = await streamAIGateway(__gwInput);
    __log.trace_id = stream.trace_id;
    __log.request_id = stream.request_id;
    const response = stream.response;
    await logRuntimeEvent(supabase, __log.request_id, "stream_request_started", "info", {
      function: "founder-copilot", model: __gwInput.model, prompt_tokens_estimate: promptTokens,
    });
    await logRuntimeEvent(supabase, __log.request_id, "stream_opened", "info", {
      function: "founder-copilot", http_status: response.status,
      ttfh_ms: Date.now() - t0,
    });

    if (!response.ok) {
      if (response.status === 429) {
        await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: "rate_limited" });
        await logRuntimeEvent(supabase, __log.request_id, "stream_rate_limited", "warning", { function: "founder-copilot" });
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: "payment_required" });
        await logRuntimeEvent(supabase, __log.request_id, "stream_payment_required", "error", { function: "founder-copilot" });
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: `gateway_${response.status}` });
      await logRuntimeEvent(supabase, __log.request_id, "stream_gateway_error", "error", {
        function: "founder-copilot", http_status: response.status,
      });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream so we can pass it to the client AND tally output bytes
    // for an estimated completion-token count + completion event. Real token
    // counts are not returned mid-stream; we tag cost_basis=streaming_estimate.
    const decoder = new TextDecoder();
    let completionChars = 0;
    let firstTokenLogged = false;
    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        try {
          const text = decoder.decode(chunk, { stream: true });
          // Sum SSE "delta.content" lengths approximately by counting JSON content fields.
          // Cheaper proxy: count raw chunk chars, minus SSE framing overhead (~15%).
          completionChars += Math.ceil(text.length * 0.85);
          if (!firstTokenLogged && text.includes("data:")) {
            firstTokenLogged = true;
            logRuntimeEvent(supabase, __log.request_id, "stream_first_token", "info", {
              function: "founder-copilot", time_to_first_token_ms: Date.now() - t0,
            });
          }
        } catch {/* ignore */}
      },
      async flush() {
        const completionTokens = approxTokens("x".repeat(completionChars));
        await endGatewayLog({ ...__log, input: __gwInput }, {
          ok: true,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          cost_basis: "streaming_estimate",
        });
        await logRuntimeEvent(supabase, __log.request_id, "stream_completed", "info", {
          function: "founder-copilot",
          duration_ms: Date.now() - t0,
          prompt_tokens_estimate: promptTokens,
          completion_tokens_estimate: completionTokens,
          cost_basis: "streaming_estimate",
        });
      },
    });
    return new Response(response.body!.pipeThrough(transform), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
