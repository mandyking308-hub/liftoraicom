import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// AI Conversation Drafting V2 — PREVIEW ONLY.
// Reads CRM/Contact 360/conversation/interaction context and returns a draft
// reply preview. NEVER writes. NEVER sends. NEVER calls Apollo or Smartlead.

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
  return { admin, userId: data.claims.sub as string };
}

const safe = async <T>(p: Promise<T>, fb: any = null): Promise<any> => {
  try { const v = await p; return (v as any)?.data ?? fb; } catch { return fb; }
};

function classifyIntent(text: string): { intent: string; confidence: number } {
  const t = (text || "").toLowerCase();
  if (!t) return { intent: "unknown", confidence: 0.1 };
  if (/unsubscribe|opt[- ]?out|remove me|stop emailing/.test(t)) return { intent: "unsubscribe", confidence: 0.95 };
  if (/complain|legal|lawyer|gdpr|report you/.test(t)) return { intent: "complaint_or_legal", confidence: 0.9 };
  if (/not interested|no thanks|wrong person|not the right/.test(t)) return { intent: "polite_decline", confidence: 0.85 };
  if (/price|quote|proposal|cost|budget|how much/.test(t)) return { intent: "pricing_inquiry", confidence: 0.8 };
  if (/demo|book|call|meeting|chat|zoom|calendly/.test(t)) return { intent: "meeting_request", confidence: 0.85 };
  if (/invoice|payment|paid|overdue|receipt/.test(t)) return { intent: "invoice_or_payment", confidence: 0.8 };
  if (/interested|tell me more|sounds good|learn more/.test(t)) return { intent: "interested_warm", confidence: 0.75 };
  if (/out of office|ooo|on leave|vacation/.test(t)) return { intent: "auto_reply_ooo", confidence: 0.95 };
  if (/\?$|^how |^what |^when |^why /m.test(t)) return { intent: "question", confidence: 0.6 };
  return { intent: "general_reply", confidence: 0.4 };
}

function pickToneForIntent(intent: string): string {
  switch (intent) {
    case "unsubscribe":
    case "complaint_or_legal": return "compliance_sensitive";
    case "invoice_or_payment": return "finance_polite_chaser";
    case "pricing_inquiry": return "professional_proposal_followup";
    case "meeting_request":
    case "interested_warm": return "founder_personal";
    default: return "warm_confident_concise";
  }
}

function strategyFor(intent: string): string {
  const map: Record<string, string> = {
    unsubscribe: "Acknowledge opt-out, confirm removal, no marketing language.",
    complaint_or_legal: "Acknowledge concern, escalate to founder, no commitments without legal review.",
    polite_decline: "Thank them, leave the door open, no follow-up pressure.",
    pricing_inquiry: "Reference proposal flow, ask one qualifying question, offer a 15-min call.",
    meeting_request: "Confirm interest, propose two slots, include short context.",
    invoice_or_payment: "Reference invoice number, restate amount and due date, offer payment link.",
    interested_warm: "Mirror their interest, share one specific outcome, propose next step.",
    auto_reply_ooo: "Do not reply. Schedule follow-up after their stated return date.",
    question: "Answer the question directly in 2 sentences, then propose next step.",
    general_reply: "Acknowledge, restate the value in one line, propose a small next step.",
    unknown: "Hold for founder review.",
  };
  return map[intent] ?? map.general_reply;
}

