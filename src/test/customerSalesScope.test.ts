import { describe, expect, it } from "vitest";
import {
  assertCustomerSalesBusiness,
  CustomerSalesScopeError,
  filterCustomerSalesOffers,
  requireCustomerSalesBusinessId,
  resolveCustomerSalesRecommendation,
} from "../../supabase/functions/_shared/customerSalesScope";

describe("customer-sales business scoping", () => {
  it("requires a business context", () => {
    expect(() => requireCustomerSalesBusinessId(null)).toThrow(CustomerSalesScopeError);
    expect(requireCustomerSalesBusinessId("business-1")).toBe("business-1");
  });

  it("rejects catalog references outside the conversation business", () => {
    expect(() => assertCustomerSalesBusiness({ id: "p1", business_id: "business-2" }, "business-1", "product"))
      .toThrow(/does not belong/i);
    expect(() => assertCustomerSalesBusiness(null, "business-1", "offer"))
      .toThrow(/does not belong/i);
  });

  it("only includes same-business offers with no cross-business product reference", () => {
    const result = filterCustomerSalesOffers([
      { id: "offer-1", business_id: "business-1", product_id: "product-1" },
      { id: "offer-2", business_id: "business-2", product_id: "product-1" },
      { id: "offer-3", business_id: "business-1", product_id: "product-2" },
      { id: "offer-4", business_id: "business-1", product_id: null },
    ], "business-1", new Set(["product-1"]));
    expect(result.map((row) => row.id)).toEqual(["offer-1", "offer-4"]);
  });

  it("clears and flags recommendations that are outside the scoped catalog", () => {
    const allowed = new Set(["product-1"]);
    expect(resolveCustomerSalesRecommendation("product-1", allowed)).toEqual({ id: "product-1", blocked: false });
    expect(resolveCustomerSalesRecommendation("product-from-another-business", allowed)).toEqual({ id: null, blocked: true });
  });
});
