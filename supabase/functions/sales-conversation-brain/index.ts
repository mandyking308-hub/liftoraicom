// Sales Conversation Brain — internal analysis only.
// No external customer contact. No provider call. No payment.
// Live-first: prepares structured sales conversation output for founder review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIGateway } from "../_shared/aiGateway.ts";
import {
  assertCustomerSalesBusiness,
  CustomerSalesScopeError,
  filterCustomerSalesOffers,
  requireCustomerSalesBusinessId,
  resolveCustomerSalesRecommendation,
} from "../_shared/customerSalesScope.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SignalRow = { signal_key: string; signal_kind: string; label: string; keywords: string[]; weight: number };

function detectSignals(text: string, library: SignalRow[]) {
  const t = (text || "").toLowerCase();
  const buying: string[] = [];
  const objections: string[] = [];
  const sensitive: string[] = [];
  for (const s of library) {
    if (!s.keywords?.length) continue;
    if (s.keywords.some((k) => k && t.includes(k.toLowerCase()))) {
      if (s.signal_kind === "objection") objections.push(s.signal_key);
      else if (s.signal_kind === "sensitive") sensitive.push(s.signal_key);
      else buying.push(s.signal_key);
    }
  }
  return { buying, objections, sensitive };
}

const ALLOWED_STAGES = [
  "greeting","consent_notice","discovery","qualification","product_match",
  "objection_handling","close_attempt","close_action_prepared","follow_up_needed",
  "closed_won","closed_lost","escalated",
] as const;

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const body = await req.json().catch(() => ({} as any));
  const conversation_id: string | undefined = body.conversation_id;
  const transcript: string = (body.transcript || body.customer_message || "").toString();
  if (!conversation_id) return json({ error: "conversation_id required" }, 400);
  if (!transcript.trim()) return json({ error: "transcript or customer_message required" }, 400);

  const { data: conv } = await sb.from("customer_sales_conversations").select("*").eq("id", conversation_id).maybeSingle();
  if (!conv) return json({ error: "conversation not found" }, 404);

  let businessId: string;
  try {
    businessId = requireCustomerSalesBusinessId(conv.business_id);
  } catch (error) {
    return json({ ok: false, error: (error as CustomerSalesScopeError).code }, 409);
  }
  const { data: business, error: businessError } = await sb.from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (businessError || !business) return json({ ok: false, error: "business_context_invalid" }, 409);

  if (conv.business_contact_relationship_id) {
    const { data: relationship, error: relationshipError } = await sb.from("business_contact_relationships")
      .select("id,contact_id,business_id")
      .eq("id", conv.business_contact_relationship_id)
      .maybeSingle();
    if (relationshipError) return json({ ok: false, error: "business_contact_relationship_unavailable" }, 503);
    if (!relationship || relationship.business_id !== businessId || relationship.contact_id !== conv.contact_id) {
      return json({ ok: false, error: "business_contact_relationship_context_mismatch" }, 409);
    }
  }

  const playbookId = body.playbook_id ?? conv.playbook_id;
  const productId = body.product_id ?? conv.product_id;
  const offerId = body.offer_id ?? conv.offer_id;
  const [
    { data: playbook, error: playbookError },
    { data: productRows, error: productError },
    { data: offerRows, error: offerError },
    { data: library },
    { data: stateRow },
  ] = await Promise.all([
    playbookId
      ? sb.from("customer_sales_playbooks").select("*").eq("id", playbookId).eq("business_id", businessId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from("customer_sales_products").select("*").eq("business_id", businessId).eq("active", true).limit(500),
    sb.from("customer_sales_offers").select("*").eq("business_id", businessId).eq("active", true).limit(500),
    sb.from("customer_sales_signal_library").select("signal_key,signal_kind,label,keywords,weight").eq("active", true),
    sb.from("customer_sales_conversation_states").select("*").eq("conversation_id", conversation_id).maybeSingle(),
  ]);

  if (playbookError || productError || offerError) {
    return json({ ok: false, error: "business_catalog_unavailable" }, 503);
  }

  const products = (productRows ?? []).filter((row: any) => row.business_id === businessId);
  const productIds = new Set<string>(products.map((row: any) => row.id));
  const offers = filterCustomerSalesOffers(offerRows ?? [], businessId, productIds);
  const offerIds = new Set<string>(offers.map((row: any) => row.id));

  if (playbookId) {
    try {
      assertCustomerSalesBusiness(playbook, businessId, "playbook");
    } catch (error) {
      return json({ ok: false, error: (error as CustomerSalesScopeError).code }, 409);
    }
    if (playbook.product_id && !productIds.has(playbook.product_id)) {
      return json({ ok: false, error: "playbook_product_not_in_business" }, 409);
    }
    if (playbook.offer_id && !offerIds.has(playbook.offer_id)) {
      return json({ ok: false, error: "playbook_offer_not_in_business" }, 409);
    }
  }

  if (productId && !productIds.has(productId)) return json({ ok: false, error: "product_not_in_business" }, 409);
  if (offerId && !offerIds.has(offerId)) return json({ ok: false, error: "offer_not_in_business" }, 409);
  if (playbook?.product_id && productId && playbook.product_id !== productId) {
    return json({ ok: false, error: "playbook_product_mismatch" }, 409);
  }
  if (playbook?.offer_id && offerId && playbook.offer_id !== offerId) {
    return json({ ok: false, error: "playbook_offer_mismatch" }, 409);
  }

  const effectiveOfferId = offerId ?? playbook?.offer_id ?? null;
  const selectedOffer = effectiveOfferId ? offers.find((row: any) => row.id === effectiveOfferId) ?? null : null;
  const effectiveProductId = productId ?? playbook?.product_id ?? selectedOffer?.product_id ?? null;
  const product = effectiveProductId ? products.find((row: any) => row.id === effectiveProductId) ?? null : null;
  if (effectiveProductId && !product) return json({ ok: false, error: "product_not_in_business" }, 409);
  if (selectedOffer?.product_id && effectiveProductId && selectedOffer.product_id !== effectiveProductId) {
    return json({ ok: false, error: "offer_product_mismatch" }, 409);
  }

  const detected = detectSignals(transcript, (library as SignalRow[]) || []);

  // Build brain prompt
  const systemMsg = [
    "You are Liftor's internal Sales Conversation Brain.",
    "You analyse a customer message + sales context and return structured JSON only.",
    "You NEVER invent pricing, claims, guarantees, availability or discounts not present in the supplied product knowledge.",
    "If product knowledge or playbook is missing required info, set founder_approval_required=true and recommend escalation.",
    "Allowed stages: " + ALLOWED_STAGES.join(", "),
  ].join(" ");

  const context = {
    playbook: playbook ? {
      use_case: playbook.use_case,
      opening: playbook.opening_script,
      consent_notice: playbook.consent_notice,
      tone: playbook.tone_of_voice,
      discovery_questions: playbook.discovery_questions,
      qualification_rules: playbook.qualification_rules,
      product_matching_logic: playbook.product_matching_logic,
      approved_claims: playbook.approved_claims,
      prohibited_claims: playbook.prohibited_claims,
      do_not_say: playbook.do_not_say_rules,
      objection_responses: playbook.objection_responses,
      closing_questions: playbook.closing_questions,
      close_action_allowed: playbook.close_action_allowed,
      escalation_triggers: playbook.escalation_triggers,
      compliance_notes: playbook.compliance_notes,
    } : null,
    product,
    available_products: products,
    selected_offer: selectedOffer,
    offers,
    previous_state: stateRow ? { stage: stateRow.stage, required_info_collected: stateRow.required_info_collected } : null,
    deterministic_signals: detected,
    customer_message: transcript,
  };

  const userMsg = [
    "Analyse the conversation context below and return strict JSON with this shape:",
    `{
  "stage": "<one of allowed stages>",
  "customer_need": "<short>",
  "recommended_product_id": "<uuid or null>",
  "recommended_offer_id": "<uuid or null>",
  "qualification_score": 0-100,
  "buying_signals": ["..."],
  "objections": ["..."],
  "close_probability": 0.0-1.0,
  "recommended_next_action": "<short>",
  "next_best_question": "<short>",
  "founder_approval_required": true|false,
  "suggested_follow_up": "<short>",
  "escalation_reason": "<short or null>",
  "claim_violations": ["..."],
  "rationale": "<one paragraph>"
}`,
    "Context JSON:",
    JSON.stringify(context).slice(0, 14000),
  ].join("\n");

  const runRow = {
    conversation_id,
    business_id: businessId,
    product_id: effectiveProductId,
    playbook_id: playbookId,
    input_transcript: transcript,
    input_context: context as any,
    status: "pending",
  } as any;
  const { data: brainRun } = await sb.from("customer_sales_brain_runs").insert(runRow).select("id").maybeSingle();

  const result = await callAIGateway({
    business_id: businessId,
    action_type: "sales_conversation_brain",
    task_category: "sales_intelligence",
    request_type: "sales_brain_analysis",
    conversation_id,
    model: body.model || "google/gemini-2.5-flash",
    risk_level: "low",
    approval_required: false,
    response_format: { type: "json_object" },
    metadata: { conversation_id, playbook_id: playbookId, product_id: effectiveProductId, offer_id: effectiveOfferId },
    messages: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
  });

  let parsed: any = {};
  try {
    const txt = result?.data?.choices?.[0]?.message?.content ?? "{}";
    parsed = typeof txt === "string" ? JSON.parse(txt) : txt;
  } catch (_) { parsed = {}; }

  // Merge deterministic signals with LLM signals
  const buyingSignals = Array.from(new Set([...(parsed.buying_signals || []), ...detected.buying]));
  const objectionsAll = Array.from(new Set([...(parsed.objections || []), ...detected.objections]));
  const stage = ALLOWED_STAGES.includes(parsed.stage) ? parsed.stage : (stateRow?.stage || "discovery");
  const productRecommendation = resolveCustomerSalesRecommendation(parsed.recommended_product_id, productIds);
  const offerRecommendation = resolveCustomerSalesRecommendation(parsed.recommended_offer_id, offerIds);

  // Force approval if sensitive or claim violations or low product knowledge
  let needsApproval = !!parsed.founder_approval_required;
  if (detected.sensitive.length) needsApproval = true;
  if ((parsed.claim_violations || []).length) needsApproval = true;
  if (playbook?.close_action_allowed && playbook.close_action_allowed !== "auto") needsApproval = true;
  if (productRecommendation.blocked || offerRecommendation.blocked) needsApproval = true;

  const brainOutput = {
    stage,
    customer_need: parsed.customer_need || null,
    recommended_product_id: productRecommendation.blocked ? null : (productRecommendation.id || effectiveProductId),
    recommended_offer_id: offerRecommendation.blocked ? null : (offerRecommendation.id || effectiveOfferId),
    qualification_score: typeof parsed.qualification_score === "number" ? parsed.qualification_score : null,
    buying_signals: buyingSignals,
    objections: objectionsAll,
    sensitive_signals: detected.sensitive,
    close_probability: typeof parsed.close_probability === "number" ? parsed.close_probability : null,
    recommended_next_action: parsed.recommended_next_action || null,
    next_best_question: parsed.next_best_question || null,
    founder_approval_required: needsApproval,
    suggested_follow_up: parsed.suggested_follow_up || null,
    escalation_reason: parsed.escalation_reason || (detected.sensitive.length
      ? "Sensitive signal detected"
      : (productRecommendation.blocked || offerRecommendation.blocked ? "Catalog recommendation requires same-business review" : null)),
    claim_violations: parsed.claim_violations || [],
    rationale: parsed.rationale || null,
    model: result.data?.model || body.model || "google/gemini-2.5-flash",
    trace_id: result.trace_id,
    catalog_reference_blocked: productRecommendation.blocked || offerRecommendation.blocked,
  };

  // Upsert state row
  const newHistory = [
    ...((stateRow?.stage_history as any[]) || []),
    { at: new Date().toISOString(), from: stateRow?.stage || null, to: stage, signals: buyingSignals, objections: objectionsAll },
  ].slice(-50);

  if (stateRow) {
    await sb.from("customer_sales_conversation_states").update({
      previous_stage: stateRow.stage,
      stage,
      signals_detected: buyingSignals,
      objections_detected: objectionsAll,
      next_best_question: brainOutput.next_best_question,
      escalation_reason: brainOutput.escalation_reason,
      stage_history: newHistory,
      brain_output: brainOutput,
    }).eq("id", stateRow.id);
  } else {
    await sb.from("customer_sales_conversation_states").insert({
      conversation_id,
      stage,
      signals_detected: buyingSignals,
      objections_detected: objectionsAll,
      next_best_question: brainOutput.next_best_question,
      escalation_reason: brainOutput.escalation_reason,
      stage_history: newHistory,
      brain_output: brainOutput,
    });
  }

  await sb.from("customer_sales_conversations").update({
    customer_need: brainOutput.customer_need,
    objections_raised: objectionsAll,
    buying_signals: buyingSignals,
    qualification_score: brainOutput.qualification_score,
    close_probability: brainOutput.close_probability,
    recommended_next_action: brainOutput.recommended_next_action,
    founder_approval_required: needsApproval,
    external_action_locked: true,
    conversation_status: stage === "closed_won" ? "won" : stage === "closed_lost" ? "lost" : stage === "escalated" ? "escalated" : "active",
  }).eq("id", conversation_id);

  if (brainRun?.id) {
    await sb.from("customer_sales_brain_runs").update({
      output: brainOutput,
      model: brainOutput.model,
      tokens_in: result.prompt_tokens,
      tokens_out: result.completion_tokens,
      status: result.status === "completed" ? "completed" : "failed",
      error: result.error || null,
    }).eq("id", brainRun.id);
  }

  return json({ ok: true, brain: brainOutput, gateway_status: result.status, trace_id: result.trace_id });
});
