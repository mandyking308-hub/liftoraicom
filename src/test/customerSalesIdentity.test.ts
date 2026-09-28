import { describe, expect, it } from "vitest";
import { classifyCustomerSalesContactLookup } from "../../supabase/functions/_shared/customerSalesIdentity";

describe("customer-sales global email identity resolution", () => {
  it("links only a unique returned global contact ID", () => {
    expect(classifyCustomerSalesContactLookup("contact-1")).toEqual({
      status: "linked", contactId: "contact-1", needsReview: false,
    });
    expect(classifyCustomerSalesContactLookup(null)).toEqual({
      status: "unmatched", contactId: null, needsReview: false,
    });
  });

  it("sends ambiguous or failed identity resolution to founder review without a contact ID", () => {
    expect(classifyCustomerSalesContactLookup(null, "ambiguous_contact_email")).toEqual({
      status: "ambiguous", contactId: null, needsReview: true,
    });
    expect(classifyCustomerSalesContactLookup(null, "database timeout")).toEqual({
      status: "lookup_failed", contactId: null, needsReview: true,
    });
    expect(classifyCustomerSalesContactLookup(null, "contact_identity_conflict")).toEqual({
      status: "identity_conflict", contactId: null, needsReview: true,
    });
  });
});
