export type BusinessContactRelationshipRecord = {
  id: string;
  business_id: string | null;
  business_name: string;
};

export type BusinessContactRelationshipPlan =
  | { action: "use"; id: string }
  | { action: "attach_business_id"; id: string }
  | { action: "create" };

export class BusinessContactRelationshipConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessContactRelationshipConflictError";
  }
}

export function planBusinessContactRelationship(
  exactBusinessMatches: BusinessContactRelationshipRecord[],
  sameNameMatches: BusinessContactRelationshipRecord[],
  businessId: string,
): BusinessContactRelationshipPlan {
  if (exactBusinessMatches.length > 1) {
    throw new BusinessContactRelationshipConflictError("Multiple contact relationships match this business ID.");
  }
  if (exactBusinessMatches.length === 1) {
    return { action: "use", id: exactBusinessMatches[0].id };
  }

  if (sameNameMatches.length > 1) {
    throw new BusinessContactRelationshipConflictError("Multiple legacy contact relationships use this business name.");
  }
  if (sameNameMatches.length === 0) return { action: "create" };

  const [sameName] = sameNameMatches;
  if (sameName.business_id === businessId) return { action: "use", id: sameName.id };
  if (sameName.business_id === null) return { action: "attach_business_id", id: sameName.id };

  throw new BusinessContactRelationshipConflictError(
    "This contact already has a relationship with a different business that uses the same name.",
  );
}

export async function ensureBusinessContactRelationship(
  client: any,
  input: { contactId: string; businessId: string; businessName: string },
  retryAfterUniqueConflict = true,
): Promise<string> {
  const { contactId, businessId, businessName } = input;
  if (!contactId || !businessId || !businessName.trim()) {
    throw new Error("Contact and business IDs are required to create a business relationship.");
  }

  const [exactResult, nameResult] = await Promise.all([
    client.from("business_contact_relationships")
      .select("id,business_id,business_name")
      .eq("contact_id", contactId)
      .eq("business_id", businessId)
      .limit(2),
    client.from("business_contact_relationships")
      .select("id,business_id,business_name")
      .eq("contact_id", contactId)
      .eq("business_name", businessName)
      .limit(2),
  ]);

  if (exactResult.error) throw exactResult.error;
  if (nameResult.error) throw nameResult.error;

  const plan = planBusinessContactRelationship(
    (exactResult.data ?? []) as BusinessContactRelationshipRecord[],
    (nameResult.data ?? []) as BusinessContactRelationshipRecord[],
    businessId,
  );
  if (plan.action === "use") return plan.id;

  if (plan.action === "attach_business_id") {
    const { data, error } = await client.from("business_contact_relationships")
      .update({ business_id: businessId })
      .eq("id", plan.id)
      .is("business_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
    if (retryAfterUniqueConflict) return ensureBusinessContactRelationship(client, input, false);
    throw new BusinessContactRelationshipConflictError("The legacy business relationship changed while it was being linked.");
  }

  const { data, error } = await client.from("business_contact_relationships")
    .insert({
      contact_id: contactId,
      business_id: businessId,
      business_name: businessName,
      qualification: "needs_review",
      campaign_eligible: false,
      current_stage: "ready_to_stage",
    })
    .select("id")
    .maybeSingle();
  if (!error && data?.id) return data.id as string;
  if (error?.code === "23505" && retryAfterUniqueConflict) {
    return ensureBusinessContactRelationship(client, input, false);
  }
  if (error) throw error;
  throw new Error("The business relationship was not saved.");
}

export function normalizeContactEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function escapeLikePatternLiteral(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function chooseUniqueContact<T extends { id: string }>(matches: T[]): T | null {
  if (matches.length > 1) {
    throw new Error("This email matches multiple CRM contacts. Resolve the duplicate identities before continuing.");
  }
  return matches[0] ?? null;
}

export async function resolveOrCreateContact(
  client: any,
  input: { email: string; name?: string | null; company?: string | null; role?: string | null; source?: string | null },
): Promise<string> {
  const email = normalizeContactEmail(input.email);
  if (!email) throw new Error("Email is required to resolve a CRM contact.");

  // Use the same normalized, ambiguity-safe global identity resolver as the
  // checkout Edge Function. It compares lower(trim(email)) and only founder /
  // admin CRM callers or service_role can execute it.
  const { data: matchedContactId, error: lookupError } = await client.rpc("customer_sales_link_contact_by_email", { p_email: email });
  if (lookupError) {
    if (String(lookupError.message ?? "").includes("ambiguous_contact_email")) {
      throw new Error("This email matches multiple CRM contacts. Resolve the duplicate identities before continuing.");
    }
    throw lookupError;
  }

  if (typeof matchedContactId === "string" && matchedContactId) {
    const patch: Record<string, string> = {};
    for (const key of ["name", "company", "role", "source"] as const) {
      const value = input[key]?.trim();
      if (value) patch[key] = value;
    }
    if (Object.keys(patch).length) {
      const { error } = await client.from("contacts").update(patch).eq("id", matchedContactId);
      if (error) throw error;
    }
    return matchedContactId;
  }

  // Keep the existing global-person upsert as the sole contact-creation path.
  // Business context is intentionally omitted; it is represented by a BCR below.
  const { data, error } = await client.rpc("upsert_contact", {
    _email: email,
    _name: input.name?.trim() || null,
    _company: input.company?.trim() || null,
    _role: input.role?.trim() || null,
    _source: input.source?.trim() || null,
    _assigned_business: null,
    _assigned_inbox_id: null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const contactId = (row as { id?: unknown } | null)?.id;
  if (typeof contactId !== "string" || !contactId) {
    throw new Error("The master contact record could not be resolved.");
  }
  return contactId;
}
