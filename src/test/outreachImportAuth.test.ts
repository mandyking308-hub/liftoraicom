import { describe, expect, it, vi } from "vitest";
import { authorizeOutreachImport } from "../../supabase/functions/_shared/outreachImportAuth";

const validDeps = () => ({
  verifyAccessToken: vi.fn(async (token: string) => token === "valid-token" ? { id: "user-1" } : null),
  getRoles: vi.fn(async () => ["founder"]),
  resolveBusiness: vi.fn(async (name: string) => name === "Velocity" ? { id: "biz-1", name } : null),
});

describe("outreach import authorization", () => {
  it("rejects a missing bearer token before privileged dependencies run", async () => {
    const deps = validDeps();
    const result = await authorizeOutreachImport(null, "Velocity", deps);
    expect(result).toEqual({ authorized: false, status: 401, error: "unauthorized" });
    expect(deps.verifyAccessToken).not.toHaveBeenCalled();
    expect(deps.getRoles).not.toHaveBeenCalled();
  });

  it("rejects an invalid token before role or business lookups", async () => {
    const deps = validDeps();
    const result = await authorizeOutreachImport("Bearer invalid", "Velocity", deps);
    expect(result).toEqual({ authorized: false, status: 401, error: "unauthorized" });
    expect(deps.getRoles).not.toHaveBeenCalled();
    expect(deps.resolveBusiness).not.toHaveBeenCalled();
  });

  it("denies authenticated non-operator roles before business resolution", async () => {
    const deps = { ...validDeps(), getRoles: vi.fn(async () => ["client"]) };
    const result = await authorizeOutreachImport("Bearer valid-token", "Velocity", deps);
    expect(result).toEqual({ authorized: false, status: 403, error: "forbidden" });
    expect(deps.resolveBusiness).not.toHaveBeenCalled();
  });

  it("fails closed for an unknown or non-canonical business", async () => {
    const deps = validDeps();
    const result = await authorizeOutreachImport("Bearer valid-token", "velocity", deps);
    expect(result).toEqual({ authorized: false, status: 403, error: "business_not_authorized" });
  });

  it("returns the server-resolved canonical business for an authorized founder", async () => {
    const deps = validDeps();
    const result = await authorizeOutreachImport("Bearer valid-token", " Velocity ", deps);
    expect(result).toEqual({
      authorized: true,
      userId: "user-1",
      business: { id: "biz-1", name: "Velocity" },
    });
    expect(deps.resolveBusiness).toHaveBeenCalledWith("Velocity");
  });

  it("fails closed when identity, role, or business services fail", async () => {
    const identityFailure = await authorizeOutreachImport("Bearer valid-token", "Velocity", {
      ...validDeps(), verifyAccessToken: vi.fn(async () => { throw new Error("offline"); }),
    });
    expect(identityFailure).toEqual({ authorized: false, status: 503, error: "authorization_unavailable" });

    const roleFailure = await authorizeOutreachImport("Bearer valid-token", "Velocity", {
      ...validDeps(), getRoles: vi.fn(async () => { throw new Error("offline"); }),
    });
    expect(roleFailure).toEqual({ authorized: false, status: 503, error: "authorization_unavailable" });

    const businessFailure = await authorizeOutreachImport("Bearer valid-token", "Velocity", {
      ...validDeps(), resolveBusiness: vi.fn(async () => { throw new Error("offline"); }),
    });
    expect(businessFailure).toEqual({ authorized: false, status: 503, error: "business_scope_unavailable" });
  });
});
