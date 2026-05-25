import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { beginGatewayLog, endGatewayLog } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    });

    const systemPrompt = `You are the Liftor AI Founder Co-Pilot. You are an intelligent assistant that helps the founder understand and manage the Liftor AI platform.

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
- You are speaking to the founder/CEO — be direct and business-focused`;

    const __gwInput = {
      action_type: "founder_copilot_stream",
      task_category: "founder_copilot",
      model: "google/gemini-3-flash-preview",
      fallback_model: "google/gemini-2.5-flash",
      risk_level: "medium" as const,
      request_type: "copilot_chat",
      messages: [],
      metadata: { streaming: true },
    };
    const __log = await beginGatewayLog(__gwInput);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: "rate_limited" });
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: "payment_required" });
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: `gateway_${response.status}` });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget completion log (stream tokens not counted server-side).
    endGatewayLog({ ...__log, input: __gwInput }, { ok: true }).catch(() => {});
    return new Response(response.body, {
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
