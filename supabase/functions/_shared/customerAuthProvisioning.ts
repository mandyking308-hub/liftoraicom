import { customerProductProvisioningRole } from "./customerCommercialLifecycle.ts";

export interface CustomerAuthUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}

export interface CustomerAuthAdmin {
  listUsers(input: { page: number; perPage: number }): Promise<{
    data?: { users?: CustomerAuthUser[] } | null;
    error?: { message?: string } | null;
  }>;
  inviteUserByEmail(email: string, options?: { data?: Record<string, unknown> }): Promise<{
    data?: { user?: CustomerAuthUser | null } | null;
    error?: { message?: string } | null;
  }>;
}

export interface CustomerProductAccount {
  id: string;
  business_id: string;
  contact_id: string;
  business_contact_relationship_id: string;
  product_id: string;
  offer_id: string;
  payment_id: string;
  checkout_id: string;
  auth_user_id: string | null;
  account_scope: string;
  account_role: string;
  access_status: string;
}

export interface CustomerProductAccountGateway {
  upsert(row: Record<string, unknown>): Promise<{ error?: { message?: string } | null }>;
  find(checkoutId: string, productId: string): Promise<{
    data?: CustomerProductAccount | null;
    error?: { message?: string } | null;
  }>;
  attachIdentity(accountId: string, authUserId: string): Promise<{ error?: { message?: string } | null }>;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

/** Resolve one Auth identity by exact normalized email, or create it by invite. */
export async function resolveOrInviteCustomerIdentity(
  authAdmin: CustomerAuthAdmin,
  emailValue: unknown,
): Promise<{ user: CustomerAuthUser; created: boolean }> {
  const email = normalizeEmail(emailValue);
  if (!email) throw new Error("customer_auth_email_invalid");

  const findExisting = async (): Promise<CustomerAuthUser | null> => {
    const matches = new Map<string, CustomerAuthUser>();
    const perPage = 1000;
    for (let page = 1; ; page += 1) {
      const response = await authAdmin.listUsers({ page, perPage });
      if (response.error) throw new Error(`customer_auth_lookup_failed:${response.error.message ?? "unknown"}`);
      const users = response.data?.users ?? [];
      for (const user of users) {
        if (normalizeEmail(user.email) === email) matches.set(user.id, user);
      }
      if (users.length < perPage) break;
    }
    if (matches.size > 1) throw new Error("ambiguous_customer_auth_identity");
    return matches.values().next().value ?? null;
  };

  const existing = await findExisting();
  if (existing) return { user: existing, created: false };

  const invited = await authAdmin.inviteUserByEmail(email, { data: { identity_kind: "customer" } });
  const invitedUser = invited.data?.user;
  if (!invited.error && invitedUser?.id && normalizeEmail(invitedUser.email) === email) {
    return { user: invitedUser, created: true };
  }

  // A concurrent paid-checkout retry may win the invite race. Re-read before
  // returning the provider error so one Auth identity remains the canonical row.
  const racedIdentity = await findExisting();
  if (racedIdentity) return { user: racedIdentity, created: false };
  throw new Error(`customer_auth_invite_failed:${invited.error?.message ?? "missing_invited_user"}`);
}

/** Create or safely link a paid customer's product account without platform roles. */
export async function provisionPaidCustomerProductAccount(input: {
  businessId: string;
  contactId: string;
  relationshipId: string;
  productId: string;
  offerId: string;
  paymentId: string;
  checkoutId: string;
  authUser: CustomerAuthUser;
}, gateway: CustomerProductAccountGateway): Promise<CustomerProductAccount> {
  const expected = {
    business_id: input.businessId,
    contact_id: input.contactId,
    business_contact_relationship_id: input.relationshipId,
    product_id: input.productId,
    offer_id: input.offerId,
    payment_id: input.paymentId,
    checkout_id: input.checkoutId,
  };
  const inserted = await gateway.upsert({
    ...expected,
    auth_user_id: input.authUser.id,
    account_scope: "customer_product",
    account_role: customerProductProvisioningRole(),
    access_status: input.authUser.email_confirmed_at ? "active" : "pending_user",
    metadata: { provisioning_source: "verified_paid_checkout" },
  });
  if (inserted.error) throw new Error(`customer_product_account_upsert_failed:${inserted.error.message ?? "unknown"}`);

  const read = await gateway.find(input.checkoutId, input.productId);
  if (read.error || !read.data) throw new Error(`customer_product_account_read_failed:${read.error?.message ?? "missing_row"}`);
  let account = read.data;
  if (Object.entries(expected).some(([key, value]) => account[key as keyof CustomerProductAccount] !== value)) {
    throw new Error("customer_product_account_context_mismatch");
  }
  if (account.account_scope !== "customer_product" || account.account_role !== "product_customer") {
    throw new Error("customer_product_account_platform_role_forbidden");
  }
  if (account.auth_user_id && account.auth_user_id !== input.authUser.id) {
    throw new Error("customer_product_account_identity_mismatch");
  }
  if (!account.auth_user_id) {
    const linked = await gateway.attachIdentity(account.id, input.authUser.id);
    if (linked.error) throw new Error(`customer_product_account_identity_link_failed:${linked.error.message ?? "unknown"}`);
    const linkedRead = await gateway.find(input.checkoutId, input.productId);
    if (linkedRead.error || !linkedRead.data || linkedRead.data.auth_user_id !== input.authUser.id) {
      throw new Error(`customer_product_account_identity_link_failed:${linkedRead.error?.message ?? "identity_not_linked"}`);
    }
    account = linkedRead.data;
  }
  return account;
}
