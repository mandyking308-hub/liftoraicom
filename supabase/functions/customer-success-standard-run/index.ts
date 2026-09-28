import { requireFounderOrCron } from "../_shared/callerAuth.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "npm:stripe@14.25.0";
import {
  customerRiskFlagsFromSignals,
  customerContextMatches,
  evaluateCustomerSuccessAction,
  resolveApprovedCommercialOffer,
  type CustomerSuccessActionType,
} from "../_shared/customerCommercialLifecycle.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isoDay(value = new Date()) { return value.toISOString().slice(0, 10); }
function daysFrom(value: Date, days: number) { return new Date(value.getTime() + days * 86400000); }

async function audit(admin: any, row: any, type: string, suffix: string, payload: Record<string, unknown> = {}) {
  const { error } = await admin.from("customer_commercial_audit_events").upsert({
    idempotency_key: `${row.idempotency_key}:${suffix}`,
    event_type: type,
    business_id: row.business_id,
    contact_id: row.contact_id,
    business_contact_relationship_id: row.business_contact_relationship_id,
    checkout_id: row.checkout_id ?? null,
    payment_id: row.action_payload?.payment_id ?? row.execution_result?.payment_id ?? null,
    event_payload: payload,
  }, { onConflict: "idempotency_key" });
  if (error) throw new Error(`commercial audit write failed: ${error.message}`);
}

async function upsertIdempotent(admin: any, table: string, row: any, idempotencyKey: string) {
  const { error } = await admin.from(table).upsert({ ...row, idempotency_key: idempotencyKey }, {
    onConflict: "idempotency_key", ignoreDuplicates: true,
  });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  const result = await admin.from(table).select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (result.error || !result.data) throw new Error(`${table} row lookup failed: ${result.error?.message ?? "missing row"}`);
  return result.data.id as string;
}

function currencyMinorUnits(amount: number, currency: string) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  return Math.round(amount * (10 ** digits));
}

async function executeStandardRefund(admin: any, row: any, payment: any, amount: number, currency: string) {
  const request = await admin.from("customer_success_refund_requests").upsert({
    idempotency_key: `customer-success-refund:${row.idempotency_key}`,
    business_id: row.business_id,
    contact_id: row.contact_id,
    business_contact_relationship_id: row.business_contact_relationship_id,
    checkout_id: row.checkout_id,
    payment_id: payment.id,
    requested_amount: amount,
    currency,
    status: "processing",
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (request.error) throw new Error(`standard refund reservation failed: ${request.error.message}`);
  const existing = await admin.from("customer_success_refund_requests").select("id,status,stripe_refund_id")
    .eq("idempotency_key", `customer-success-refund:${row.idempotency_key}`).maybeSingle();
  if (existing.error || !existing.data) throw new Error("standard refund reservation lookup failed");
  if (existing.data.status === "succeeded") {
    return { refund_request_id: existing.data.id, stripe_refund_id: existing.data.stripe_refund_id, status: "succeeded", replay: true };
  }

  const secret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!secret.startsWith("sk_test_")) throw new Error("test_mode_stripe_key_required_for_standard_refund");
  if (!payment.stripe_payment_intent_id) throw new Error("refundable_payment_intent_required");
  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const refund = await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id,
    amount: currencyMinorUnits(amount, currency),
    reason: "requested_by_customer",
    metadata: {
      business_id: row.business_id,
      contact_id: row.contact_id,
      checkout_id: row.checkout_id,
      customer_success_queue_id: row.id,
    },
  }, { idempotencyKey: `customer-success-refund-${row.idempotency_key}` });
  if (refund.status !== "succeeded" || refund.currency.toUpperCase() !== currency || refund.amount !== currencyMinorUnits(amount, currency)) {
    throw new Error("stripe_refund_not_confirmed_or_amount_mismatch");
  }

  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
  if (!chargeId) throw new Error("stripe_refund_charge_missing");
  const charge = await stripe.charges.retrieve(chargeId);
  const chargePaymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (chargePaymentIntent !== payment.stripe_payment_intent_id || charge.currency.toUpperCase() !== currency) {
    throw new Error("stripe_refund_charge_context_mismatch");
  }
  const currencyDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  const nextRefundTotal = charge.amount_refunded / (10 ** currencyDigits);
  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const paymentUpdate = await admin.from("qtc_payments").update({
    refund_amount: nextRefundTotal,
    payment_status: fullyRefunded ? "refunded" : "succeeded",
    refunded_at: fullyRefunded ? new Date().toISOString() : null,
    webhook_confirmation_source: "customer_success_standard_refund",
  }).eq("id", payment.id).eq("business_id", row.business_id).eq("contact_id", row.contact_id);
  if (paymentUpdate.error) throw new Error(`QTC refund state update failed: ${paymentUpdate.error.message}`);

  if (row.checkout_id) {
    const revenue = await admin.from("qtc_revenue_confirmations").select("id,revenue_amount,revenue_type,metadata_json")
      .eq("customer_sales_checkout_id", row.checkout_id).maybeSingle();
    if (revenue.error || !revenue.data) throw new Error("QTC revenue linkage missing for standard refund");
    const originalRevenue = Number(revenue.data.metadata_json?.original_revenue_amount ?? revenue.data.revenue_amount ?? 0);
    const revenueUpdate = await admin.from("qtc_revenue_confirmations").update({
      revenue_amount: Math.max(0, originalRevenue - nextRefundTotal),
      revenue_type: fullyRefunded ? "refund" : revenue.data.revenue_type,
      metadata_json: { ...(revenue.data.metadata_json ?? {}), original_revenue_amount: originalRevenue, last_standard_refund_id: refund.id, total_refunded: nextRefundTotal, test_mode: true },
    }).eq("id", revenue.data.id);
    if (revenueUpdate.error) throw new Error(`QTC revenue refund linkage failed: ${revenueUpdate.error.message}`);
  }

  const saved = await admin.from("customer_success_refund_requests").update({ status: "succeeded", stripe_refund_id: refund.id })
    .eq("id", existing.data.id).eq("status", "processing");
  if (saved.error) throw new Error(`standard refund result write failed: ${saved.error.message}`);
  return { refund_request_id: existing.data.id, stripe_refund_id: refund.id, amount, currency, status: "succeeded" };
}

