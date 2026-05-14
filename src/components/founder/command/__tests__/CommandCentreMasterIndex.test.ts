import { describe, it, expect } from "vitest";
import {
  REGISTRY,
  DISCOVERED_FOUNDER_ROUTES,
  DISCOVERED_DYNAMIC_FOUNDER_ROUTES,
  runAudit,
} from "../CommandCentreMasterIndex";

describe("CommandCentreMasterIndex registry", () => {
  const audit = runAudit();

  it("represents every non-dynamic founder route", () => {
    const represented = new Set(REGISTRY.map((r) => r.path).filter(Boolean));
    for (const p of DISCOVERED_FOUNDER_ROUTES) {
      expect(represented.has(p), `route not represented: ${p}`).toBe(true);
    }
    expect(audit.missing).toEqual([]);
  });

  it("represents every dynamic founder route as status=dynamic", () => {
    for (const p of DISCOVERED_DYNAMIC_FOUNDER_ROUTES) {
      const item = REGISTRY.find((r) => r.path === p);
      expect(item, `dynamic route missing: ${p}`).toBeTruthy();
      expect(item!.status, `dynamic route not labelled dynamic: ${p}`).toBe("dynamic");
    }
    expect(audit.dynamicMissing).toEqual([]);
  });

  it("treats /founder/command-centre as canonical", () => {
    const canonical = REGISTRY.find((r) => r.path === "/founder/command-centre");
    expect(canonical?.status).toBe("valid");
  });

  it("treats /founder/command-center as alias", () => {
    const alias = REGISTRY.find((r) => r.path === "/founder/command-center");
    expect(alias?.status).toBe("alias");
    expect(audit.canonicalViolations).toEqual([]);
  });

  it("treats /founder/command-center/legacy as legacy", () => {
    const legacy = REGISTRY.find((r) => r.path === "/founder/command-center/legacy");
    expect(legacy?.status).toBe("legacy");
  });

  it("has zero broken links into the founder router", () => {
    expect(audit.broken).toEqual([]);
  });

  it("labels every no-route concept correctly", () => {
    const noRouteItems = REGISTRY.filter((r) => !r.path);
    for (const item of noRouteItems) {
      expect(
        ["no-dedicated-ui", "nearest-route-only"].includes(item.status),
        `unlabelled no-route concept: ${item.name}`,
      ).toBe(true);
    }
  });

  it("audit passes overall", () => {
    expect(audit.passed).toBe(true);
    expect(audit.missing.length).toBe(0);
    expect(audit.broken.length).toBe(0);
    expect(audit.dynamicMissing.length).toBe(0);
  });
});