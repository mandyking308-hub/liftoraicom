import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ELIGIBLE_TYPES = [
  "smartlead_reply_received",
  "native_email_reply_received",
  "founder_manual_note",
  "proposal_viewed",
  "proposal_accepted",
  "demo_viewed",
  "demo_completed",
];

function classifyIntent(row: any): { intent: string; confidence: number } {
  const text = `${row.subject ?? ""} ${row.body_preview ?? ""} ${row.summary ?? ""}`.toLowerCase();
  const t = row.interaction_type as string;
  if (t === "proposal_viewed" || t === "proposal_accepted") return { intent: "proposal_interest", confidence: 0.85 };
  if (t === "demo_viewed" || t === "demo_completed") return { intent: "demo_interest", confidence: 0.85 };
  if (/unsubscribe|opt[- ]?out|remove me/.test(text)) return { intent: "unsubscribe", confidence: 0.95 };
  if (/wrong person|not the right|forward/.test(text)) return { intent: "wrong_person", confidence: 0.8 };
  if (/not (interested|a fit|relevant)|no thanks|pass/.test(text)) return { intent: "not_relevant", confidence: 0.8 };
  if (/send (more|info|deck)|more (info|details)|tell me more/.test(text)) return { intent: "send_more", confidence: 0.7 };
  if (/sign|contract|agreement|invoice|purchase|buy/.test(text)) return { intent: "deal_signal", confidence: 0.7 };
  if (/help|issue|error|support|broken/.test(text)) return { intent: "support_query", confidence: 0.7 };
  if (/interested|sounds good|let'?s talk|book a call|schedule/.test(text)) return { intent: "interested", confidence: 0.8 };
  if (t === "founder_manual_note") return { intent: "unknown", confidence: 0.3 };
  return { intent: "unknown", confidence: 0.2 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = claims.claims.sub;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const isPriv = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!isPriv) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Number(body?.limit ?? 50), 200);

    const { data: rows, error } = await admin
      .from("crm_interaction_ledger")
      .select("id, business_id, contact_id, conversation_id, communication_id, interaction_type, direction, subject, body_preview, summary, contact_email, occurred_at, founder_review_required, ai_relevant")
      .in("interaction_type", ELIGIBLE_TYPES)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const proposals = (rows ?? []).map((r: any) => {
      const { intent, confidence } = classifyIntent(r);
      let action: string;
      let direction: string | null = null;
      let commType: string | null = null;
      if (r.communication_id && r.conversation_id) {
        action = "no_conversation_needed";
      } else if (r.conversation_id) {
        action = "attach_to_existing_conversation";
        direction = r.direction === "outbound" ? "outbound" : "inbound";
        commType = "email";
      } else if (r.interaction_type === "founder_manual_note") {
        action = "founder_review_required";
      } else {
        action = "create_new_conversation";
        direction = r.direction === "outbound" ? "outbound" : "inbound";
        commType = r.interaction_type.startsWith("smartlead") ? "email" : r.interaction_type.startsWith("native_email") ? "email" : "system";
      }
      const reviewRequired =
        action === "founder_review_required" ||
        intent === "unknown" ||
        intent === "wrong_person" ||
        intent === "unsubscribe" ||
        confidence < 0.6;
      return {
        interaction_id: r.id,
        business_id: r.business_id,
        contact_id: r.contact_id,
        conversation_id: r.conversation_id,
        proposed_conversation_action: action,
        proposed_communication_direction: direction,
        proposed_communication_type: commType,
        proposed_subject: r.subject,
        proposed_body_preview: (r.body_preview ?? r.summary ?? "").slice(0, 280),
        detected_intent: intent,
        confidence,
        founder_review_required: reviewRequired,
        apply_status: "preview",
        apply_blockers: ["crm_conversation_bridge_disabled"],
      };
    });

    const summary = {
      total: proposals.length,
      by_action: proposals.reduce((acc: Record<string, number>, p) => {
        acc[p.proposed_conversation_action] = (acc[p.proposed_conversation_action] ?? 0) + 1;
        return acc;
      }, {}),
      by_intent: proposals.reduce((acc: Record<string, number>, p) => {
        acc[p.detected_intent] = (acc[p.detected_intent] ?? 0) + 1;
        return acc;
      }, {}),
      review_required: proposals.filter((p) => p.founder_review_required).length,
    };

    return new Response(JSON.stringify({ ok: true, summary, proposals, mode: "preview", apply_disabled: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});