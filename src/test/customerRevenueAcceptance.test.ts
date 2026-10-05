import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  approvedCheckoutAmount,
  customerContextMatches,
  customerProductProvisioningRole,
  evaluateCustomerSuccessAction,
  LIFTOR_PLATFORM_ROLES,
  paymentActivationIdempotencyKeys,
  planCustomerSuccessActivation,
  resolveApprovedCommercialOffer,
  validatePaidCheckoutSnapshot,
  validateStripePriceAgainstOffer,
} from "../../supabase/functions/_shared/customerCommercialLifecycle";
import {
  provisionPaidCustomerProductAccount,
  resolveOrInviteCustomerIdentity,
  type CustomerAuthAdmin,
  type CustomerProductAccount,
  type CustomerProductAccountGateway,
} from "../../supabase/functions/_shared/customerAuthProvisioning";
import { executePaidCustomerSuccessAction } from "../../supabase/functions/_shared/customerPaidSuccessExecution";

const activationMigration = "supabase/migrations/20260923180000_worker2_customer_revenue_activation.sql";
const typesFile = "src/integrations/supabase/types.ts";

describe("Worker 2 customer revenue acceptance", () => {
  it("proves prospect through paid product activation, autonomous onboarding, CS execution, escalation, audit and retry", async () => {
    // Canonical global identity and one business-specific BCR are the starting point.
    const contact = { id: "contact-customer-1", email: "buyer@example.test", name: "Buyer One" };
    const relationship = {
      id: "bcr-business-1-contact-1",
      business_id: "business-1",
      contact_id: contact.id,
      current_stage: "prospect",
      qualification: "qualified",
      business_relevance_level: "high",
      business_relevance_score: 82,
      business_relevance_categories: ["buyer"],
    };
    const business = { id: relationship.business_id, name: "Liftor Learning" };
    const product = {
      id: "product-1", business_id: business.id, active: true,
      product_name: "Learning Platform", requires_customer_account: true,
    };
    const offer = {
      id: "offer-1", business_id: business.id, product_id: product.id, active: true,
      offer_stage: "approved", approval_status: "approved", standard_checkout_enabled: true,
      requires_founder_approval: false, approved_at: "2026-09-24T09:00:00.000Z", approved_by: "founder-1",
      approved_price_amount: 120, approved_currency: "GBP", stripe_price_id: "price-approved-1",
      stripe_product_id: "stripe-product-1", max_discount_percent: 10, discount_allowed: true,
      customer_segment_rules: { allowed_qualifications: ["qualified"] },
    };
    const commercial = resolveApprovedCommercialOffer({
      businessId: business.id,
      contactId: contact.id,
      offer,
      product,
      relationship,
      requestedDiscountPercent: 10,
    });
    expect(commercial).toMatchObject({ ok: true, stripePriceId: offer.stripe_price_id, approvedPriceAmount: 120, currency: "GBP" });
    if ("reason" in commercial) throw new Error(commercial.reason);

    const approvedPrice = {
      active: true,
      product: offer.stripe_product_id,
      currency: "gbp",
      unit_amount: 12000,
    };
    expect(validateStripePriceAgainstOffer({
      price: approvedPrice,
      stripeProductId: commercial.stripeProductId,
      approvedPriceAmount: commercial.approvedPriceAmount,
      currency: commercial.currency,
    })).toEqual({ ok: true });
    expect(validateStripePriceAgainstOffer({
      price: { ...approvedPrice, unit_amount: 12001 },
      stripeProductId: commercial.stripeProductId,
      approvedPriceAmount: commercial.approvedPriceAmount,
      currency: commercial.currency,
    })).toMatchObject({ ok: false, reason: "stripe_price_amount_mismatch" });
    const amount = approvedCheckoutAmount({
      approvedAmount: commercial.approvedPriceAmount,
      currency: commercial.currency,
      discountPercent: commercial.requestedDiscountPercent,
    });
    expect(amount).toEqual({ ok: true, amount: 108, minorUnits: 10800 });
    if ("reason" in amount) throw new Error(amount.reason);

    const checkout = {
      id: "checkout-1",
      idempotency_key: "checkout:business-1:contact-1:offer-1",
      business_id: business.id,
      contact_id: contact.id,
      business_contact_relationship_id: relationship.id,
      product_id: product.id,
      offer_id: offer.id,
      customer_email: contact.email,
      customer_name: contact.name,
      discount_percent: commercial.requestedDiscountPercent,
      approved_price_amount: commercial.approvedPriceAmount,
      checkout_amount: amount.amount,
      checkout_amount_minor_units: amount.minorUnits,
      currency: commercial.currency,
      stripe_price_id: commercial.stripePriceId,
      stripe_customer_id: "cus-test-1",
      stripe_checkout_session_id: null as string | null,
      status: "pending",
      test_mode: true,
    };
    const paidSession = {
      id: "cs_test_1",
      payment_status: "paid",
      livemode: false,
      currency: "gbp",
      amount_total: 10800,
      customer: "cus-test-1",
      payment_intent: "pi-test-1",
      subscription: "sub-test-1",
      metadata: {
        customer_sales_checkout_id: checkout.id,
        business_id: business.id,
        contact_id: contact.id,
        business_contact_relationship_id: relationship.id,
        product_id: product.id,
        offer_id: offer.id,
      },
    };
    expect(validatePaidCheckoutSnapshot({ intent: checkout, session: paidSession, eventLivemode: false }))
      .toEqual({ ok: true });
    expect(customerContextMatches(checkout, {
      businessId: business.id,
      contactId: contact.id,
      relationshipId: relationship.id,
    })).toBe(true);

    // Mocked Supabase Auth provider: the new customer is invited once, then reused on replay.
    const authUsers: Array<{ id: string; email: string; email_confirmed_at: string | null }> = [];
    const inviteUserByEmail = vi.fn(async (email: string) => {
      const user = { id: "auth-customer-1", email, email_confirmed_at: null };
      authUsers.push(user);
      return { data: { user }, error: null };
    });
    const authAdmin: CustomerAuthAdmin = {
      async listUsers({ page, perPage }) {
        const start = (page - 1) * perPage;
        return { data: { users: authUsers.slice(start, start + perPage) }, error: null };
      },
      inviteUserByEmail,
    };

    const accounts = new Map<string, CustomerProductAccount>();
    let accountSequence = 0;
    const accountGateway: CustomerProductAccountGateway = {
      async upsert(row) {
        const key = `${row.checkout_id}:${row.product_id}`;
        if (!accounts.has(key)) {
          accountSequence += 1;
          accounts.set(key, { ...row, id: `product-account-${accountSequence}` } as CustomerProductAccount);
        }
        return { error: null };
      },
      async find(checkoutId, productId) {
        return { data: accounts.get(`${checkoutId}:${productId}`) ?? null, error: null };
      },
      async attachIdentity(accountId, authUserId) {
        const account = [...accounts.values()].find((row) => row.id === accountId);
        if (account && !account.auth_user_id) account.auth_user_id = authUserId;
        return { error: null };
      },
    };

    const dealRows = new Map<string, Record<string, unknown>>();
    const paymentRows = new Map<string, Record<string, unknown>>();
    const billingCustomers = new Map<string, Record<string, unknown>>();
    const checkoutIntents = new Map<string, Record<string, unknown>>();
    const subscriptionLinks = new Map<string, Record<string, unknown>>();
    const revenueRows = new Map<string, Record<string, unknown>>();
    const profileRows = new Map<string, Record<string, unknown>>();
    const onboardingRows = new Map<string, Record<string, unknown>>();
    const auditRows = new Map<string, Record<string, unknown>>();
    const queueRows = new Map<string, any>();
    const idempotentSet = (table: Map<string, Record<string, unknown>>, key: string, row: Record<string, unknown>) => {
      if (!table.has(key)) table.set(key, row);
    };
    const keys = paymentActivationIdempotencyKeys(checkout.id);

    const runPaidActivation = async (riskFlags: string[] = []) => {
      idempotentSet(billingCustomers, `${business.id}:${contact.id}`, { business_id: business.id, contact_id: contact.id, stripe_customer_id: checkout.stripe_customer_id });
      idempotentSet(checkoutIntents, checkout.id, checkout);
      const identity = await resolveOrInviteCustomerIdentity(authAdmin, checkout.customer_email);
      const productAccount = await provisionPaidCustomerProductAccount({
        businessId: checkout.business_id,
        contactId: checkout.contact_id,
        relationshipId: checkout.business_contact_relationship_id,
        productId: checkout.product_id,
        offerId: checkout.offer_id,
        paymentId: "payment-1",
        checkoutId: checkout.id,
        authUser: identity.user,
      }, accountGateway);

      const deal = { id: "deal-1", business_id: business.id, contact_id: contact.id, relationship_id: relationship.id, status: "WON" };
      const payment = {
        id: "payment-1", checkout_id: checkout.id, deal_id: deal.id, status: "succeeded",
        amount: amount.amount, currency: "GBP", stripe_subscription_id: paidSession.subscription,
      };
      idempotentSet(dealRows, checkout.id, deal);
      idempotentSet(paymentRows, checkout.id, payment);
      idempotentSet(subscriptionLinks, paidSession.subscription, { checkout_id: checkout.id, payment_id: payment.id });
      idempotentSet(revenueRows, checkout.id, { payment_id: payment.id, deal_id: deal.id, net_amount: amount.amount, currency: "GBP" });
      idempotentSet(profileRows, checkout.id, {
        id: "profile-1", business_id: business.id, contact_id: contact.id,
        business_contact_relationship_id: relationship.id, lifecycle_stage: "onboarding",
        subscription_status: "active", purchased_offer: offer.id,
      });
      idempotentSet(onboardingRows, checkout.id, { id: "onboarding-1", status: "active", founder_review_required: false });
      relationship.current_stage = "client";

      for (const [key, event_type] of [
        [keys.deal, "deal_won"], [keys.payment, "payment_succeeded"],
        [keys.revenue, "revenue_confirmed"], [keys.customer, "customer_activated"],
        [keys.productAccount, "customer_product_account_provisioned"],
        [keys.onboarding, "onboarding_started"],
      ] as const) {
        idempotentSet(auditRows, key, { event_type, business_id: business.id, contact_id: contact.id, relationship_id: relationship.id });
      }

      // No approved survey template exists in this isolated run, so the policy
      // planner must leave that optional send out of the autonomous queue.
      const actions = planCustomerSuccessActivation({ checkoutId: checkout.id, requiresCustomerAccount: true, recurring: true })
        .filter((action) => action.actionType !== "approved_survey");
      for (const action of actions) {
        const decision = evaluateCustomerSuccessAction({
          actionType: action.actionType,
          policy: {
            enabled: true, policy_currency: "GBP", minimum_ai_confidence: 0.85,
            allow_customer_product_activation: true, allow_standard_checkins: true,
            allow_approved_support_responses: true, allow_approved_surveys: true,
            allow_standard_renewals: true, allow_approved_upsell_cross_sell: true,
            allow_standard_retention: true, allow_standard_winback: true,
            allow_standard_refunds: true, maximum_standard_refund_amount: 50,
            maximum_standard_upsell_amount: 500, strategic_value_threshold: 5000,
          },
          riskFlags,
          confidence: 1,
          paymentVerified: action.actionType === "product_account_activation",
          approvedContent: action.actionType === "onboarding_welcome",
        });
        const row = {
          id: `queue-${action.actionType}`,
          idempotency_key: action.idempotencyKey,
          business_id: business.id,
          contact_id: contact.id,
          business_contact_relationship_id: relationship.id,
          checkout_id: checkout.id,
          action_type: action.actionType,
          execution_status: decision.mode === "escalate" ? "escalated" : action.executionStatus,
          execution_mode: decision.mode,
          approval_required: decision.approvalRequired,
          escalation_reason: decision.reason,
          action_payload: { product_account_id: productAccount.id },
        };
        if (!queueRows.has(action.idempotencyKey)) queueRows.set(action.idempotencyKey, row);
        idempotentSet(auditRows, `${action.idempotencyKey}:queued`, {
          event_type: decision.mode === "escalate" ? "customer_success_action_escalated" : "customer_success_action_queued",
          execution_status: row.execution_status,
          approval_required: row.approval_required,
          escalation_reason: row.escalation_reason,
        });
      }

      return { identity, productAccount, actions };
    };

    const firstRun = await runPaidActivation();
    expect(firstRun.identity.created).toBe(true);
    expect(firstRun.productAccount).toMatchObject({
      auth_user_id: "auth-customer-1",
      account_scope: "customer_product",
      account_role: "product_customer",
      access_status: "pending_user",
    });
    expect(customerProductProvisioningRole("admin")).toBe("product_customer");
    expect(LIFTOR_PLATFORM_ROLES.has(firstRun.productAccount.account_role as any)).toBe(false);
    expect(firstRun.actions.some((row) => row.actionType === "renewal_workflow")).toBe(true);
    expect(queueRows.size).toBe(firstRun.actions.length);
    expect([...queueRows.values()].every((row) => row.execution_mode === "standard_auto" && !row.approval_required)).toBe(true);
    expect(relationship.current_stage).toBe("client");
    expect(profileRows.get(checkout.id)).toMatchObject({ lifecycle_stage: "onboarding", subscription_status: "active" });
    expect(dealRows.get(checkout.id)).toMatchObject({ status: "WON" });
    expect(paymentRows.get(checkout.id)).toMatchObject({ status: "succeeded", deal_id: "deal-1", stripe_subscription_id: "sub-test-1" });
    expect(revenueRows.get(checkout.id)).toMatchObject({ payment_id: "payment-1", net_amount: 108 });
    expect(auditRows.size).toBeGreaterThan(6);
    const paidWebhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(paidWebhook).not.toMatch(/from\(["']user_roles["']\)[\s\S]{0,160}(?:insert|upsert)/);
    expect(paidWebhook).toContain("stripeMinorUnitsToMajor(session.amount_total, currency)");
    expect(paidWebhook).toContain("paid_checkout_amount_conversion_mismatch");
    expect(paidWebhook).toContain("stripe_subscription_id: subscriptionId");
    expect(paidWebhook).toContain('onConflict: "customer_sales_checkout_id"');
    expect(paidWebhook).toContain('onConflict: "checkout_id,product_id"');
    expect(paidWebhook).toContain('onConflict: "idempotency_key"');
    expect(readFileSync("supabase/functions/create-stripe-checkout-session/index.ts", "utf8"))
      .toContain('onConflict: "business_id,contact_id"');

    // The production CS action executor autonomously validates and executes welcome,
    // onboarding-start and product activation with a minimal in-memory DB adapter.
    const dbRows: Record<string, any> = {
      customer_welcome_packs: {
        id: "welcome-1", pack_status: "ready", approval_status: "approved", external_share_allowed: false,
        contact_id: contact.id, business_contact_relationship_id: relationship.id,
        customer_sales_checkout_id: checkout.id, business_id: business.id,
      },
      customer_onboarding_plans: {
        id: "onboarding-1", business_id: business.id, contact_id: contact.id,
        crm_contact_id: contact.id, business_contact_relationship_id: relationship.id,
        onboarding_status: "active", approval_status: "approved", founder_review_required: false,
        customer_sales_checkout_id: checkout.id,
      },
      customer_product_accounts: firstRun.productAccount,
    };
    const fakeAdmin = {
      from(table: string) {
        const filters: Record<string, unknown> = {};
        const query = {
          select() { return query; },
          eq(column: string, value: unknown) { filters[column] = value; return query; },
          async maybeSingle() {
            const row = dbRows[table];
            const matched = row && Object.entries(filters).every(([key, value]) => row[key] === value);
            return { data: matched ? row : null, error: null };
          },
        };
        return query;
      },
    };
    const dueActions = [...queueRows.values()].filter((row) => row.execution_status === "queued");
    const completedActions: string[] = [];
    for (const row of dueActions) {
      if (!["onboarding_welcome", "onboarding_start", "product_account_activation"].includes(row.action_type)) continue;
      const executed = await executePaidCustomerSuccessAction(fakeAdmin, row, row.action_type);
      expect(executed?.result).toBeDefined();
      completedActions.push(row.action_type);
      row.execution_status = "completed";
      row.execution_result = executed?.result;
      idempotentSet(auditRows, `${row.idempotency_key}:executed`, { event_type: executed?.auditType, result: executed?.result });
    }
    expect(completedActions).toEqual(expect.arrayContaining([
      "onboarding_welcome", "onboarding_start", "product_account_activation",
    ]));
    expect([...queueRows.values()].filter((row) => completedActions.includes(row.action_type))
      .every((row) => row.execution_status === "completed")).toBe(true);
    expect(auditRows.size).toBeGreaterThan(9);

    // A complaint remains an exception and fails closed into human review.
    const exception = evaluateCustomerSuccessAction({
      actionType: "ordinary_checkin",
      policy: { enabled: true, allow_standard_checkins: true, minimum_ai_confidence: 0.85 },
      riskFlags: ["complaint"],
      confidence: 1,
    });
    expect(exception).toMatchObject({ mode: "escalate", approvalRequired: true, reason: "complaint" });
    idempotentSet(auditRows, "checkout:1:exception:complaint", { event_type: "customer_success_action_escalated", reason: exception.reason });

    // Payment/webhook replay resolves the same Auth user and database keys.
    const retry = await runPaidActivation();
    expect(retry.identity.created).toBe(false);
    expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
    expect(authUsers).toHaveLength(1);
    expect(accounts).toHaveLength(1);
    expect(billingCustomers).toHaveLength(1);
    expect(checkoutIntents).toHaveLength(1);
    expect(dealRows).toHaveLength(1);
    expect(paymentRows).toHaveLength(1);
    expect(subscriptionLinks).toHaveLength(1);
    expect(revenueRows).toHaveLength(1);
    expect(profileRows).toHaveLength(1);
    expect(onboardingRows).toHaveLength(1);
    expect(queueRows.size).toBe(firstRun.actions.length);
  });

  it("reuses an existing Auth identity and refuses ambiguous identity matches", async () => {
    const existing = { id: "auth-existing", email: "buyer@example.test", email_confirmed_at: "2026-09-20T00:00:00Z" };
    const invite = vi.fn();
    const authAdmin: CustomerAuthAdmin = {
      async listUsers() { return { data: { users: [existing] }, error: null }; },
      inviteUserByEmail: invite as any,
    };
    await expect(resolveOrInviteCustomerIdentity(authAdmin, "BUYER@example.test")).resolves.toEqual({ user: existing, created: false });
    expect(invite).not.toHaveBeenCalled();

    const existingAccounts = new Map<string, CustomerProductAccount>();
    const existingAccountGateway: CustomerProductAccountGateway = {
      async upsert(row) {
        existingAccounts.set(String(row.checkout_id), { ...row, id: "existing-product-account" } as CustomerProductAccount);
        return { error: null };
      },
      async find(checkoutId) { return { data: existingAccounts.get(checkoutId) ?? null, error: null }; },
      async attachIdentity(accountId, authUserId) {
        const row = [...existingAccounts.values()].find((candidate) => candidate.id === accountId);
        if (row) row.auth_user_id = authUserId;
        return { error: null };
      },
    };
    const linkedAccount = await provisionPaidCustomerProductAccount({
      businessId: "business-1", contactId: "contact-1", relationshipId: "bcr-1", productId: "product-1",
      offerId: "offer-1", paymentId: "payment-1", checkoutId: "checkout-existing", authUser: existing,
    }, existingAccountGateway);
    expect(linkedAccount).toMatchObject({ auth_user_id: existing.id, access_status: "active", account_role: "product_customer" });
    expect(existingAccounts).toHaveLength(1);

    const ambiguous: CustomerAuthAdmin = {
      async listUsers() { return { data: { users: [existing, { ...existing, id: "auth-duplicate" }] }, error: null }; },
      inviteUserByEmail: invite as any,
    };
    await expect(resolveOrInviteCustomerIdentity(ambiguous, existing.email)).rejects.toThrow("ambiguous_customer_auth_identity");

    const racedUser = { id: "auth-raced", email: "race@example.test", email_confirmed_at: null };
    const raceUsers: Array<{ id: string; email: string; email_confirmed_at: string | null }> = [];
    const racingAuth: CustomerAuthAdmin = {
      async listUsers() { return { data: { users: raceUsers }, error: null }; },
      async inviteUserByEmail(email) {
        raceUsers.push({ ...racedUser, email });
        return { data: { user: null }, error: { message: "identity_created_by_concurrent_request" } };
      },
    };
    await expect(resolveOrInviteCustomerIdentity(racingAuth, racedUser.email))
      .resolves.toMatchObject({ user: { id: racedUser.id }, created: false });
    expect(raceUsers).toHaveLength(1);
  });

  it("locks down the trigger function's security definer ACL", () => {
    const migration = readFileSync(activationMigration, "utf8");
    const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.initialize_customer_success_execution_policy()");
    const trigger = migration.indexOf("CREATE TRIGGER businesses_initialize_customer_success_policy", start);
    const definition = migration.slice(start, trigger);
    expect(definition).toContain("SECURITY DEFINER");
    expect(definition).toMatch(/SET search_path\s*=\s*pg_catalog/);
    expect(definition).toContain("INSERT INTO public.customer_success_execution_policies");
    expect(definition).toContain("REVOKE EXECUTE ON FUNCTION public.initialize_customer_success_execution_policy() FROM PUBLIC, anon, authenticated");
    expect(definition).toContain("GRANT EXECUTE ON FUNCTION public.initialize_customer_success_execution_policy() TO service_role");
    expect(definition).not.toMatch(/^\s*GRANT EXECUTE\s+ON FUNCTION[^;]+TO\s+(?:PUBLIC|anon|authenticated)\s*;/gim);
  });

  it("keeps all six generated table shapes, nullability, insert/update keys and public FKs aligned to the migration", () => {
    const sql = readFileSync(activationMigration, "utf8");
    const types = readFileSync(typesFile, "utf8");
    const names = [
      "customer_sales_billing_customers", "customer_sales_checkout_intents", "customer_product_accounts",
      "customer_success_automation_queue", "customer_commercial_audit_events", "customer_success_refund_requests",
    ];
    const tsTypes: Record<string, string> = {
      uuid: "string", text: "string", timestamptz: "string", date: "string",
      boolean: "boolean", numeric: "number", bigint: "number", integer: "number", jsonb: "Json", "text[]": "string[]",
    };
    for (const table of names) {
      const sqlBlock = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\(\\n([\\s\\S]*?)\\n\\);`))?.[1];
      expect(sqlBlock, `missing migration table ${table}`).toBeTruthy();
      const columns = (sqlBlock ?? "").split("\n").flatMap((line) => {
        const match = line.match(/^  ([a-z_]+) ([a-z\[\]]+)(.*?)(?:,)?$/);
        if (!match || !(match[2] in tsTypes)) return [];
        const [, name, sqlType, rest] = match;
        const nullable = !rest.includes("NOT NULL") && !rest.includes("PRIMARY KEY");
        return [{ name, sqlType, rest, nullable, hasDefault: rest.includes("DEFAULT") }];
      });
      const tableStart = types.indexOf(`      ${table}: {`);
      expect(tableStart, `missing generated table ${table}`).toBeGreaterThanOrEqual(0);
      const nextTable = types.slice(tableStart + 1).search(/\n      [a-z_]+: \{/);
      const typeBlock = types.slice(tableStart, nextTable < 0 ? undefined : tableStart + 1 + nextTable);
      const section = (name: string, until: string) => {
        const begin = typeBlock.indexOf(`${name}: {`);
        const end = typeBlock.indexOf(until, begin);
        return typeBlock.slice(begin, end < 0 ? undefined : end);
      };
      const fields = (sectionText: string) => [...sectionText.matchAll(/^          ([a-z_]+)(\?)?: (.+)$/gm)]
        .map((match) => ({ name: match[1], optional: !!match[2], type: match[3] }));
      const rowFields = fields(section("Row", "        Insert: {"));
      const insertFields = fields(section("Insert", "        Update: {"));
      const updateFields = fields(section("Update", "        Relationships: ["));
      expect(rowFields.map((field) => field.name).sort()).toEqual(columns.map((column) => column.name).sort());
      expect(insertFields.map((field) => field.name).sort()).toEqual(columns.map((column) => column.name).sort());
      expect(updateFields.map((field) => field.name).sort()).toEqual(columns.map((column) => column.name).sort());
      for (const column of columns) {
        const type = `${tsTypes[column.sqlType]}${column.nullable ? " | null" : ""}`;
        expect(rowFields.find((field) => field.name === column.name)?.type).toBe(type);
        expect(insertFields.find((field) => field.name === column.name)?.type).toBe(type);
        expect(insertFields.find((field) => field.name === column.name)?.optional)
          .toBe(column.nullable || column.hasDefault);
        expect(updateFields.find((field) => field.name === column.name)?.type).toBe(type);
        expect(updateFields.find((field) => field.name === column.name)?.optional).toBe(true);
      }
      const expectedFks = columns.flatMap((column) => {
        const fk = column.rest.match(/REFERENCES public\.([a-z_]+)\(id\)/);
        return fk ? [{
          foreignKeyName: `${table}_${column.name}_fkey`.slice(0, 63),
          column: column.name,
          relation: fk[1],
        }] : [];
      });
      const relationships = [...typeBlock.matchAll(/foreignKeyName: "([^"]+)"[\s\S]*?columns: \["([^"]+)"\][\s\S]*?referencedRelation: "([^"]+)"/g)]
        .map((match) => ({ foreignKeyName: match[1], column: match[2], relation: match[3] }));
      // Live type generation also lists view-derived duplicates of the same FK
      // (e.g. via views over contacts); no FK beyond those in the migration may appear.
      expect(relationships).toEqual(expect.arrayContaining(expectedFks));
      const expectedFkKeys = new Set(expectedFks.map((fk) => `${fk.foreignKeyName}:${fk.column}`));
      expect(relationships.every((fk) => expectedFkKeys.has(`${fk.foreignKeyName}:${fk.column}`))).toBe(true);
    }
  });
});
