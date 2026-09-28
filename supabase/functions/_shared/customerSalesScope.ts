export class CustomerSalesScopeError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CustomerSalesScopeError";
  }
}

export function requireCustomerSalesBusinessId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CustomerSalesScopeError("business_context_required", "A business context is required for customer-sales analysis.");
  }
  return value;
}

export function assertCustomerSalesBusiness<T extends { business_id?: string | null }>(
  row: T | null | undefined,
  businessId: string,
  kind: "product" | "offer" | "playbook",
): asserts row is T {
  if (!row || row.business_id !== businessId) {
    throw new CustomerSalesScopeError(`${kind}_not_in_business`, `The selected ${kind} does not belong to this conversation's business.`);
  }
}

export function filterCustomerSalesOffers<T extends { business_id?: string | null; product_id?: string | null }>(
  offers: T[],
  businessId: string,
  validProductIds: Set<string>,
): T[] {
  return offers.filter((offer) =>
    offer.business_id === businessId &&
    (!offer.product_id || validProductIds.has(offer.product_id))
  );
}

export function resolveCustomerSalesRecommendation(
  candidateId: unknown,
  allowedIds: Set<string>,
): { id: string | null; blocked: boolean } {
  if (candidateId === null || candidateId === undefined || candidateId === "") return { id: null, blocked: false };
  if (typeof candidateId !== "string" || !allowedIds.has(candidateId)) return { id: null, blocked: true };
  return { id: candidateId, blocked: false };
}