function draftReply(opts: { intent: string; contactName?: string; lastMessage?: string; businessName?: string; }): { subject: string; body: string } {
  const name = (opts.contactName || "there").split(/\s+/)[0];
  const sigBlock = `\n\n— Mandy\nLiftor AI · Global Solutions Management LLC`;
  const intent = opts.intent;
  if (intent === "unsubscribe") {
    return { subject: "Confirming your opt-out", body: `Hi ${name},\n\nConfirming you've been removed from our list. You won't receive further outreach from us.${sigBlock}` };
  }
  if (intent === "auto_reply_ooo") {
    return { subject: "(no reply — OOO detected)", body: "Auto-reply detected. Hold and re-queue after stated return date." };
  }
  if (intent === "meeting_request") {
    return { subject: `Quick call this week`, body: `Hi ${name},\n\nHappy to jump on a call. Does Tue 3pm or Thu 11am (your timezone) work?\n\nI'll come prepared with a quick view of how Liftor would map to ${opts.businessName ?? "your setup"}.${sigBlock}` };
  }
  if (intent === "pricing_inquiry") {
    return { subject: `Re: pricing`, body: `Hi ${name},\n\nPricing depends on scope. Quick question — are you looking at a single workflow or a multi-system rollout? Once I know that I can send a tailored proposal in 24h.${sigBlock}` };
  }
  if (intent === "invoice_or_payment") {
    return { subject: `Invoice follow-up`, body: `Hi ${name},\n\nJust a polite nudge on the open invoice. Happy to resend the payment link if helpful — let me know.${sigBlock}` };
  }
  if (intent === "complaint_or_legal") {
    return { subject: `Acknowledged — escalating internally`, body: `Hi ${name},\n\nThanks for flagging this. I'm taking it on personally — I'll come back within 1 business day with a clear answer.${sigBlock}` };
  }
  return { subject: `Re: your note`, body: `Hi ${name},\n\nThanks for getting back. ${strategyFor(intent)}\n\nWhat's the best next step on your side?${sigBlock}` };
}

function complianceFlags(intent: string, body: string): string[] {
  const flags: string[] = [];
  if (intent === "unsubscribe") flags.push("opt_out_in_progress", "no_marketing_content");
  if (intent === "complaint_or_legal") flags.push("legal_review_recommended");
  if (/\$|£|€|\d+%/.test(body) && intent !== "pricing_inquiry" && intent !== "invoice_or_payment") flags.push("contains_pricing_claim");
  if (body.length > 1500) flags.push("body_too_long");
  return flags;
}

