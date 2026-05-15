import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function inferStage(latest: any): string {
  if (!latest) return "raw_lead";
  const t = latest.interaction_type as string;
  if (t === "smartlead_reply_received" || t === "native_email_reply_received") return "reply_received";
  if (t === "proposal_accepted") return "deal_ready";
  if (t === "proposal_viewed") return "proposal_sent";
  if (t === "demo_completed") return "demo_viewed";
  if (t === "demo_viewed") return "demo_ready";
  if (t === "payment_received") return "client";
  if (t === "email_bounced") return "bounced";
  return "crm_contact";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = claims.claims.sub;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const isPriv = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!isPriv) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { contact_id, business_id, interaction_id, limit } = body ?? {};
    const sampleLimit = Math.min(Number(limit ?? 25), 100);

    const [{ data: stages }, { data: rules }] = await Promise.all([
      admin.from("crm_lifecycle_stages").select("stage_key, stage_label, ai_draft_allowed, auto_send_allowed, founder_review_required, suppression_stage, closed_stage").order("sort_order"),
      admin.from("crm_next_action_rules").select("rule_key, interaction_type, detected_intent, recommended_stage, recommended_action, priority_level, founder_review_required, ai_draft_allowed, suppression_trigger_allowed"),
    ]);

    let q = admin.from("crm_interaction_ledger")
      .select("id, contact_id, business_id, interaction_type, direction, subject, body_preview, summary, occurred_at, ai_action_recommended")
      .order("occurred_at", { ascending: false })
      .limit(sampleLimit);
    if (contact_id) q = q.eq("contact_id", contact_id);
    if (business_id) q = q.eq("business_id", business_id);
    if (interaction_id) q = q.eq("id", interaction_id);
    const { data: interactions } = await q;

    const ruleMap = (rules ?? []) as any[];
    const previews = (interactions ?? []).map((row: any) => {
      const stage = inferStage(row);
      const matched = ruleMap.find((r) =>
        (!r.interaction_type || r.interaction_type === row.interaction_type) &&
        (!r.detected_intent || r.detected_intent === row.ai_action_recommended)
      );
      const blockers: string[] = ["crm_next_action_apply_disabled", "no_auto_send"];
      if (!matched) blockers.push("no_matching_rule");
      return {
        interaction_id: row.id,
        contact_id: row.contact_id,
        business_id: row.business_id,
        current_stage: stage,
        recommended_stage: matched?.recommended_stage ?? "needs_founder_review",
        recommended_action: matched?.recommended_action ?? "founder_review",
        priority_level: matched?.priority_level ?? "normal",
        founder_review_required: matched?.founder_review_required ?? true,
        ai_draft_allowed: matched?.ai_draft_allowed ?? false,
        suppression_trigger_allowed: matched?.suppression_trigger_allowed ?? false,
        matched_rule_key: matched?.rule_key ?? null,
        blockers,
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      mode: "preview",
      apply_disabled: true,
      stages_count: (stages ?? []).length,
      rules_count: ruleMap.length,
      previews,
      summary: {
        total: previews.length,
        review_required: previews.filter((p) => p.founder_review_required).length,
        urgent: previews.filter((p) => p.priority_level === "urgent").length,
        high: previews.filter((p) => p.priority_level === "high").length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});