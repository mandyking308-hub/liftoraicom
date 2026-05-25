import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FIT_RULES: Array<{ fit: string; patterns: RegExp[] }> = [
  { fit: "dj",                  patterns: [/\bdj\b/i, /turntab/i, /selector/i, /residen(t|cy)/i] },
  { fit: "playlist_curator",    patterns: [/playlist/i, /curator/i, /a&r/i, /\ba and r\b/i, /editorial/i] },
  { fit: "music_blog",          patterns: [/blog/i, /journal/i, /editor/i, /writer/i, /reporter/i, /press\b/i, /critic/i] },
  { fit: "radio",               patterns: [/radio/i, /broadcast/i, /presenter/i, /host\b/i, /producer/i, /program(me)? director/i] },
  { fit: "event_promoter",      patterns: [/promoter/i, /booker/i, /booking/i, /event(s)?\b/i, /festival/i, /venue/i, /club\b/i] },
  { fit: "creator_influencer",  patterns: [/influencer/i, /creator/i, /youtub/i, /tiktok/i, /content\b/i, /streamer/i] },
];

function classifyByRules(title?: string | null, company?: string | null) {
  const text = `${title ?? ""} ${company ?? ""}`.trim();
  if (!text) return { fit: "poor_fit", confidence: 0.2, reason: "no title/company text" };
  for (const rule of FIT_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { fit: rule.fit, confidence: 0.8, reason: `matched ${rule.fit} keywords` };
    }
  }
  return { fit: "poor_fit", confidence: 0.6, reason: "no music-industry keywords" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const userEmail = u.user.email ?? u.user.id;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
  if (!role) return json({ error: "Founder role required" }, 403);

  let body: {
    dry_run?: boolean;
    method?: "rules" | "ai";
    limit?: number;
    lead_ids?: string[];
    only_status?: string[];
    ai_chunk_size?: number;
    confirm_ai_cost?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const method = body.method === "ai" ? "ai" : "rules";
  // Rules method: the founder action processes the WHOLE eligible set in one
  // call (cheap, no per-lead cost). AI method still has internal chunking and
  // an absolute ceiling, but the panel sends the whole selection in one click.
  const RULES_LIMIT = 5000;
  const AI_CEILING = 500;             // hard absolute ceiling per founder action
  const AI_CHUNK = Math.min(Math.max(body.ai_chunk_size ?? 25, 1), 50);
  const requestedLimit = body.limit ?? (method === "ai" ? 25 : RULES_LIMIT);
  const limit = method === "ai"
    ? Math.min(Math.max(requestedLimit, 1), AI_CEILING)
    : Math.min(Math.max(requestedLimit, 1), RULES_LIMIT);

  // Eligible statuses: rules can also score needs_verification rows so the
  // Apollo Unlock Shortlist can rank them by music-industry fit before the
  // founder approves any Apollo unlock spend.
  const allowedStatusValues = new Set(["reviewed", "needs_verification"]);
  const onlyStatus = (body.only_status && body.only_status.length
    ? body.only_status
    : ["reviewed", "needs_verification"]
  ).filter((s) => allowedStatusValues.has(s));

  // The cheap-scan must have run first (status reviewed or needs_verification).
  let q = admin.from("apollo_raw_leads")
    .select("apollo_lead_id,quality_profile_id,title,company,email,first_name,last_name,quality_status")
    .in("quality_status", onlyStatus as any)
    .limit(limit);
  if (body.lead_ids && body.lead_ids.length) q = q.in("apollo_lead_id", body.lead_ids);
  const { data: rows, error } = await q;
  if (error) return json({ error: error.message }, 500);

  // AI cost protection: require explicit confirm flag for any non-dry-run AI.
  if (method === "ai" && !dryRun && body.confirm_ai_cost !== true) {
    return json({
      error: "AI classification requires confirm_ai_cost=true",
      requires_confirmation: true,
      eligible_count: (rows ?? []).length,
      ai_chunk_size: AI_CHUNK,
      hint: "Resubmit with confirm_ai_cost=true to authorize spend.",
    }, 400);
  }

  const decisions: Array<{
    apollo_lead_id: string; quality_profile_id: string;
    fit: string; confidence: number; reason: string; method: string;
    next_status: string;
  }> = [];

  if (method === "ai") {
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    // Internal chunking: process the whole selection in chunks of AI_CHUNK
    // so the founder is not forced to click the action repeatedly.
    const allRows = rows ?? [];
    for (let i = 0; i < allRows.length; i += AI_CHUNK) {
      const slice = allRows.slice(i, i + AI_CHUNK);
      for (const r of slice) {
      const prompt = `Classify this person's fit for outreach to ${"NeonCandy"} music promotion.
Title: ${r.title ?? ""}
Company: ${r.company ?? ""}
Categories: dj, playlist_curator, music_blog, radio, event_promoter, creator_influencer, poor_fit.
Return ONLY JSON: {"fit":"<category>","confidence":0..1,"reason":"<short>"}`;
      try {
        const gw = await callAIGateway({
          action_type: "lead_fit_classify",
          task_category: "lead_qualification",
          model: "google/gemini-2.5-flash-lite",
          fallback_model: "google/gemini-3-flash-preview",
          risk_level: "medium",
          request_type: "lead_fit",
          metadata: { apollo_lead_id: r.apollo_lead_id },
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        });
        if (gw.status !== "completed" || !gw.data) {
          throw new Error(gw.error ?? `gateway_${gw.http_status}`);
        }
        const txt = gw.data?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(txt);
        const fit = String(parsed.fit ?? "poor_fit");
        const conf = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5)));
        const next = fit === "poor_fit" ? "rejected" : conf >= 0.7 ? "qualified" : "needs_founder_review";
        decisions.push({
          apollo_lead_id: r.apollo_lead_id, quality_profile_id: r.quality_profile_id,
          fit, confidence: conf, reason: String(parsed.reason ?? ""), method: "ai", next_status: next,
        });
      } catch (e) {
        decisions.push({
          apollo_lead_id: r.apollo_lead_id, quality_profile_id: r.quality_profile_id,
          fit: "poor_fit", confidence: 0, reason: `ai_error: ${(e as Error).message}`, method: "ai", next_status: "needs_founder_review",
        });
      }
      }
    }
  } else {
    for (const r of rows ?? []) {
      const c = classifyByRules(r.title, r.company);
      const next = c.fit === "poor_fit" ? "rejected" : c.confidence >= 0.7 ? "qualified" : "needs_founder_review";
      decisions.push({
        apollo_lead_id: r.apollo_lead_id, quality_profile_id: r.quality_profile_id,
        fit: c.fit, confidence: c.confidence, reason: c.reason, method: "rules", next_status: next,
      });
    }
  }

  const summary = {
    scanned: decisions.length,
    qualified: decisions.filter((d) => d.next_status === "qualified").length,
    needs_founder_review: decisions.filter((d) => d.next_status === "needs_founder_review").length,
    rejected: decisions.filter((d) => d.next_status === "rejected").length,
    by_fit: decisions.reduce((acc, d) => { acc[d.fit] = (acc[d.fit] ?? 0) + 1; return acc; }, {} as Record<string, number>),
  };

  let applied = 0;
  if (!dryRun && decisions.length > 0) {
    for (const d of decisions) {
      // For needs_verification leads we ONLY annotate fit (do NOT promote to
      // 'qualified' — they still need an email unlock first). For reviewed
      // leads we update quality_status as before.
      const { data: existing } = await admin.from("lead_quality_profiles")
        .select("quality_status").eq("id", d.quality_profile_id).maybeSingle();
      const isNeedsVerification = existing?.quality_status === "needs_verification";
      const update: Record<string, unknown> = {
        campaign_fit: d.fit,
        fit_confidence: d.confidence,
        fit_reason: d.reason,
        fit_method: d.method,
        classified_at: new Date().toISOString(),
      };
      if (!isNeedsVerification) {
        update.quality_status = d.next_status;
        update.needs_founder_review = d.next_status === "needs_founder_review";
      }
      const { error: uErr } = await admin.from("lead_quality_profiles")
        .update(update).eq("id", d.quality_profile_id);
      if (!uErr) applied++;
    }
    await admin.from("system_events").insert({
      event_type: "lead_fit_classify_applied", severity: "low", business_name: "",
      message: `Founder ${userEmail} classified ${applied} leads (${method}).`,
      metadata: { actor: userEmail, method, summary }, resolved: true,
    });
  }

  return json({ ok: true, dry_run: dryRun, method, summary, applied, sample: decisions.slice(0, 25) });
});