import { describe, it, expect } from "vitest";
import {
  canAccessPortal,
  externalActionAllowed,
  isWindowActive,
  portalForRole,
  rolesForPortal,
  sessionExpiresAt,
  type AccessWindow,
} from "@/lib/humanWorkforce";

const mkWindow = (overrides: Partial<AccessWindow> = {}): AccessWindow => ({
  id: "w1",
  worker_id: "wkr1",
  portal_type: "operator",
  start_time: new Date(Date.now() - 60_000).toISOString(),
  end_time: new Date(Date.now() + 60 * 60_000).toISOString(),
  max_session_minutes: 60,
  status: "scheduled",
  ...overrides,
});

describe("humanWorkforce", () => {
  it("maps roles to the correct portal", () => {
    expect(portalForRole("technical_operator")).toBe("operator");
    expect(portalForRole("dubai_oversight")).toBe("oversight");
    expect(portalForRole("professional_reviewer")).toBe("oversight");
    expect(portalForRole("admin_support")).toBeNull();
    expect(rolesForPortal("operator")).toContain("technical_operator");
    expect(rolesForPortal("oversight")).toEqual(["dubai_oversight", "professional_reviewer"]);
  });

  it("treats a current window as active", () => {
    expect(isWindowActive(mkWindow())).toBe(true);
  });

  it("rejects expired, future, or revoked windows", () => {
    expect(isWindowActive(mkWindow({ end_time: new Date(Date.now() - 1000).toISOString() }))).toBe(false);
    expect(isWindowActive(mkWindow({ start_time: new Date(Date.now() + 60_000).toISOString() }))).toBe(false);
    expect(isWindowActive(mkWindow({ status: "revoked" }))).toBe(false);
  });

  it("kill switch blocks all portal access", () => {
    expect(canAccessPortal({ killSwitchActive: true, window: mkWindow() }, "operator")).toBe(false);
  });

  it("blocks access when no window or wrong portal", () => {
    expect(canAccessPortal({ killSwitchActive: false, window: null }, "operator")).toBe(false);
    expect(
      canAccessPortal({ killSwitchActive: false, window: mkWindow({ portal_type: "oversight" }) }, "operator")
    ).toBe(false);
  });

  it("allows access when window matches portal and is active and no kill switch", () => {
    expect(canAccessPortal({ killSwitchActive: false, window: mkWindow() }, "operator")).toBe(true);
  });

  it("sessionExpiresAt returns earliest of window end vs max session minutes", () => {
    const login = new Date();
    const longWindow = mkWindow({
      end_time: new Date(login.getTime() + 8 * 60 * 60_000).toISOString(),
      max_session_minutes: 30,
    });
    const exp = sessionExpiresAt(login, longWindow);
    expect(exp.getTime() - login.getTime()).toBe(30 * 60_000);

    const shortWindow = mkWindow({
      end_time: new Date(login.getTime() + 10 * 60_000).toISOString(),
      max_session_minutes: 30,
    });
    const exp2 = sessionExpiresAt(login, shortWindow);
    expect(exp2.getTime() - login.getTime()).toBe(10 * 60_000);
  });

  it("external actions are blocked by default", () => {
    expect(
      externalActionAllowed({ external_action_blocked: true, requires_founder_approval: true, status: "submitted" })
    ).toBe(false);
    expect(
      externalActionAllowed({ external_action_blocked: false, requires_founder_approval: true, status: "submitted" })
    ).toBe(false);
    expect(
      externalActionAllowed({ external_action_blocked: false, requires_founder_approval: false, status: "assigned" })
    ).toBe(true);
    expect(
      externalActionAllowed({ external_action_blocked: false, requires_founder_approval: true, status: "completed" })
    ).toBe(true);
  });
});