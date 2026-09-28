import { describe, expect, it } from "vitest";
import {
  chooseUniqueContact,
  escapeLikePatternLiteral,
  normalizeContactEmail,
  planBusinessContactRelationship,
  BusinessContactRelationshipConflictError,
} from "@/lib/businessContactRelationship";

describe("canonical contact identity resolution", () => {
  it("normalizes addresses before a global contact lookup", () => {
    expect(normalizeContactEmail("  Person+sales@Example.com ")).toBe("person+sales@example.com");
  });

  it("escapes LIKE wildcards so an email is treated as a literal", () => {
    expect(escapeLikePatternLiteral("person_%@example.com")).toBe("person\\_\\%@example.com");
  });

  it("accepts zero or one global match and fails closed on ambiguous identity", () => {
    expect(chooseUniqueContact([])).toBeNull();
    expect(chooseUniqueContact([{ id: "contact-a" }])).toEqual({ id: "contact-a" });
    expect(() => chooseUniqueContact([{ id: "contact-a" }, { id: "contact-b" }])).toThrow(/multiple CRM contacts/i);
  });
});

describe("business contact relationship resolution", () => {
  it("reuses an exact canonical business ID relationship", () => {
    const row = { id: "bcr-1", business_id: "business-1", business_name: "Acme" };
    expect(planBusinessContactRelationship([row], [row], "business-1")).toEqual({ action: "use", id: "bcr-1" });
  });

  it("upgrades a unique legacy name-only relationship to the selected business ID", () => {
    const legacy = { id: "bcr-legacy", business_id: null, business_name: "Acme" };
    expect(planBusinessContactRelationship([], [legacy], "business-1")).toEqual({ action: "attach_business_id", id: "bcr-legacy" });
  });

  it("creates a relationship when none exists and rejects a same-name different-business conflict", () => {
    expect(planBusinessContactRelationship([], [], "business-1")).toEqual({ action: "create" });
    const conflict = { id: "bcr-other", business_id: "business-2", business_name: "Acme" };
    expect(() => planBusinessContactRelationship([], [conflict], "business-1")).toThrow(BusinessContactRelationshipConflictError);
  });

  it("rejects duplicate legacy rows instead of choosing the first one", () => {
    const rows = [
      { id: "bcr-a", business_id: null, business_name: "Acme" },
      { id: "bcr-b", business_id: null, business_name: "Acme" },
    ];
    expect(() => planBusinessContactRelationship([], rows, "business-1")).toThrow(/multiple legacy/i);
  });
});