async function currentRiskFlags(admin: any, row: any): Promise<string[]> {
  const [complaints, disputes, support, intakes] = await Promise.all([
    admin.from("customer_complaints").select("complaint_status,compliance_review_required,legal_review_recommended,risk_flags").eq("business_id", row.business_id).eq("contact_id", row.contact_id).limit(50),
    admin.from("customer_disputes").select("dispute_status,compliance_review_required,legal_review_recommended").eq("business_id", row.business_id).eq("contact_id", row.contact_id).limit(50),
    admin.from("support_interaction_reviews").select("urgency,escalation_required,founder_review_required,status").eq("business_id", row.business_id).eq("contact_id", row.contact_id).limit(50),
    admin.from("support_question_intake").select("id,question_status,detected_intent,detected_category,urgency,risk_level,founder_review_required")
      .eq("business_id", row.business_id).eq("crm_contact_id", row.contact_id).limit(50),
  ]);
  if (complaints.error || disputes.error || support.error || intakes.error) return ["low_ai_confidence"];
  const intakeIds = (intakes.data ?? []).map((item: any) => item.id);
  let triageReviews: any[] = [];
  let supportEscalations: any[] = [];
  if (intakeIds.length) {
    const [triage, escalations] = await Promise.all([
      admin.from("support_triage_reviews").select("triage_status,urgency,risk_level,founder_review_required,compliance_review_required,legal_review_required")
        .eq("business_id", row.business_id).in("question_intake_id", intakeIds).limit(50),
      admin.from("support_escalations").select("escalation_type,escalation_status,founder_review_required")
        .eq("business_id", row.business_id).in("question_intake_id", intakeIds).limit(50),
    ]);
    if (triage.error || escalations.error) return ["low_ai_confidence"];
    triageReviews = triage.data ?? [];
    supportEscalations = escalations.data ?? [];
  }
  return customerRiskFlagsFromSignals({
    existing: row.risk_flags ?? [],
    complaints: complaints.data ?? [],
    disputes: disputes.data ?? [],
    supportReviews: support.data ?? [],
    supportIntakes: intakes.data ?? [],
    triageReviews,
    supportEscalations,
  });
}

