import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectTypes, businessProblem, processesToAutomate, projectScale, timeline, industry } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI systems engineering consultant at Liftor AI, a premium AI engineering studio. 
Based on the client's project requirements, generate a structured proposal outline. 
You must respond using the suggest_proposal tool. Be specific, professional, and confident.
Tailor the solution to the client's industry and scale.`;

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
              description: "Return a structured proposal outline with suggested solution, scope, and timeline.",
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
                },
                required: ["suggested_solution", "estimated_scope", "estimated_timeline"],
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