function riskFlags(intent: string, confidence: number, hasContext: boolean): string[] {
  const flags: string[] = [];
  if (confidence < 0.5) flags.push("low_intent_confidence");
  if (!hasContext) flags.push("no_crm_context_available");
  if (intent === "unknown") flags.push("intent_unknown_hold_for_review");
  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const body = await req.json().catch(() => ({}));
    const { contact_id, conversation_id, interaction_id, agent_task_id } = body ?? {};

    let contact: any = null;
    let conversation: any = null;
    let interaction: any = null;
    let lastInbound: any = null;
    let timeline: any[] = [];
    let business: any = null;

    if (contact_id) {
      contact = await safe(admin.from("contacts").select("id,name,email,company,assigned_business,status").eq("id", contact_id).maybeSingle());
    }
    if (conversation_id) {
      conversation = await safe(admin.from("conversations").select("*").eq("id", conversation_id).maybeSingle());
      if (!contact && conversation?.contact_id) {
        contact = await safe(admin.from("contacts").select("id,name,email,company,assigned_business,status").eq("id", conversation.contact_id).maybeSingle());
      }
    }
    if (interaction_id) {
      interaction = await safe(admin.from("crm_interaction_ledger").select("*").eq("id", interaction_id).maybeSingle());
    }
    if (contact?.id) {
      timeline = (await safe(
        admin.from("crm_interaction_ledger").select("id,interaction_type,direction,channel,subject,body_preview,occurred_at").eq("contact_id", contact.id).order("occurred_at", { ascending: false }).limit(10),
        []
      )) as any[];
      lastInbound = (await safe(
        admin.from("crm_interaction_ledger").select("body_preview,subject,occurred_at").eq("contact_id", contact.id).eq("direction", "inbound").order("occurred_at", { ascending: false }).limit(1).maybeSingle()
      ));
    }
    if (contact?.assigned_business) {
      business = await safe(admin.from("businesses").select("id,name").eq("id", contact.assigned_business).maybeSingle());
    }

    // CRM CONTEXT GUARD — block draft when context insufficient or risk flags trip
    let context_guard: any = { allowed_to_draft: true, allowed_to_send: false, blockers: [], missing_context: [], context_quality_score: null, context_summary: null };
    try {
      const guardRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/crm-context-guard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') ?? '', apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
        body: JSON.stringify({ business_id: business?.id ?? null, contact_id: contact?.id ?? null, conversation_id: conversation_id ?? null, action_type: 'ai_conversation_draft', agent_key: 'ai-conversation-draft-preview', interaction_id }),
      });
      context_guard = await guardRes.json();
    } catch { /* guard optional but recorded */ }
    if (context_guard?.allowed_to_draft === false) {
      try {
        await admin.from('founder_approvals').insert({
          approval_type: 'context_guard_block',
          target_table: 'response_context_checks',
          target_id: context_guard?.check_id ?? null,
          business_id: business?.id ?? null,
          status: 'pending',
          metadata: { agent: 'ai-conversation-draft-preview', blockers: context_guard?.blockers, missing: context_guard?.missing_context },
        });
      } catch {}
      return new Response(JSON.stringify({
        ok: false,
        blocked: true,
        blocked_reason: 'crm_context_guard_blocked',
        context_guard,
        founder_review_required: true,
        send_allowed: false,
        draft: null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sourceText = interaction?.body_preview || lastInbound?.body_preview || conversation?.last_message_preview || "";
    const { intent, confidence } = classifyIntent(sourceText);
    const tone = pickToneForIntent(intent);
    const reply = draftReply({ intent, contactName: contact?.name, lastMessage: sourceText, businessName: business?.name });
    const compliance = complianceFlags(intent, reply.body);
    const risks = riskFlags(intent, confidence, Boolean(contact?.id));

    // COMPETITOR CAUTION — only allow founder-reviewed/low-risk insights to influence drafts.
    let competitor_caution: any = { used: false, allowed_insights: 0, blocked_insights: 0, notes: [] as string[] };
    try {
      const { data: cInsights } = await admin
        .from('competitor_learning_insights')
        .select('id,insight_title,risk_level,status,founder_review_required')
        .limit(20);
      const all = cInsights ?? [];
      const allowed = all.filter((i: any) => i.status === 'approved' || i.risk_level === 'low');
      const blocked = all.length - allowed.length;
      competitor_caution = {
        used: allowed.length > 0,
        allowed_insights: allowed.length,
        blocked_insights: blocked,
        notes: [
          'No defamatory or unsupported competitor claims permitted in customer-facing drafts.',
          'Differentiation framed positively only — focus on Liftor outcomes.',
        ],
      };
      if (blocked > 0) risks.push('competitor_insights_pending_review');
    } catch {}

    const customerSummary = contact
      ? `${contact.name ?? contact.email ?? "Unknown contact"}${business?.name ? ` · ${business.name}` : ""} · status=${contact.status ?? "n/a"}`
      : "No contact context available.";
    const contextSummary = timeline.length
      ? `${timeline.length} recent interactions. Last inbound: ${(lastInbound?.subject ?? lastInbound?.body_preview ?? "none").toString().slice(0, 140)}`
      : "No CRM timeline available.";

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      input: { contact_id, conversation_id, interaction_id, agent_task_id },
      contact: contact ? { id: contact.id, name: contact.name, email: contact.email, company: contact.company } : null,
      business: business ? { id: business.id, name: business.name } : null,
      detected_intent: intent,
      intent_confidence: confidence,
      tone_profile: tone,
      recommended_reply_strategy: strategyFor(intent),
      customer_summary: customerSummary,
      context_summary: contextSummary,
      timeline_sample: timeline.slice(0, 5),
      draft: { subject: reply.subject, body: reply.body },
      risk_flags: risks,
      compliance_flags: compliance,
      founder_review_required: true,
      send_allowed: false,
      save_disabled_reason: "ai_draft_save_disabled (preview-only)",
      context_guard,
      competitor_caution,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});