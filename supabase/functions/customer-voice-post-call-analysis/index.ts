// Customer Voice Provider — post-call analysis.
// Reads a transcript (from a call_log_id, conversation_id, or supplied text),
// runs it through the Liftor AI Gateway, and writes structured intelligence
// back to the call_log + conversation. Performs CRM handoff (contact link,
// approval/follow-up draft, optional close-action draft).
// NO external messages are sent. NO real call is made.
import {
  corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent,
  getProviderType, isInternalTestPayload,
} from "../_shared/voiceProviderShared.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_post_call_analysis",
    description: "Return structured post-call analysis. Never invent pricing or claims.",
    parameters: {
      type: "object",
      properties: {
        transcript_summary: { type: "string" },
        customer_memory_summary: { type: "string" },
        customer_need: { type: "string" },
        customer_pain: { type: "string" },
        product_match: { type: "string" },
        objections: { type: "array", items: { type: "string" } },
        buying_signals: { type: "array", items: { type: "string" } },
        sentiment_score: { type: "number", description: "-1 to 1" },
        qualification_score: { type: "number", description: "0 to 100" },
        close_probability: { type: "number", description: "0 to 1" },
        recommended_next_step: { type: "string" },
        follow_up_draft: { type: "string" },
        close_action_suggestion: { type: "string" },
        call_outcome: { type: "string", enum: ["interested","not_interested","qualified","disqualified","callback_requested","ready_to_buy","needs_proposal","escalate","no_outcome"] },
        escalation_needed: { type: "boolean" },
        escalation_reason: { type: "string" },
        founder_approval_required: { type: "boolean" },
        consent_concern: { type: "boolean" },
      },
      required: ["transcript_summary","call_outcome","recommended_next_step"],
      additionalProperties: false,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;
  if (!a.is_founder_or_admin) return json({ ok: false, error: "forbidden" }, 403);

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body, "custom");
  const internal = isInternalTestPayload(body);
  const test_label = internal ? "LIVE_INTERNAL_TEST" : (typeof body?.test_label === "string" ? body.test_label : null);

  let call_log_id: string | null = body?.call_log_id ?? null;
  let conversation_id: string | null = body?.conversation_id ?? null;
  let transcript: string = typeof body?.transcript === "string" ? body.transcript : "";

  let callLog: any = null;
  if (call_log_id) {
    const { data } = await a.admin.from("customer_sales_call_logs").select("*").eq("id", call_log_id).maybeSingle();
    callLog = data;
    if (!transcript && data?.transcript_text) transcript = data.transcript_text;
    if (!conversation_id && data?.conversation_id) conversation_id = data.conversation_id;
  }

  let conversation: any = null;
  if (conversation_id) {
    const { data } = await a.admin.from("customer_sales_conversations").select("*").eq("id", conversation_id).maybeSingle();
    conversation = data;
  }

  if (!transcript || !transcript.trim()) {
    await recordRuntimeEvent({
      admin: a.admin, provider_type: provider, event_type: "post_call_analysis",
      event_status: "missing_transcript", conversation_id, call_log_id,
      external_action_attempted: false, internal_test: internal, test_label,
      payload: body, result: { ok: false, reason: "transcript_required" },
    });
    return json({ ok: false, error: "transcript_required" }, 400);
  }

  // Optional product/playbook context
  const productId = conversation?.product_id ?? body?.product_id ?? null;
  const playbookId = conversation?.playbook_id ?? body?.playbook_id ?? null;
  const [{ data: product }, { data: playbook }] = await Promise.all([
    productId ? a.admin.from("customer_sales_products").select("product_name,product_summary,target_customer,offers_summary,do_not_say,escalation_rules").eq("id", productId).maybeSingle() : Promise.resolve({ data: null }),
    playbookId ? a.admin.from("customer_sales_playbooks").select("playbook_name,use_case,approved_claims,prohibited_claims,close_action_allowed,consent_notice").eq("id", playbookId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const systemMsg = [
    "You are Liftor's internal Post-Call Analysis engine.",
    "Analyse the supplied transcript and return ONLY the submit_post_call_analysis tool call.",
    "Never invent pricing, guarantees, discounts, availability or claims not present in the supplied product knowledge.",
    "If consent or recording notice appears missing in the transcript, set consent_concern=true.",
    "If the customer asked legal/medical/financial advice, or pricing the rep cannot confirm, set escalation_needed=true and founder_approval_required=true.",
  ].join(" ");

  const userMsg = [
    "Context (JSON):",
    JSON.stringify({ product, playbook, conversation_status: conversation?.conversation_status, channel: conversation?.channel, direction: conversation?.direction }).slice(0, 6000),
    "",
    "Transcript:",
    transcript.slice(0, 14000),
  ].join("\n");

  const gateway = await callAIGateway({
    business_id: conversation?.business_id ?? callLog?.business_id ?? null,
    action_type: "post_call_analysis",
    task_category: "sales_intelligence",
    request_type: "post_call_analysis",
    conversation_id,
    model: body.model || "google/gemini-2.5-flash",
    risk_level: "low",
    approval_required: false,
    tools: [ANALYSIS_TOOL as any],
    tool_choice: { type: "function", function: { name: "submit_post_call_analysis" } } as any,
    metadata: { call_log_id, conversation_id, internal_test: internal },
    messages: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
  });

  let analysis: any = {};
  try {
    const tc = gateway?.data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments;
    analysis = typeof args === "string" ? JSON.parse(args) : (args ?? {});
  } catch (_) { analysis = {}; }

  const objections: string[] = Array.isArray(analysis.objections) ? analysis.objections : [];
  const buying_signals: string[] = Array.isArray(analysis.buying_signals) ? analysis.buying_signals : [];
  const escalation_needed = !!analysis.escalation_needed;
  const consent_concern = !!analysis.consent_concern;
  const needsApproval = !!analysis.founder_approval_required || escalation_needed || (playbook?.close_action_allowed && playbook.close_action_allowed !== "auto");

  // CRM handoff — link to contact by email if available
  let contact_id: string | null = callLog?.contact_id ?? null;
  let linked_contact_email: string | null = conversation?.linked_contact_email ?? null;
  const candidate_email = conversation?.customer_email ?? body?.customer_email ?? null;
  if (!contact_id && candidate_email) {
    const { data: hit } = await a.admin.rpc("customer_sales_link_contact_by_email", { p_email: candidate_email });
    if (hit) { contact_id = hit as unknown as string; linked_contact_email = candidate_email; }
  }

  // Update call log
  if (call_log_id) {
    await a.admin.from("customer_sales_call_logs").update({
      analysis_output: analysis,
      analysed_at: new Date().toISOString(),
      transcript_summary: analysis.transcript_summary ?? null,
      customer_need: analysis.customer_need ?? null,
      customer_pain: analysis.customer_pain ?? null,
      objections,
      buying_signals,
      sentiment_score: typeof analysis.sentiment_score === "number" ? analysis.sentiment_score : null,
      qualification_score: typeof analysis.qualification_score === "number" ? analysis.qualification_score : null,
      close_probability: typeof analysis.close_probability === "number" ? analysis.close_probability : null,
      recommended_next_step: analysis.recommended_next_step ?? null,
      follow_up_draft: analysis.follow_up_draft ?? null,
      close_action_suggestion: analysis.close_action_suggestion ?? null,
      escalation_reason: analysis.escalation_reason ?? null,
      outcome: analysis.call_outcome ?? callLog?.outcome ?? null,
      next_step: analysis.recommended_next_step ?? callLog?.next_step ?? null,
      contact_id: contact_id ?? callLog?.contact_id ?? null,
      test_label: test_label ?? callLog?.test_label ?? null,
    }).eq("id", call_log_id);
  }

  // Update conversation memory
  if (conversation_id) {
    await a.admin.from("customer_sales_conversations").update({
      transcript_summary: analysis.transcript_summary ?? conversation?.transcript_summary ?? null,
      customer_memory_summary: analysis.customer_memory_summary ?? analysis.transcript_summary ?? null,
      customer_need: analysis.customer_need ?? conversation?.customer_need ?? null,
      objections_raised: objections.length ? objections : (conversation?.objections_raised ?? []),
      buying_signals: buying_signals.length ? buying_signals : (conversation?.buying_signals ?? []),
      qualification_score: typeof analysis.qualification_score === "number" ? analysis.qualification_score : conversation?.qualification_score ?? null,
      sentiment_score: typeof analysis.sentiment_score === "number" ? analysis.sentiment_score : conversation?.sentiment_score ?? null,
      close_probability: typeof analysis.close_probability === "number" ? analysis.close_probability : conversation?.close_probability ?? null,
      recommended_next_action: analysis.recommended_next_step ?? conversation?.recommended_next_action ?? null,
      call_outcome: analysis.call_outcome ?? null,
      founder_approval_required: needsApproval,
      external_action_locked: true,
      last_call_log_id: call_log_id ?? conversation?.last_call_log_id ?? null,
      last_analysed_at: new Date().toISOString(),
      contact_id: contact_id ?? conversation?.contact_id ?? null,
      linked_contact_email,
      conversation_status: escalation_needed ? "escalated" : (analysis.call_outcome === "ready_to_buy" ? "follow_up_needed" : conversation?.conversation_status ?? "active"),
      test_label: test_label ?? conversation?.test_label ?? null,
    }).eq("id", conversation_id);
  }

  // Approval item — when external follow-up is needed
  let approval_id: string | null = null;
  if (needsApproval || (analysis.follow_up_draft && (analysis.call_outcome ?? "") !== "not_interested")) {
    try {
      const { data: appr } = await a.admin.from("founder_approval_items").insert({
        business_id: conversation?.business_id ?? null,
        approval_type: "customer_sales_follow_up",
        source_system: "customer_sales",
        source_table: "customer_sales_call_logs",
        source_id: call_log_id ?? conversation_id,
        contact_id,
        conversation_id,
        title: `Follow-up for ${conversation?.customer_name ?? conversation?.customer_email ?? "customer"}`,
        summary: analysis.transcript_summary ?? null,
        recommended_action: analysis.recommended_next_step ?? null,
        draft_body: analysis.follow_up_draft ?? null,
        priority_level: escalation_needed ? "high" : "normal",
        risk_flags: consent_concern ? ["consent_missing"] : [],
        status: "pending",
      }).select("id").maybeSingle();
      approval_id = appr?.id ?? null;
    } catch (_) { /* approval table optional */ }
  }

  // Close action draft if ready
  let close_action_id: string | null = null;
  if (analysis.call_outcome === "ready_to_buy" || (analysis.close_probability ?? 0) >= 0.7) {
    try {
      const { data: ca } = await a.admin.from("customer_sales_close_actions").insert({
        business_id: conversation?.business_id ?? null,
        conversation_id,
        contact_id,
        product_id: productId,
        offer_id: conversation?.offer_id ?? null,
        close_action_type: "follow_up_email",
        action_status: "draft",
        founder_approval_required: true,
        audit_metadata: {
          source: "post_call_analysis",
          suggestion: analysis.close_action_suggestion ?? null,
          test_label,
        },
      }).select("id").maybeSingle();
      close_action_id = ca?.id ?? null;
    } catch (_) { /* optional */ }
  }

  const result = {
    analysed: true, conversation_id, call_log_id, contact_id,
    approval_id, close_action_id,
    call_outcome: analysis.call_outcome ?? null,
    escalation_needed, consent_concern,
    founder_approval_required: needsApproval,
    external_call_made: false,
    gateway_status: gateway.status, trace_id: gateway.trace_id,
  };

  await recordRuntimeEvent({
    admin: a.admin, provider_type: provider, event_type: "post_call_analysis",
    event_status: "analysed", conversation_id, call_log_id,
    external_action_attempted: false, internal_test: internal, test_label,
    payload: { has_transcript: true, length: transcript.length },
    result,
  });

  return json({ ok: true, analysis, ...result });
});
