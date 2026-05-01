import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_TIMEOUT_MS = 20_000;
const DB_TIMEOUT_MS = 8_000;
const TOTAL_BUDGET_MS = 110_000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

interface Body { run_id: string; }

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const TAG_TAXONOMY = [
  "music_curator","dj","creator","influencer","media",
  "fashion","beauty","licensing","toy_doll_licensing","tv_format",
  "marketing_buyer","sustainability_buyer","merchandise_buyer","partnership_lead",
];

// Deterministic rule-based qualification
function ruleScore(p: { title?: string | null; company?: string | null; country?: string | null }): {
  qualification: "qualified" | "maybe" | "not_qualified" | "needs_review";
  reason: string;
  tags: string[];
} {
  const title = (p.title ?? "").toLowerCase();
  const company = (p.company ?? "").toLowerCase();
  const tags: string[] = [];
  let score = 40;
  const reasons: string[] = [];

  if (/(a&r|music|playlist|curator|label|publishing|sync|licens)/i.test(title)) {
    tags.push("music_curator");
    score += 25; reasons.push("music/A&R title");
  }
  if (/\b(dj|deejay)\b/i.test(title)) { tags.push("dj"); score += 15; reasons.push("DJ"); }
  if (/(creator|influencer|content|tiktok|youtube|instagram)/i.test(title)) {
    tags.push("creator","influencer"); score += 10; reasons.push("creator/influencer");
  }
  if (/(brand|marketing|partnership|collab)/i.test(title)) {
    tags.push("marketing_buyer","partnership_lead"); score += 10; reasons.push("brand/marketing/partnership");
  }
  if (/(licens|merch|toy|doll|format|tv)/i.test(title)) {
    tags.push("licensing","toy_doll_licensing","tv_format","merchandise_buyer"); score += 10;
    reasons.push("licensing/merch/format");
  }
  if (/(sustain|eco|green|climate)/i.test(title) || /(sustain|eco|climate)/i.test(company)) {
    tags.push("sustainability_buyer"); score += 5; reasons.push("sustainability");
  }
  if (/(beauty|cosmetic|fashion|apparel)/i.test(title) || /(beauty|cosmetic|fashion|apparel)/i.test(company)) {
    tags.push("beauty","fashion"); score += 5; reasons.push("beauty/fashion");
  }

  let qualification: "qualified" | "maybe" | "not_qualified" | "needs_review" = "needs_review";
  if (score >= 70) qualification = "qualified";
  else if (score >= 55) qualification = "maybe";
  else if (score < 45 && reasons.length === 0) qualification = "not_qualified";

  return { qualification, reason: reasons.join("; ") || "no rule match", tags: Array.from(new Set(tags)) };
}

async function aiClassify(items: { id: string; title: string | null; company: string | null }[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || items.length === 0) return null;
  try {
    const resp = await fetch(LOVABLE_AI, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You classify B2B contacts for a multi-business portfolio. Respond by calling the classify function with one entry per input id." },
          { role: "user", content: `Tag taxonomy: ${TAG_TAXONOMY.join(", ")}. Classify each:\n${JSON.stringify(items)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            description: "Return tags and qualification for each contact.",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      qualification: { type: "string", enum: ["qualified","maybe","not_qualified","needs_review"] },
                      reason: { type: "string" },
                      tags: { type: "array", items: { type: "string", enum: TAG_TAXONOMY } },
                    },
                    required: ["id","qualification","reason","tags"],
                  },
                },
              },
              required: ["results"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return parsed.results as { id: string; qualification: string; reason: string; tags: string[] }[];
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body: Body = await req.json();
    if (!body?.run_id) return json({ error: "run_id required" }, 400);
    const startedAt = Date.now();
    const budgetExceeded = () => Date.now() - startedAt > TOTAL_BUDGET_MS;

    const { data: leads, error } = await supabase
      .from("apollo_leads")
      .select("id, contact_id, title, company, apollo_person_id")
      .eq("run_id", body.run_id)
      .eq("status", "imported");
    if (error) return json({ error: error.message }, 500);
    if (!leads?.length) return json({ ok: true, qualified: 0, maybe: 0, not_qualified: 0, needs_review: 0 });

    // Rule scoring
    const ruleResults = leads.map((l) => ({ leadId: l.id, contactId: l.contact_id, ...ruleScore(l) }));

    // AI for borderline (maybe / needs_review)
    const borderline = ruleResults
      .filter((r) => r.qualification === "maybe" || r.qualification === "needs_review")
      .map((r) => {
        const lead = leads.find((l) => l.id === r.leadId)!;
        return { id: lead.id, title: lead.title, company: lead.company };
      });
    const aiResults = await aiClassify(borderline);
    const aiMap = new Map((aiResults ?? []).map((r) => [r.id, r]));

    let qualified = 0, maybe = 0, notQualified = 0, needsReview = 0;
    for (const r of ruleResults) {
      if (budgetExceeded()) break;
      const ai = aiMap.get(r.leadId);
      const finalQualification = (ai?.qualification ?? r.qualification) as "qualified" | "maybe" | "not_qualified" | "needs_review";
      const finalTags = Array.from(new Set([...(r.tags || []), ...((ai?.tags as string[]) || [])]));
      const finalReason = ai?.reason ? `${r.reason} | AI: ${ai.reason}` : r.reason;

      if (finalQualification === "qualified") qualified += 1;
      else if (finalQualification === "maybe") maybe += 1;
      else if (finalQualification === "not_qualified") notQualified += 1;
      else needsReview += 1;

      await withTimeout(supabase.from("apollo_leads").update({
        qualification: finalQualification,
        qualification_reason: finalReason,
        ai_tags: finalTags,
      }).eq("id", r.leadId), DB_TIMEOUT_MS, "lead_update").catch(() => {});

      if (r.contactId) {
        // Merge tags into contact
        const { data: c } = await withTimeout(
          supabase.from("contacts").select("tags").eq("id", r.contactId).maybeSingle(),
          DB_TIMEOUT_MS, "contact_lookup",
        ).catch(() => ({ data: null }));
        const merged = Array.from(new Set([...(c?.tags ?? []), ...finalTags]));
        await withTimeout(supabase.from("contacts").update({ tags: merged }).eq("id", r.contactId), DB_TIMEOUT_MS, "contact_update").catch(() => {});

        // Update business relationship
        await withTimeout(supabase.from("business_contact_relationships").update({
          qualification: finalQualification,
          qualification_reason: finalReason,
        }).eq("contact_id", r.contactId), DB_TIMEOUT_MS, "bcr_update").catch(() => {});
      }
    }

    await supabase.from("apollo_sync_runs").update({
      qualified_count: qualified,
      maybe_count: maybe,
      not_qualified_count: notQualified,
      needs_review_count: needsReview,
      ready_to_stage_count: qualified, // qualified = ready to stage by default
    }).eq("id", body.run_id);

    return json({ ok: true, qualified, maybe, not_qualified: notQualified, needs_review: needsReview });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
