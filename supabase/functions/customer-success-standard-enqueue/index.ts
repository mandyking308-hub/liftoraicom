import { requireFounderOrCron } from "../_shared/callerAuth.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  evaluateCustomerSuccessAction,
  customerContextMatches,
  resolveApprovedCommercialOffer,
  type CustomerSuccessActionType,
} from "../_shared/customerCommercialLifecycle.ts";

const ENQUEUEABLE = new Set<CustomerSuccessActionType>([
  "ordinary_checkin", "approved_support_response", "approved_survey", "renewal_workflow",
  "approved_upsell_cross_sell", "retention", "winback", "refund",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function audit(admin: any, row: any) {
  const { error } = await admin.from("customer_commercial_audit_events").upsert({
    idempotency_key: `${row.idempotency_key}:enqueued`,
    event_type: "customer_success_action_enqueued",
    business_id: row.business_id,
    contact_id: row.contact_id,
    business_contact_relationship_id: row.business_contact_relationship_id,
    checkout_id: row.checkout_id,
    payment_id: row.action_payload?.payment_id ?? null,
    event_payload: { action_type: row.action_type, execution_status: row.execution_status, scheduled_at: row.scheduled_at },
  }, { onConflict: "idempotency_key" });
  if (error) throw new Error(`customer success enqueue audit failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const caller = await requireFounderOrCron(req, corsHeaders);
  if ("error" in caller) return caller.error;

  const body = await req.json().catch(() => ({} as any));
  if (typeof body?.business_id !== "string" || !Array.isArray(body.actions) || body.actions.length < 1 || body.actions.length > 50) {
    return json({ ok: false, error: "business_id_and_one_to_fifty_actions_required" }, 400);
  }
  const business = await caller.admin.from("businesses").select("id").eq("id", body.business_id).maybeSingle();
  if (business.error || !business.data) return json({ ok: false, error: "business_context_invalid" }, 409);
  const policyResult = await caller.admin.from("customer_success_execution_policies").select("*").eq("business_id", body.business_id).maybeSingle();
  if (policyResult.error || !policyResult.data || policyResult.data.enabled !== true) {
    return json({ ok: false, error: "business_customer_success_policy_unavailable" }, 409);
  }

  const created: Array<{ idempotency_key: string; status: string; approval_required: boolean }> = [];
  for (const action of body.actions) {
    if (!action || !ENQUEUEABLE.has(action.action_type) ||
        typeof action.contact_id !== "string" || typeof action.business_contact_relationship_id !== "string" ||
        typeof action.idempotency_key !== "string" || action.idempotency_key.trim().length < 12 || action.idempotency_key.length > 180) {
      return json({ ok: false, error: "invalid_customer_success_action" }, 400);
    }
    const relationship = await caller.admin.from("business_contact_relationships").select("*")
      .eq("id", action.business_contact_relationship_id).eq("business_id", body.business_id).eq("contact_id", action.contact_id).limit(2);
    if (relationship.error || (relationship.data ?? []).length !== 1) {
      return json({ ok: false, error: relationship.data?.length ? "ambiguous_business_contact_relationship" : "business_contact_relationship_mismatch" }, 409);
    }
    const expectedContext = {
      businessId: body.business_id,
      contactId: action.contact_id,
      relationshipId: action.business_contact_relationship_id,
    };
    const checkoutId = typeof action.checkout_id === "string" && action.checkout_id.trim() ? action.checkout_id.trim() : null;
    if (checkoutId) {
      const intent = await caller.admin.from("customer_sales_checkout_intents")
        .select("id,business_id,contact_id,business_contact_relationship_id,status,test_mode")
        .eq("id", checkoutId).maybeSingle();
      if (intent.error || !intent.data || !customerContextMatches(intent.data, expectedContext) ||
          intent.data.status !== "paid" || intent.data.test_mode !== true) {
        return json({ ok: false, error: "checkout_customer_context_mismatch" }, 409);
      }
    }
    const successProfileId = typeof action.success_profile_id === "string" && action.success_profile_id.trim() ? action.success_profile_id.trim() : null;
    if (successProfileId) {
      const profile = await caller.admin.from("customer_success_profiles")
        .select("id,business_id,crm_contact_id,business_contact_relationship_id")
        .eq("id", successProfileId).maybeSingle();
      if (profile.error || !profile.data || !customerContextMatches(profile.data, expectedContext)) {
        return json({ ok: false, error: "customer_success_profile_context_mismatch" }, 409);
      }
    }
    const onboardingPlanId = typeof action.onboarding_plan_id === "string" && action.onboarding_plan_id.trim() ? action.onboarding_plan_id.trim() : null;
    if (onboardingPlanId) {
      let planQuery = caller.admin.from("customer_onboarding_plans")
        .select("id,business_id,contact_id,crm_contact_id,business_contact_relationship_id,customer_sales_checkout_id")
        .eq("id", onboardingPlanId);
      if (checkoutId) planQuery = planQuery.eq("customer_sales_checkout_id", checkoutId);
      const plan = await planQuery.maybeSingle();
      if (plan.error || !plan.data || !customerContextMatches(plan.data, expectedContext)) {
        return json({ ok: false, error: "onboarding_plan_context_mismatch" }, 409);
      }
    }
    const payload = action.payload && typeof action.payload === "object" && !Array.isArray(action.payload) ? action.payload : {};
    let approvedContent = ["ordinary_checkin", "renewal_workflow", "retention", "winback"].includes(action.action_type);
    let approvedOffer = false;
    let amount: number | null = null;
    let currency: string | null = null;

    if (action.action_type === "approved_support_response") {
      const faq = await caller.admin.from("support_faq_items").select("id,business_id,source_id,answer,faq_status,missing_source_flags,risk_flags,compliance_warnings,founder_review_required,approval_status")
        .eq("id", payload.support_faq_item_id).eq("business_id", body.business_id).maybeSingle();
      if (!faq.error && faq.data?.source_id && faq.data.answer?.trim() && ["active", "approved_internal"].includes(faq.data.faq_status) &&
          faq.data.approval_status === "approved" && !faq.data.founder_review_required && !(faq.data.missing_source_flags ?? []).length &&
          !(faq.data.risk_flags ?? []).length && !(faq.data.compliance_warnings ?? []).length) {
        const source = await caller.admin.from("support_knowledge_sources").select("id,approved_for_support,source_status,risk_flags")
          .eq("id", faq.data.source_id).eq("business_id", body.business_id).maybeSingle();
        approvedContent = !source.error && !!source.data && source.data.approved_for_support === true &&
          source.data.source_status === "approved" && !(source.data.risk_flags ?? []).length;
      }
    }

    if (action.action_type === "approved_survey") {
      const template = await caller.admin.from("customer_survey_templates").select("id,business_id,active,auto_send_allowed,founder_approval_required")
        .eq("id", payload.survey_template_id).maybeSingle();
      approvedContent = !template.error && !!template.data && (!template.data.business_id || template.data.business_id === body.business_id) &&
        template.data.active === true && template.data.auto_send_allowed === true && template.data.founder_approval_required === false;
    }

    if (action.action_type === "approved_upsell_cross_sell") {
      const offerResult = await caller.admin.from("customer_sales_offers").select("*")
        .eq("id", payload.offer_id).eq("business_id", body.business_id).maybeSingle();
      const product = offerResult.data?.product_id
        ? await caller.admin.from("customer_sales_products").select("*").eq("id", offerResult.data.product_id).eq("business_id", body.business_id).maybeSingle()
        : { data: null, error: null };
      if (!offerResult.error && offerResult.data && !product.error && product.data) {
        const resolved = resolveApprovedCommercialOffer({
          businessId: body.business_id,
          contactId: action.contact_id,
          offer: offerResult.data,
          product: product.data,
          relationship: relationship.data[0],
          requestedDiscountPercent: 0,
        });
        if (resolved.ok) {
          approvedOffer = true;
          amount = resolved.approvedPriceAmount;
          currency = resolved.currency;
        }
      }
    }

    if (action.action_type === "refund") {
      amount = Number(payload.amount);
      currency = typeof payload.currency === "string" ? payload.currency.toUpperCase() : null;
    }

    const riskFlags = Array.isArray(action.risk_flags) ? action.risk_flags.filter((flag: unknown) => typeof flag === "string") : [];
    const confidence = action.confidence_score == null ? 1 : Number(action.confidence_score);
    const decision = evaluateCustomerSuccessAction({
      actionType: action.action_type,
      policy: policyResult.data,
      riskFlags,
      confidence,
      approvedContent,
      approvedOffer,
      amount,
      currency,
    });
    if (action.scheduled_at != null && !Number.isFinite(Date.parse(action.scheduled_at))) {
      return json({ ok: false, error: "scheduled_at_invalid" }, 400);
    }
    const scheduledAt = action.scheduled_at == null ? null : new Date(action.scheduled_at).toISOString();
    const idempotencyKey = `${body.business_id}:${action.contact_id}:${action.action_type}:${action.idempotency_key.trim()}`;
    const row = {
      idempotency_key: idempotencyKey,
      business_id: body.business_id,
      contact_id: action.contact_id,
      business_contact_relationship_id: action.business_contact_relationship_id,
      success_profile_id: successProfileId,
      onboarding_plan_id: onboardingPlanId,
      checkout_id: checkoutId,
      action_type: action.action_type,
      execution_status: decision.mode === "escalate" ? "escalated" : scheduledAt && Date.parse(scheduledAt) > Date.now() ? "scheduled" : "queued",
      execution_mode: decision.mode,
      approval_required: decision.approvalRequired,
      escalation_reason: decision.reason,
      confidence_score: Number.isFinite(confidence) ? confidence : 0,
      risk_flags: riskFlags,
      scheduled_at: scheduledAt,
      action_payload: payload,
    };
    const upsert = await caller.admin.from("customer_success_automation_queue").upsert(row, { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (upsert.error) return json({ ok: false, error: "customer_success_queue_write_failed" }, 503);
    const saved = await caller.admin.from("customer_success_automation_queue").select("idempotency_key,execution_status,approval_required")
      .eq("idempotency_key", idempotencyKey).maybeSingle();
    if (saved.error || !saved.data) return json({ ok: false, error: "customer_success_queue_lookup_failed" }, 503);
    await audit(caller.admin, { ...row, ...saved.data });
    created.push({ idempotency_key: idempotencyKey, status: saved.data.execution_status, approval_required: saved.data.approval_required });
  }

  return json({ ok: true, trigger_source: caller.trigger_source, enqueued: created.length, actions: created });
});
