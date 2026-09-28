import { customerContextMatches } from "./customerCommercialLifecycle.ts";

export type PaidCustomerSuccessActionType =
  | "onboarding_welcome"
  | "onboarding_start"
  | "product_account_activation";

/** Execute the paid-customer activation actions shared by the webhook and CS worker. */
export async function executePaidCustomerSuccessAction(admin: any, row: any, actionType: PaidCustomerSuccessActionType) {
  if (actionType === "onboarding_welcome") {
    const pack = await admin.from("customer_welcome_packs")
      .select("id,business_id,contact_id,business_contact_relationship_id,pack_status,approval_status,external_share_allowed")
      .eq("customer_sales_checkout_id", row.checkout_id)
      .eq("business_id", row.business_id)
      .maybeSingle();
    if (pack.error || !pack.data || pack.data.approval_status !== "approved" ||
        !customerContextMatches(pack.data, {
          businessId: row.business_id,
          contactId: row.contact_id,
          relationshipId: row.business_contact_relationship_id,
        })) {
      throw new Error("approved_welcome_journey_missing");
    }
    return {
      result: { prepared: true, welcome_pack_id: pack.data.id, external_share_allowed: false },
      auditType: "customer_welcome_journey_ready",
    };
  }

  if (actionType === "onboarding_start") {
    const plan = await admin.from("customer_onboarding_plans")
      .select("id,business_id,contact_id,crm_contact_id,business_contact_relationship_id,onboarding_status,approval_status,founder_review_required,customer_sales_checkout_id")
      .eq("customer_sales_checkout_id", row.checkout_id)
      .eq("business_id", row.business_id)
      .maybeSingle();
    if (plan.error || !plan.data || plan.data.onboarding_status !== "active" ||
        plan.data.approval_status !== "approved" || plan.data.founder_review_required ||
        !customerContextMatches(plan.data, {
          businessId: row.business_id,
          contactId: row.contact_id,
          relationshipId: row.business_contact_relationship_id,
        })) {
      throw new Error("approved_standard_onboarding_plan_missing");
    }
    return {
      result: { started: true, onboarding_plan_id: plan.data.id, founder_approval_required: false },
      auditType: "customer_onboarding_started",
    };
  }

  if (actionType === "product_account_activation") {
    const accountId = row.action_payload?.product_account_id;
    const account = accountId
      ? await admin.from("customer_product_accounts")
        .select("id,business_id,contact_id,business_contact_relationship_id,checkout_id,account_scope,account_role,access_status,product_id")
        .eq("id", accountId)
        .eq("business_id", row.business_id)
        .eq("contact_id", row.contact_id)
        .eq("checkout_id", row.checkout_id)
        .maybeSingle()
      : { data: null, error: null };
    if (account.error || !account.data || account.data.account_scope !== "customer_product" ||
        account.data.account_role !== "product_customer" ||
        !customerContextMatches(account.data, {
          businessId: row.business_id,
          contactId: row.contact_id,
          relationshipId: row.business_contact_relationship_id,
        })) {
      throw new Error("customer_product_account_missing_or_invalid");
    }
    return {
      result: { provisioned: true, account_id: account.data.id, access_status: account.data.access_status, account_role: "product_customer" },
      auditType: "customer_product_account_provisioned",
    };
  }

  return null;
}