async function loadScopedContext(admin: any, row: any) {
  const business = await admin.from("businesses").select("id,name").eq("id", row.business_id).maybeSingle();
  if (business.error || !business.data) throw new Error("business_context_invalid");
  const contact = await admin.from("contacts").select("id,name,email").eq("id", row.contact_id).maybeSingle();
  if (contact.error || !contact.data) throw new Error("contact_context_invalid");
  const relationships = await admin.from("business_contact_relationships").select("*")
    .eq("id", row.business_contact_relationship_id).eq("contact_id", row.contact_id).eq("business_id", row.business_id).limit(2);
  if (relationships.error || (relationships.data ?? []).length !== 1) throw new Error("business_contact_relationship_mismatch");
  const profile = row.success_profile_id
    ? await admin.from("customer_success_profiles").select("id,business_id,crm_contact_id,business_contact_relationship_id,purchased_offer,customer_email,customer_name")
      .eq("id", row.success_profile_id).maybeSingle()
    : { data: null, error: null };
  if (profile.error || (row.success_profile_id && (!profile.data || !customerContextMatches(profile.data, {
    businessId: row.business_id, contactId: row.contact_id, relationshipId: row.business_contact_relationship_id,
  })))) throw new Error("customer_success_profile_context_mismatch");
  let checkout: any = null;
  if (row.checkout_id) {
    const result = await admin.from("customer_sales_checkout_intents")
      .select("id,business_id,contact_id,business_contact_relationship_id,status,test_mode")
      .eq("id", row.checkout_id).maybeSingle();
    if (result.error || !result.data || !customerContextMatches(result.data, {
      businessId: row.business_id, contactId: row.contact_id, relationshipId: row.business_contact_relationship_id,
    }) || result.data.status !== "paid" || result.data.test_mode !== true) throw new Error("checkout_customer_context_mismatch");
    checkout = result.data;
  }
  let onboardingPlan: any = null;
  if (row.onboarding_plan_id) {
    let query = admin.from("customer_onboarding_plans")
      .select("id,business_id,contact_id,crm_contact_id,business_contact_relationship_id,customer_sales_checkout_id")
      .eq("id", row.onboarding_plan_id);
    if (row.checkout_id) query = query.eq("customer_sales_checkout_id", row.checkout_id);
    const result = await query.maybeSingle();
    if (result.error || !result.data || !customerContextMatches(result.data, {
      businessId: row.business_id, contactId: row.contact_id, relationshipId: row.business_contact_relationship_id,
    })) throw new Error("onboarding_plan_context_mismatch");
    onboardingPlan = result.data;
  }
  return { business: business.data, contact: contact.data, relationship: relationships.data[0], profile: profile.data, checkout, onboardingPlan };
}

