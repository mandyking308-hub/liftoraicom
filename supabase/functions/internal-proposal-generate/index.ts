import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  contact_id: string;
  industry?: string;
  project_scale?: string;
  timeline?: string;
  business_problem?: string;
  project_types?: string[];
  processes_to_automate?: string[];
  include_demo?: boolean;
  title?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body: Body = await req.json().catch(() => ({} as Body));
    if (!body.contact_id) return j({ error: "contact_id required" }, 400);

    const { data: contact } = await supabase.from("contacts")
      .select("*").eq("id", body.contact_id).maybeSingle();
    if (!contact) return j({ error: "contact not found" }, 404);

    if (contact.status !== "QUALIFIED") {
      return j({ error: `Contact must be QUALIFIED (current: ${contact.status})` }, 400);
    }

    const projectTypes = body.project_types?.length ? body.project_types : ["AI Automation"];
    const processes = body.processes_to_automate?.length ? body.processes_to_automate : ["Operations"];
    const industry = body.industry || "Enterprise";
    const scale = body.project_scale || "department-wide";
    const timeline = body.timeline || "8-16 weeks";
    const problem = body.business_problem || `Manual operations across ${processes.join(", ")}`;

    // Reuse the same AI structure as generate-proposal
    const systemPrompt = `You are an AI systems engineering consultant at Liftor AI.
Generate a structured proposal using the suggest_proposal tool. Be specific, professional, confident.
Pricing GBP: Small £25–60k, Mid £60–150k, Enterprise £150–500k+.
Always GBP. 4-8 architecture_components (system|agent|workflow|integration|interface).
ROI: low £80–150k/yr 12–18mo 10–20%; mid £200–600k/yr 8–14mo 20–40%; high £500k–2M+/yr 6–12mo 30–60%.`;

    const userPrompt = `Client: ${contact.company || contact.name}
Industry: ${industry}
Project Types: ${projectTypes.join(", ")}
Business Problem: ${problem}
Processes to Automate: ${processes.join(", ")}
Scale: ${scale}
Timeline: ${timeline}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_proposal",
            description: "Structured proposal output.",
            parameters: {
              type: "object",
              properties: {
                suggested_solution: { type: "string" },
                estimated_scope: { type: "string" },
                estimated_timeline: { type: "string" },
                architecture_components: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string", enum: ["system","agent","workflow","integration","interface"] },
                    },
                    required: ["name","type"], additionalProperties: false,
                  },
                },
                estimated_cost_range: { type: "string" },
                estimated_cost_breakdown: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { category: { type: "string" }, estimate: { type: "string" } },
                    required: ["category","estimate"], additionalProperties: false,
                  },
                },
                estimated_roi_summary: { type: "string" },
                estimated_annual_savings: { type: "string" },
                estimated_roi_period: { type: "string" },
                estimated_productivity_gain: { type: "string" },
              },
              required: [
                "suggested_solution","estimated_scope","estimated_timeline",
                "architecture_components","estimated_cost_range","estimated_cost_breakdown",
                "estimated_roi_summary","estimated_annual_savings","estimated_roi_period","estimated_productivity_gain"
              ],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_proposal" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) return j({ error: "AI rate-limited. Try again shortly." }, 429);
      if (aiRes.status === 402) return j({ error: "AI credits exhausted." }, 402);
      return j({ error: "AI gateway error", detail: t.slice(0,300) }, 500);
    }
    const aiJson = await aiRes.json();
    const tc = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return j({ error: "No proposal tool call" }, 500);
    const p = JSON.parse(tc.function.arguments);

    const proposalRow = {
      contact_id: contact.id,
      business_name: contact.assigned_business || "",
      title: body.title || `${contact.company || "Proposal"} — AI Systems Engagement`,
      industry, project_scale: scale, timeline,
      business_problem: problem,
      project_types: projectTypes,
      processes_to_automate: processes,
      suggested_solution: p.suggested_solution,
      estimated_scope: p.estimated_scope,
      estimated_timeline: p.estimated_timeline,
      estimated_cost_range: p.estimated_cost_range,
      estimated_cost_breakdown: p.estimated_cost_breakdown,
      architecture_components: p.architecture_components,
      estimated_roi_summary: p.estimated_roi_summary,
      estimated_annual_savings: p.estimated_annual_savings,
      estimated_roi_period: p.estimated_roi_period,
      estimated_productivity_gain: p.estimated_productivity_gain,
      status: "draft",
      include_demo: !!body.include_demo,
    };

    const { data: created, error: insErr } = await supabase
      .from("internal_proposals").insert(proposalRow).select("*").single();
    if (insErr) return j({ error: insErr.message }, 500);

    await supabase.from("internal_proposal_versions").insert({
      proposal_id: created.id, version: created.version, snapshot: created, changed_by: "ai-generator",
    });

    let demo = null;
    if (body.include_demo) {
      const { data: d } = await supabase.from("demo_access").insert({
        contact_id: contact.id,
        proposal_id: created.id,
        business_name: contact.assigned_business || "",
      }).select("*").single();
      demo = d;
    }

    return j({ ok: true, proposal: created, demo }, 200);
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}