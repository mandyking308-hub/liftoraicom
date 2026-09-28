export type OutreachImportBusiness = { id: string; name: string };

export type OutreachImportAuthDependencies = {
  verifyAccessToken: (token: string) => Promise<{ id: string } | null>;
  getRoles: (userId: string) => Promise<string[]>;
  resolveBusiness: (canonicalName: string) => Promise<OutreachImportBusiness | null>;
};

export type OutreachImportAuthResult =
  | { authorized: true; userId: string; business: OutreachImportBusiness }
  | { authorized: false; status: 400 | 401 | 403 | 503; error: string };

/**
 * Resolves identity, operator role, and business context before a caller may
 * use service-role writes. The caller supplies no trusted identity or business
 * id; business_name must resolve to a canonical row on the server.
 */
export async function authorizeOutreachImport(
  authorizationHeader: string | null,
  requestedBusinessName: unknown,
  dependencies: OutreachImportAuthDependencies,
): Promise<OutreachImportAuthResult> {
  const bearer = authorizationHeader?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  if (!bearer) return { authorized: false, status: 401, error: "unauthorized" };

  if (typeof requestedBusinessName !== "string" || !requestedBusinessName.trim()) {
    return { authorized: false, status: 400, error: "business_name required" };
  }

  let user: { id: string } | null;
  try {
    user = await dependencies.verifyAccessToken(bearer);
  } catch {
    return { authorized: false, status: 503, error: "authorization_unavailable" };
  }
  if (!user?.id) return { authorized: false, status: 401, error: "unauthorized" };

  let roles: string[];
  try {
    roles = await dependencies.getRoles(user.id);
  } catch {
    return { authorized: false, status: 503, error: "authorization_unavailable" };
  }
  if (!roles.some((role) => role === "founder" || role === "admin")) {
    return { authorized: false, status: 403, error: "forbidden" };
  }

  const requestedName = requestedBusinessName.trim();
  let business: OutreachImportBusiness | null;
  try {
    business = await dependencies.resolveBusiness(requestedName);
  } catch {
    return { authorized: false, status: 503, error: "business_scope_unavailable" };
  }
  if (!business?.id || !business.name || business.name !== requestedName) {
    return { authorized: false, status: 403, error: "business_not_authorized" };
  }

  return { authorized: true, userId: user.id, business };
}