async function materialize(admin: any, row: any, context: any, actionType: CustomerSuccessActionType, validated: any) {
  const now = new Date();
  const day = isoDay(now);
  const payload = row.action_payload ?? {};
  const common = {
    business_id: row.business_id,
    business_contact_relationship_id: row.business_contact_relationship_id,
    customer_sales_checkout_id: row.checkout_id ?? null,
    contact_id: row.contact_id,
    success_profile_id: row.success_profile_id ?? null,
    is_test_data: payload.test_mode === true,
    metadata: { customer_success_queue_id: row.id, idempotency_key: row.idempotency_key, external_provider_send: false },
  };

  if (actionType === "onboarding_welcome") {
    const pack = await admin.from("customer_welcome_packs").select("id,pack_status,approval_status,external_share_allowed")
      .eq("customer_sales_checkout_id", row.checkout_id).eq("business_id", row.business_id).maybeSingle();
    if (pack.error || !pack.data || pack.data.approval_status !== "approved") throw new Error("approved_welcome_journey_missing");
    return { result: { prepared: true, welcome_pack_id: pack.data.id, external_share_allowed: false }, auditType: "customer_welcome_journey_ready" };
  }

  if (actionType === "onboarding_start") {
    const plan = await admin.from("customer_onboarding_plans").select("id,onboarding_status,approval_status,founder_review_required")
      .eq("customer_sales_checkout_id", row.checkout_id).eq("business_id", row.business_id).maybeSingle();
    if (plan.error || !plan.data || plan.data.onboarding_status !== "active" || plan.data.approval_status !== "approved" || plan.data.founder_review_required) {
      throw new Error("approved_standard_onboarding_plan_missing");
    }
    return { result: { started: true, onboarding_plan_id: plan.data.id, founder_approval_required: false }, auditType: "customer_onboarding_started" };
  }

  if (actionType === "product_account_activation") {
    const accountId = payload.product_account_id;
    const account = accountId
      ? await admin.from("customer_product_accounts").select("id,account_scope,account_role,access_status,product_id")
        .eq("id", accountId).eq("business_id", row.business_id).eq("contact_id", row.contact_id).eq("checkout_id", row.checkout_id).maybeSingle()
      : { data: null, error: null };
    if (account.error || !account.data || account.data.account_scope !== "customer_product" || account.data.account_role !== "product_customer") {
      throw new Error("customer_product_account_missing_or_invalid");
    }
    return { result: { provisioned: true, account_id: account.data.id, access_status: account.data.access_status, account_role: "product_customer" }, auditType: "customer_product_account_provisioned" };
  }

  if (actionType === "refund") {
    if (validated.refundRequest?.status === "succeeded") {
      return { result: { refund_request_id: validated.refundRequest.id, stripe_refund_id: validated.refundRequest.stripe_refund_id, amount: validated.amount, currency: validated.currency, status: "succeeded", replay: true, payment_id: validated.payment.id }, auditType: "standard_customer_refund_succeeded" };
    }
    const refunded = await executeStandardRefund(admin, row, validated.payment, validated.amount, validated.currency);
    return { result: { ...refunded, payment_id: validated.payment.id }, auditType: "standard_customer_refund_succeeded" };
  }

  if (actionType === "ordinary_checkin") {
    const id = await upsertIdempotent(admin, "customer_success_checkins", {
      ...common,
      checkin_name: `Customer check-in — ${context.business.name}`,
      checkin_type: "standard_onboarding",
      checkin_status: "scheduled",
      scheduled_for: day,
      checkin_goal: "Confirm progress, unblock setup and record first value.",
      question_prompts: ["What is working well?", "What is blocked?", "What should happen next?"],
      customer_message_draft: "Your scheduled customer check-in is ready. Reply to your account team with any questions.",
      founder_attention_needed: false,
      external_send_allowed: false,
      approval_status: "approved",
      metadata: { ...common.metadata, provider_gate_required: true },
    }, row.idempotency_key);
    return { result: { checkin_id: id, scheduled_for: day, external_send_allowed: false }, auditType: "standard_customer_checkin_scheduled" };
  }

  if (actionType === "approved_survey") {
    const templateId = payload.survey_template_id;
    if (!templateId) throw new Error("approved_survey_template_required");
    const template = await admin.from("customer_survey_templates").select("id,business_id,template_key,survey_type,questions,active,auto_send_allowed,founder_approval_required")
      .eq("id", templateId).maybeSingle();
    if (template.error || !template.data || (template.data.business_id && template.data.business_id !== row.business_id) ||
        template.data.active !== true || template.data.auto_send_allowed !== true || template.data.founder_approval_required !== false) {
      throw new Error("approved_survey_template_invalid");
    }
    const id = await upsertIdempotent(admin, "customer_satisfaction_surveys", {
      ...common,
      survey_name: `${context.business.name} customer check-in`,
      survey_type: template.data.survey_type,
      survey_status: "scheduled",
      questions: template.data.questions ?? [],
      scheduled_for: day,
      external_send_allowed: false,
      approval_status: "approved",
      metadata: { ...common.metadata, template_id: template.data.id, template_key: template.data.template_key, provider_gate_required: true },
    }, row.idempotency_key);
    return { result: { survey_id: id, template_id: template.data.id, scheduled_for: day, external_send_allowed: false }, auditType: "approved_customer_survey_scheduled" };
  }

  if (actionType === "approved_support_response") {
    const faqId = payload.support_faq_item_id;
    if (!faqId) throw new Error("approved_support_faq_required");
    const faq = await admin.from("support_faq_items").select("id,business_id,source_id,question,answer,faq_status,source_references,missing_source_flags,risk_flags,compliance_warnings,founder_review_required,approval_status")
      .eq("id", faqId).eq("business_id", row.business_id).maybeSingle();
    if (faq.error || !faq.data || !faq.data.answer?.trim() || !["active", "approved_internal"].includes(faq.data.faq_status) || faq.data.approval_status !== "approved" ||
        faq.data.founder_review_required || (faq.data.missing_source_flags ?? []).length || (faq.data.risk_flags ?? []).length || (faq.data.compliance_warnings ?? []).length) {
      throw new Error("approved_support_content_invalid");
    }
    const source = faq.data.source_id
      ? await admin.from("support_knowledge_sources").select("id,business_id,approved_for_support,source_status,risk_flags").eq("id", faq.data.source_id).eq("business_id", row.business_id).maybeSingle()
      : { data: null, error: null };
    if (source.error || !source.data || source.data.approved_for_support !== true || source.data.source_status !== "approved" || (source.data.risk_flags ?? []).length) {
      throw new Error("approved_support_source_required");
    }
    const id = await upsertIdempotent(admin, "support_reply_drafts", {
      business_id: row.business_id,
      contact_id: row.contact_id,
      business_contact_relationship_id: row.business_contact_relationship_id,
      crm_contact_id: row.contact_id,
      reply_type: "approved_customer_success_response",
      reply_status: "ready",
      reply_channel: "email",
      subject_line: `Re: ${faq.data.question}`,
      reply_body: faq.data.answer,
      source_references: faq.data.source_references ?? [],
      missing_source_flags: [],
      compliance_warnings: [],
      risk_flags: [],
      founder_review_required: false,
      external_send_allowed: false,
      is_test_data: true,
      metadata: { source_faq_id: faq.data.id, provider_gate_required: true, automated_standard_response: true },
    }, row.idempotency_key);
    return { result: { support_reply_draft_id: id, faq_id: faq.data.id, external_send_allowed: false }, auditType: "approved_support_response_prepared" };
  }

  if (actionType === "renewal_workflow") {
    const id = await upsertIdempotent(admin, "customer_renewal_reviews", {
      ...common,
      renewal_name: `${context.business.name} standard renewal review`,
      renewal_status: "scheduled",
      renewal_probability: "unknown",
      retention_risk_level: "low",
      reasons_to_renew: ["Current product access remains active."],
      recommended_actions: ["Review customer progress and renewal timing."],
      external_send_allowed: false,
      approval_status: "approved",
      is_test_data: true,
      metadata: { ...common.metadata, provider_gate_required: true },
    }, row.idempotency_key);
    return { result: { renewal_review_id: id, approval_required: false, external_send_allowed: false }, auditType: "standard_renewal_review_scheduled" };
  }

  if (actionType === "approved_upsell_cross_sell") {
    const offer = validated.offer;
    const id = await upsertIdempotent(admin, "customer_upsell_opportunities", {
      ...common,
      opportunity_name: `${offer.offer_name} for ${context.contact.name ?? context.contact.email}`,
      opportunity_status: "qualified",
      opportunity_type: "approved_offer_cross_sell",
      current_offer: context.profile?.purchased_offer ?? null,
      suggested_offer: offer.offer_name,
      rationale: "Customer and offer satisfy the business-approved segment and price envelope.",
      confidence_score: Number(row.confidence_score ?? 1) * 100,
      estimated_value: validated.offerResolution.approvedPriceAmount,
      currency: validated.offerResolution.currency,
      risk_warnings: [],
      recommended_next_actions: ["Present the approved offer through the configured customer channel."],
      external_send_allowed: false,
      approval_status: "approved",
      is_test_data: true,
      metadata: { ...common.metadata, offer_id: offer.id, provider_gate_required: true },
    }, row.idempotency_key);
    return { result: { upsell_opportunity_id: id, offer_id: offer.id, external_send_allowed: false }, auditType: "approved_upsell_opportunity_created" };
  }

  if (actionType === "retention") {
    const id = await upsertIdempotent(admin, "customer_retention_risk_reviews", {
      ...common,
      review_name: `${context.business.name} routine retention review`,
      review_status: "monitoring",
      risk_level: "low",
      risk_reasons: [],
      support_signals: [],
      complaint_signals: [],
      finance_signals: [],
      engagement_signals: [],
      recommended_recovery_actions: ["Continue the approved customer check-in cadence."],
      founder_attention_needed: false,
      external_send_allowed: false,
      approval_status: "approved",
      is_test_data: true,
    }, row.idempotency_key);
    return { result: { retention_review_id: id, risk_level: "low", approval_required: false }, auditType: "standard_retention_review_created" };
  }

  if (actionType === "winback") {
    const id = await upsertIdempotent(admin, "customer_winback_plans", {
      ...common,
      plan_name: `${context.business.name} standard win-back plan`,
      plan_status: "draft",
      winback_reason: String(payload.winback_reason ?? "Customer re-engagement window"),
      churn_risk_level: "low",
      recommended_recovery_angle: "Offer a helpful account check-in using approved materials.",
      proposed_next_action: "Prepare an approved re-engagement message for the provider gate.",
      founder_review_required: false,
      founder_attention_needed: false,
      send_allowed: false,
      external_send_allowed: false,
      approval_status: "approved",
      is_test_data: true,
    }, row.idempotency_key);
    return { result: { winback_plan_id: id, approval_required: false, external_send_allowed: false }, auditType: "standard_winback_plan_created" };
  }

  throw new Error(`unsupported_customer_success_action:${actionType}`);
}

