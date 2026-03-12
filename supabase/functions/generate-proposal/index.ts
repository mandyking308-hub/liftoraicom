import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IP_LIMIT_PER_HOUR = 5;
const ABUSE_THRESHOLD = 20;
const ABUSE_WINDOW_MINUTES = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Extract IP from headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    // Extract user ID if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = data?.user?.id || null;
      } catch { /* unauthenticated is fine */ }
    }

    // ── Rate Limit Check ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const tenMinAgo = new Date(Date.now() - ABUSE_WINDOW_MINUTES * 60 * 1000).toISOString();

    // Count requests from this IP in the last hour
    const { count: ipCount } = await supabase
      .from("proposal_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("last_request_at", oneHourAgo);

    const currentIpCount = ipCount ?? 0;

    // Check for abuse (20+ in 10 minutes)
    const { count: abuseCount } = await supabase
      .from("proposal_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("last_request_at", tenMinAgo);

    if ((abuseCount ?? 0) >= ABUSE_THRESHOLD) {
      // Flag as suspicious in access_anomalies
      await supabase.from("access_anomalies").insert({
        anomaly_type: "excessive_proposal_requests",
        severity: "high",
        description: `IP ${ip} made ${abuseCount} proposal requests in ${ABUSE_WINDOW_MINUTES} minutes`,
        user_id: userId,
        flagged: true,
      });
    }

    if (currentIpCount >= IP_LIMIT_PER_HOUR) {
      // Log the blocked attempt
      await supabase.from("proposal_rate_limits").insert({
        ip_address: ip,
        user_id: userId,
        request_count: 1,
        blocked: true,
        last_request_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ error: "Proposal generation limit reached. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log allowed request
    await supabase.from("proposal_rate_limits").insert({
      ip_address: ip,
      user_id: userId,
      request_count: 1,
      blocked: false,
      last_request_at: new Date().toISOString(),
    });

    // ── Proposal Generation ──
    const { projectTypes, businessProblem, processesToAutomate, projectScale, timeline, industry } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI systems engineering consultant at Liftor AI, a premium enterprise AI systems engineering company.
Based on the client's project requirements, generate a structured proposal outline.
You must respond using the suggest_proposal tool. Be specific, professional, and confident.
Tailor the solution to the client's industry and scale.

For architecture_components, generate 4-8 components that represent the major building blocks of the proposed system. Each component must have a name and a type from: system, agent, workflow, integration, interface.

PRICING GUIDELINES — You are pricing enterprise AI infrastructure, NOT freelance work:
- Small Automation System (small scale): £25,000 – £60,000
- Mid-Size Intelligent System (department/org-wide): £60,000 – £150,000
- Enterprise AI Platform (enterprise scale): £150,000 – £500,000+

The estimated_cost_range should reflect the TOTAL project investment as a GBP range.
The estimated_cost_breakdown should include 3-5 line items covering categories like: Architecture & System Design, Platform Development, AI Agent Engineering, Integration Engineering, Deployment & Optimisation, Data Infrastructure, Testing & QA.
Each breakdown item must have a category name and a GBP estimate range string.
All prices must be in GBP (£). Never produce low-cost or freelance-level estimates.

ROI ESTIMATION GUIDELINES — Estimate the financial return based on automation level:
- Low Automation Impact (single workflow, basic processing): Annual savings £80,000–£150,000, ROI period 12–18 months, Productivity gain 10%–20%
- Medium Automation Impact (multi-workflow, AI decision support, cross-system): Annual savings £200,000–£600,000, ROI period 8–14 months, Productivity gain 20%–40%
- High Automation Impact (enterprise platform, multi-agent, AI operations): Annual savings £500,000–£2,000,000+, ROI period 6–12 months, Productivity gain 30%–60%

The estimated_roi_summary should be 2-3 sentences explaining the strategic business impact.
The estimated_annual_savings should be a GBP range string.
The estimated_roi_period should be a month range string like "8 – 14 months".
The estimated_productivity_gain should be a percentage range string like "20% – 40%".`;

    const userPrompt = `Generate a proposal outline for this client:
- Industry: ${industry}
- Project Types: ${projectTypes.join(", ")}
- Business Problem: ${businessProblem}
- Processes to Automate: ${processesToAutomate.join(", ")}
- Project Scale: ${projectScale}
- Timeline Preference: ${timeline}`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_proposal",
              description: "Return a structured proposal outline with solution, scope, timeline, architecture, cost estimate, and ROI forecast.",
              parameters: {
                type: "object",
                properties: {
                  suggested_solution: {
                    type: "string",
                    description: "A 2-3 sentence description of the recommended AI solution approach.",
                  },
                  estimated_scope: {
                    type: "string",
                    description: "A description of the development scope and complexity level.",
                  },
                  estimated_timeline: {
                    type: "string",
                    description: "An estimated development timeline range (e.g. '8-16 weeks').",
                  },
                  architecture_components: {
                    type: "array",
                    description: "A list of 4-8 major system components that make up the proposed architecture.",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "The name of the system component." },
                        type: { type: "string", enum: ["system", "agent", "workflow", "integration", "interface"], description: "The type of component." },
                      },
                      required: ["name", "type"],
                      additionalProperties: false,
                    },
                  },
                  estimated_cost_range: {
                    type: "string",
                    description: "The total estimated investment range in GBP, e.g. '£85,000 – £140,000'. Must reflect enterprise pricing.",
                  },
                  estimated_cost_breakdown: {
                    type: "array",
                    description: "A breakdown of investment by engineering category, 3-5 items.",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "The cost category name." },
                        estimate: { type: "string", description: "The estimated cost range in GBP." },
                      },
                      required: ["category", "estimate"],
                      additionalProperties: false,
                    },
                  },
                  estimated_roi_summary: {
                    type: "string",
                    description: "A 2-3 sentence summary of the expected strategic business impact and financial return from implementing this system.",
                  },
                  estimated_annual_savings: {
                    type: "string",
                    description: "The estimated annual operational savings in GBP range, e.g. '£250,000 – £500,000'.",
                  },
                  estimated_roi_period: {
                    type: "string",
                    description: "The estimated time to achieve return on investment, e.g. '8 – 14 months'.",
                  },
                  estimated_productivity_gain: {
                    type: "string",
                    description: "The estimated productivity improvement as a percentage range, e.g. '20% – 40%'.",
                  },
                },
                required: [
                  "suggested_solution", "estimated_scope", "estimated_timeline",
                  "architecture_components", "estimated_cost_range", "estimated_cost_breakdown",
                  "estimated_roi_summary", "estimated_annual_savings", "estimated_roi_period", "estimated_productivity_gain"
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_proposal" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const proposal = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(proposal), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
