export type ContactEmailLookupStatus = "linked" | "unmatched" | "ambiguous" | "identity_conflict" | "lookup_failed";

export function classifyCustomerSalesContactLookup(
  contactId: unknown,
  errorMessage?: string | null,
): { status: ContactEmailLookupStatus; contactId: string | null; needsReview: boolean } {
  if (errorMessage) {
    const identityConflict = errorMessage.includes("contact_identity_conflict");
    const ambiguous = errorMessage.includes("ambiguous_contact_email");
    return {
      status: identityConflict ? "identity_conflict" : ambiguous ? "ambiguous" : "lookup_failed",
      contactId: null,
      needsReview: true,
    };
  }
  if (typeof contactId === "string" && contactId) {
    return { status: "linked", contactId, needsReview: false };
  }
  return { status: "unmatched", contactId: null, needsReview: false };
}
