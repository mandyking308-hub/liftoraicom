import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Commercial Handoff — PREVIEW ONLY.
// Reads qualified/engaged conversations, AI drafts, CRM next actions, and
// founder approval items; classifies each candidate as proposal_ready,
// demo_ready, deal_ready or founder_review.
// NEVER writes. NEVER sends. NEVER calls Apollo or Smartlead.

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

const safe = async (q: any, fb: any = []) => { try { const { data } = await q; return data ?? fb; } catch { return fb; } };

type HandoffType = "proposal_ready" | "demo_ready" | "deal_ready" | "founder_review";

type Candidate = {
  contact_id?: string | null;
  conversation_id?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  handoff_type: HandoffType;
  qualification_summary: string;
  detected_need?: string;
  proposed_offer?: string;
  proposed_next_step?: string;
  estimated_value_min?: number;
  estimated_value_max?: number;
  source_system: string;
  source_id?: string;
  blockers: string[];
};

function classifyFromIntent(intent?: string | null, hasProposal?: boolean, hasDeal?: boolean): { type: HandoffType; offer: string; next: string; valueMin: number; valueMax: number } {
  if (hasDeal) return { type: "deal_ready", offer: "Existing deal — push to close.", next: "Founder closes deal in pipeline.", valueMin: 5000, valueMax: 25000 };
  if (hasProposal) return { type: "proposal_ready", offer: "Existing draft proposal — review & send.", next: "Founder approves proposal preview.", valueMin: 5000, valueMax: 25000 };
  switch (intent) {
    case "meeting_request": return { type: "demo_ready", offer: "30-min discovery + tailored demo.", next: "Schedule demo, capture scope.", valueMin: 3000, valueMax: 15000 };
    case "pricing_inquiry": return { type: "proposal_ready", offer: "Tailored proposal scoped to inquiry.", next: "Generate proposal preview.", valueMin: 5000, valueMax: 25000 };
    case "interested_warm": return { type: "demo_ready", offer: "Quick walkthrough of relevant Liftor systems.", next: "Book 20-min demo, then proposal.", valueMin: 3000, valueMax: 15000 };
    case "complaint_or_legal":
    case "unsubscribe": return { type: "founder_review", offer: "Hold — compliance-sensitive.", next: "Founder responds personally.", valueMin: 0, valueMax: 0 };
    default: return { type: "founder_review", offer: "Insufficient signal — founder review.", next: "Founder reviews context.", valueMin: 0, valueMax: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const drafts = (await safe(
      admin.from("ai_conversation_draft_reviews")
        .select("id,detected_intent,intent_confidence,contact_id,conversation_id,risk_flags,created_at")
        .order("created_at", { ascending: false }).limit(50),
      []
    )) as any[];

    const conversations = (await safe(
      admin.from("conversations")
        .select("id,contact_id,business_name,status,last_message_at")
        .order("last_message_at", { ascending: false }).limit(50),
      []
    )) as any[];

    const proposals = (await safe(
      admin.from("internal_proposals").select("id,contact_id,status,title").limit(200),
      []
    )) as any[];
    const deals = (await safe(
      admin.from("deals").select("id,contact_id,status,name,value").limit(200),
      []
    )) as any[];
    const handoffsExisting = (await safe(
      admin.from("commercial_handoff_reviews").select("contact_id,conversation_id,handoff_type,created_at"),
      []
    )) as any[];

    const proposalByContact = new Map<string, any>();
    for (const p of proposals) if (p.contact_id) proposalByContact.set(p.contact_id, p);
    const dealByContact = new Map<string, any>();
    for (const d of deals) if (d.contact_id) dealByContact.set(d.contact_id, d);
    const convoById = new Map<string, any>();
    for (const c of conversations) convoById.set(c.id, c);

    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    for (const d of drafts) {
      const key = `draft:${d.contact_id ?? d.conversation_id ?? d.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const convo = d.conversation_id ? convoById.get(d.conversation_id) : null;
      const hasProposal = d.contact_id ? proposalByContact.has(d.contact_id) : false;
      const hasDeal = d.contact_id ? dealByContact.has(d.contact_id) : false;
      const cls = classifyFromIntent(d.detected_intent, hasProposal, hasDeal);
      const blockers: string[] = [];
      if ((d.intent_confidence ?? 0) < 0.5) blockers.push("low_intent_confidence");
      if (Array.isArray(d.risk_flags) && d.risk_flags.includes("intent_unknown_hold_for_review")) blockers.push("intent_unknown");
      if (!d.contact_id) blockers.push("no_contact_link");
      candidates.push({
        contact_id: d.contact_id,
        conversation_id: d.conversation_id,
        business_name: convo?.business_name ?? null,
        handoff_type: cls.type,
        qualification_summary: `Intent=${d.detected_intent ?? "unknown"} (${Math.round((d.intent_confidence ?? 0) * 100)}% conf)`,
        detected_need: d.detected_intent ?? undefined,
        proposed_offer: cls.offer,
        proposed_next_step: cls.next,
        estimated_value_min: cls.valueMin || undefined,
        estimated_value_max: cls.valueMax || undefined,
        source_system: "ai-conversation-draft",
        source_id: d.id,
        blockers,
      });
    }

    // Conversations marked qualified/engaged that don't already have a draft
    for (const c of conversations) {
      const k = `conv:${c.contact_id ?? c.id}`;
      if (seen.has(k)) continue;
      const status = (c.status ?? "").toLowerCase();
      if (!["qualified", "engaged", "warm", "hot", "in_progress"].includes(status)) continue;
      seen.add(k);
      const hasProposal = c.contact_id ? proposalByContact.has(c.contact_id) : false;
      const hasDeal = c.contact_id ? dealByContact.has(c.contact_id) : false;
      const cls = classifyFromIntent("interested_warm", hasProposal, hasDeal);
      candidates.push({
        contact_id: c.contact_id,
        conversation_id: c.id,
        business_name: c.business_name,
        handoff_type: cls.type,
        qualification_summary: `Conversation status=${status}`,
        proposed_offer: cls.offer,
        proposed_next_step: cls.next,
        estimated_value_min: cls.valueMin || undefined,
        estimated_value_max: cls.valueMax || undefined,
        source_system: "conversation",
        source_id: c.id,
        blockers: c.contact_id ? [] : ["no_contact_link"],
      });
    }

    const byType: Record<string, number> = {};
    let valueMin = 0, valueMax = 0;
    for (const c of candidates) {
      byType[c.handoff_type] = (byType[c.handoff_type] ?? 0) + 1;
      valueMin += c.estimated_value_min ?? 0;
      valueMax += c.estimated_value_max ?? 0;
    }

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      proposals_created: 0,
      demos_created: 0,
      deals_created: 0,
      apply_enabled: false,
      apply_disabled_reason: "commercial_handoff_apply_disabled",
      total_candidates: candidates.length,
      by_type: byType,
      pipeline_value_estimate: { min: valueMin, max: valueMax },
      existing_handoff_review_count: handoffsExisting.length,
      candidates: candidates.slice(0, 50),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});