async function validateAction(admin: any, row: any, context: any, policy: any, riskFlags: string[]) {
  const actionType = String(row.action_type) as CustomerSuccessActionType;
  const payload = row.action_payload ?? {};
  let offer: any = null;
  let offerResolution: any = null;
  let refundPayment: any = null;
  let refundRequest: any = null;
  let approvedContent = actionType === "onboarding_welcome" || actionType === "onboarding_start" || actionType === "product_account_activation" || actionType === "ordinary_checkin" || actionType === "renewal_workflow" || actionType === "retention" || actionType === "winback";
  let paymentVerified = false;
  let amount: number | null = null;
  let currency: string | null = null;

  if (["onboarding_welcome", "onboarding_start", "product_account_activation"].includes(actionType)) {
    if (!row.checkout_id) throw new Error("verified_checkout_required");
    const intent = await admin.from("customer_sales_checkout_intents").select("id,status,test_mode,business_id,contact_id,business_contact_relationship_id")
      .eq("id", row.checkout_id).maybeSingle();
    if (intent.error || !intent.data || intent.data.status !== "paid" || intent.data.test_mode !== true ||
        intent.data.business_id !== row.business_id || intent.data.contact_id !== row.contact_id || intent.data.business_contact_relationship_id !== row.business_contact_relationship_id) {
      throw new Error("verified_paid_checkout_required");
    }
    paymentVerified = true;
  }

  if (actionType === "approved_survey") {
    const templateId = payload.survey_template_id;
    if (templateId) {
      const template = await admin.from("customer_survey_templates").select("id,business_id,active,auto_send_allowed,founder_approval_required")
        .eq("id", templateId).maybeSingle();
      approvedContent = !template.error && !!template.data && (!template.data.business_id || template.data.business_id === row.business_id) &&
        template.data.active === true && template.data.auto_send_allowed === true && template.data.founder_approval_required === false;
    }
  }

  if (actionType === "approved_support_response") {
    const faqId = payload.support_faq_item_id;
    if (faqId) {
      const faq = await admin.from("support_faq_items").select("id,source_id,answer,faq_status,missing_source_flags,risk_flags,compliance_warnings,founder_review_required,approval_status")
        .eq("id", faqId).eq("business_id", row.business_id).maybeSingle();
      if (!faq.error && faq.data?.source_id && faq.data.answer?.trim() && ["active", "approved_internal"].includes(faq.data.faq_status) && faq.data.approval_status === "approved" &&
          !faq.data.founder_review_required && !(faq.data.missing_source_flags ?? []).length && !(faq.data.risk_flags ?? []).length && !(faq.data.compliance_warnings ?? []).length) {
        const source = await admin.from("support_knowledge_sources").select("id,approved_for_support,source_status,risk_flags")
          .eq("id", faq.data.source_id).eq("business_id", row.business_id).maybeSingle();
        approvedContent = !source.error && !!source.data && source.data.approved_for_support === true && source.data.source_status === "approved" && !(source.data.risk_flags ?? []).length;
      }
    }
  }

  if (actionType === "approved_upsell_cross_sell") {
    const offerId = payload.offer_id;
    if (offerId) {
      const offerResult = await admin.from("customer_sales_offers").select("*").eq("id", offerId).eq("business_id", row.business_id).maybeSingle();
      if (!offerResult.error && offerResult.data?.product_id) {
        const product = await admin.from("customer_sales_products").select("*").eq("id", offerResult.data.product_id).eq("business_id", row.business_id).maybeSingle();
        if (!product.error && product.data) {
          const resolution = resolveApprovedCommercialOffer({
            businessId: row.business_id,
            contactId: row.contact_id,
            offer: offerResult.data,
            product: product.data,
            relationship: context.relationship,
            requestedDiscountPercent: 0,
          });
          if (resolution.ok) {
            offer = offerResult.data;
            offerResolution = resolution;
            amount = resolution.approvedPriceAmount;
            currency = resolution.currency;
          }
        }
      }
    }
  }

  if (actionType === "refund") {
    const paymentId = payload.payment_id;
    amount = Number(payload.amount);
    currency = typeof payload.currency === "string" ? payload.currency.toUpperCase() : null;
    if (!paymentId || !Number.isFinite(amount) || amount <= 0 || !currency) return { ok: false, reason: "refund_payment_amount_currency_required" };
    try {
      const roundedAmount = currencyMinorUnits(amount, currency) / (10 ** new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits);
      if (Math.abs(roundedAmount - amount) > 1e-8) return { ok: false, reason: "refund_amount_precision_invalid" };
    } catch {
      return { ok: false, reason: "refund_currency_invalid" };
    }
    const paymentResult = await admin.from("qtc_payments").select("id,business_id,contact_id,business_contact_relationship_id,customer_sales_checkout_id,amount,refund_amount,currency,payment_status,stripe_payment_intent_id,is_test_data,stripe_test_mode")
      .eq("id", paymentId).eq("business_id", row.business_id).eq("contact_id", row.contact_id)
      .eq("business_contact_relationship_id", row.business_contact_relationship_id).maybeSingle();
    const payment = paymentResult.data;
    const existingRequest = await admin.from("customer_success_refund_requests").select("id,status,stripe_refund_id,requested_amount,currency")
      .eq("idempotency_key", `customer-success-refund:${row.idempotency_key}`).maybeSingle();
    if (existingRequest.error) return { ok: false, reason: "refund_request_lookup_failed" };
    if (paymentResult.error || !payment || payment.customer_sales_checkout_id !== row.checkout_id ||
        !["succeeded", "refunded"].includes(payment.payment_status) || payment.is_test_data !== true || payment.stripe_test_mode !== true ||
        String(payment.currency ?? "").toUpperCase() !== currency ||
        (existingRequest.data
          ? Number(existingRequest.data.requested_amount) !== amount || String(existingRequest.data.currency).toUpperCase() !== currency
          : amount > Number(payment.amount) - Number(payment.refund_amount ?? 0))) {
      return { ok: false, reason: "refund_payment_context_invalid" };
    }
    if (String(policy?.policy_currency ?? "").toUpperCase() !== currency) return { ok: false, reason: "policy_currency_mismatch" };
    approvedContent = true;
    refundPayment = payment;
    refundRequest = existingRequest.data?.status === "succeeded" ? existingRequest.data : null;
  }

  const decision = evaluateCustomerSuccessAction({
    actionType,
    policy,
    riskFlags,
    confidence: row.confidence_score == null ? 1 : Number(row.confidence_score),
    approvedContent,
    approvedOffer: !!offerResolution,
    amount,
    currency,
    paymentVerified,
  });
  if (decision.mode !== "standard_auto") return { ok: false, reason: decision.reason };
  return { ok: true, actionType, offer, offerResolution, payment: refundPayment, refundRequest, amount, currency };
}

