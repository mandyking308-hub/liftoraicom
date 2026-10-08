export interface BusinessNameRow {
  id: string;
  name: string;
  portfolio_status: string | null;
}

export type CanonicalBusinessResult =
  | { ok: true; id: string }
  | { ok: false; reason: "business_not_found" | "ambiguous_active_business" };

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/** Archived/legacy rows may share a name; only one active row is canonical for outbound. */
export function resolveCanonicalActiveBusiness(
  rows: readonly BusinessNameRow[],
  businessName: string,
): CanonicalBusinessResult {
  const target = normalize(businessName);
  const active = rows.filter((row) => row.portfolio_status === "active" && normalize(row.name) === target);
  if (active.length === 0) return { ok: false, reason: "business_not_found" };
  if (active.length > 1) return { ok: false, reason: "ambiguous_active_business" };
  return { ok: true, id: active[0].id };
}