async function escalate(admin: any, row: any, reason: string, riskFlags: string[]) {
  await audit(admin, row, "customer_success_action_escalated", "escalated", { reason, risk_flags: riskFlags });
  const { error } = await admin.from("customer_success_automation_queue").update({
    execution_status: "escalated",
    execution_mode: "human_review",
    approval_required: true,
    escalation_reason: reason,
    risk_flags: riskFlags,
    last_error: null,
  }).eq("id", row.id).eq("execution_status", "processing");
  if (error) throw new Error(`customer success escalation write failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const caller = await requireFounderOrCron(req, corsHeaders);
  if ("error" in caller) return caller.error;

  const body = await req.json().catch(() => ({} as any));
  const businessId = typeof body?.business_id === "string" ? body.business_id : null;
  const requestedLimit = Number(body?.limit ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 50;
  if (businessId) {
    const business = await caller.admin.from("businesses").select("id").eq("id", businessId).maybeSingle();
    if (business.error || !business.data) return json({ ok: false, error: "business_context_invalid" }, 409);
  }

  const now = new Date();
  // Reclaim jobs left in processing after a crashed invocation. The updated_at
  // predicate makes this a compare-and-set so concurrent runners cannot steal
  // a fresh claim.
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  let staleQuery = caller.admin.from("customer_success_automation_queue").select("id,updated_at")
    .eq("execution_status", "processing").lt("updated_at", staleBefore).limit(limit);
  if (businessId) staleQuery = staleQuery.eq("business_id", businessId);
  const stale = await staleQuery;
  if (stale.error) return json({ ok: false, error: "customer_success_stale_queue_lookup_failed" }, 503);
  for (const item of stale.data ?? []) {
    const { error } = await caller.admin.from("customer_success_automation_queue").update({
      execution_status: "queued", last_error: "reclaimed_stale_processing_job", scheduled_at: now.toISOString(),
    }).eq("id", item.id).eq("execution_status", "processing").eq("updated_at", item.updated_at);
    if (!error) {
      const rowResult = await caller.admin.from("customer_success_automation_queue").select("*").eq("id", item.id).maybeSingle();
      if (!rowResult.error && rowResult.data) {
        await audit(caller.admin, rowResult.data, "customer_success_action_reclaimed", `reclaim:${rowResult.data.execution_attempts ?? 0}`, { stale_before: staleBefore });
      }
    }
  }

  const dueQuery = caller.admin.from("customer_success_automation_queue").select("*")
    .in("execution_status", ["queued", "scheduled"]).or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
    .order("scheduled_at", { ascending: true, nullsFirst: true }).limit(limit);
  const scopedDueQuery = businessId ? dueQuery.eq("business_id", businessId) : dueQuery;
  const due = await scopedDueQuery;
  if (due.error) return json({ ok: false, error: "customer_success_queue_lookup_failed" }, 503);

  let claimed = 0;
  let completed = 0;
  let escalated = 0;
  let retryQueued = 0;
  const outcomes: Array<Record<string, unknown>> = [];

  for (const candidate of due.data ?? []) {
    const attempt = Number(candidate.execution_attempts ?? 0) + 1;
    const claim = await caller.admin.from("customer_success_automation_queue").update({
      execution_status: "processing", execution_attempts: attempt, last_error: null,
    }).eq("id", candidate.id).in("execution_status", ["queued", "scheduled"]).select("*").maybeSingle();
    if (claim.error) { outcomes.push({ id: candidate.id, status: "claim_failed" }); continue; }
    const row = claim.data;
    if (!row) continue;
    claimed++;
    try {
      const context = await loadScopedContext(caller.admin, row);
      const policyResult = await caller.admin.from("customer_success_execution_policies").select("*").eq("business_id", row.business_id).maybeSingle();
      const policy = policyResult.error ? null : policyResult.data;
      const riskFlags = await currentRiskFlags(caller.admin, row);
      const validation = await validateAction(caller.admin, row, context, policy, riskFlags);
      if (!validation.ok) {
        await escalate(caller.admin, row, validation.reason, riskFlags);
        escalated++;
        outcomes.push({ id: row.id, status: "escalated", reason: validation.reason });
        continue;
      }
      const outcome = await materialize(caller.admin, row, context, validation.actionType, validation);
      if (row.action_type === "retention") {
        const cycle = Number(row.action_payload?.retention_cycle ?? 1);
        const { error: nextCycleError } = await caller.admin.from("customer_success_automation_queue").upsert({
          idempotency_key: `${row.idempotency_key}:cycle:${cycle + 1}`,
          business_id: row.business_id,
          contact_id: row.contact_id,
          business_contact_relationship_id: row.business_contact_relationship_id,
          success_profile_id: row.success_profile_id,
          onboarding_plan_id: row.onboarding_plan_id,
          checkout_id: row.checkout_id,
          action_type: "retention",
          execution_status: "scheduled",
          execution_mode: "standard_auto",
          approval_required: false,
          confidence_score: row.confidence_score,
          risk_flags: riskFlags,
          scheduled_at: daysFrom(now, 30).toISOString(),
          action_payload: { ...(row.action_payload ?? {}), retention_cycle: cycle + 1 },
        }, { onConflict: "idempotency_key", ignoreDuplicates: true });
        if (nextCycleError) throw new Error(`retention follow-up schedule failed: ${nextCycleError.message}`);
      }
      await audit(caller.admin, row, outcome.auditType, "executed", outcome.result);
      const { error: completeError } = await caller.admin.from("customer_success_automation_queue").update({
        execution_status: "completed",
        execution_mode: "standard_auto",
        approval_required: false,
        escalation_reason: null,
        risk_flags: riskFlags,
        last_error: null,
        execution_result: outcome.result,
        action_payload: { ...(row.action_payload ?? {}), execution_result: outcome.result, external_provider_send: false },
      }).eq("id", row.id).eq("execution_status", "processing");
      if (completeError) throw new Error(`queue completion write failed: ${completeError.message}`);
      completed++;
      outcomes.push({ id: row.id, status: "completed", action_type: row.action_type, result: outcome.result });
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 500);
      const exhausted = attempt >= 5;
      const { error: retryError } = await caller.admin.from("customer_success_automation_queue").update({
        execution_status: exhausted ? "failed" : "queued",
        execution_mode: exhausted ? "human_review" : "standard_auto",
        approval_required: exhausted,
        escalation_reason: exhausted ? "retry_limit_exhausted" : null,
        last_error: message,
        scheduled_at: exhausted ? row.scheduled_at : daysFrom(now, Math.min(1, 0.1 * (2 ** (attempt - 1)))).toISOString(),
      }).eq("id", row.id).eq("execution_status", "processing");
      if (!retryError) {
        try { await audit(caller.admin, row, exhausted ? "customer_success_action_retry_exhausted" : "customer_success_action_retry_scheduled", `retry:${attempt}`, { error: message }); }
        catch (auditError) { console.error("customer success retry audit failed", auditError); }
      }
      if (exhausted) escalated++; else retryQueued++;
      outcomes.push({ id: row.id, status: exhausted ? "failed" : "retry_queued", error: message });
    }
  }

  return json({
    ok: true,
    trigger_source: caller.trigger_source,
    considered: due.data?.length ?? 0,
    claimed,
    completed,
    escalated,
    retry_queued: retryQueued,
    external_customer_messages_sent: 0,
    external_provider_calls: 0,
    outcomes,
  });
});
