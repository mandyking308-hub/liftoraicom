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

  it("registers the safe cron RPC so it is not flagged undocumented", () => {
    const rpc = REGISTRY.find((r) => r.source === "rpc:public.get_outreach_send_cron_status");
    expect(rpc, "get_outreach_send_cron_status not registered").toBeTruthy();
    expect(rpc!.risk).toBe("admin-security");
    expect(rpc!.notes ?? "").toMatch(/SECURITY DEFINER/i);
    expect(rpc!.notes ?? "").toMatch(/service_role/i);
    expect(rpc!.notes ?? "").toMatch(/Mutation:\s*none/i);
  });

  it("uses the corrected Queue Creation Gate wording (no unsafe legacy text)", () => {
    const gate = REGISTRY.find((r) => r.name === "Queue Creation Gate");
    expect(gate, "Queue Creation Gate missing").toBeTruthy();
    const notes = gate!.notes ?? "";
    expect(notes).toMatch(/Queue creation is paused/i);
    expect(notes).not.toMatch(/Inserts email_queue Step 1/i);
    expect(notes).not.toMatch(/worker will not send/i);
  });

  it("represents at least one public token-based dynamic route", () => {
    const tokenRoute = REGISTRY.find((r) => r.path === "/proposals/view/:token");
    expect(tokenRoute, "/proposals/view/:token not represented").toBeTruthy();
    expect(tokenRoute!.status).toBe("dynamic");
    expect(tokenRoute!.notes ?? "").toMatch(/Dynamic route/i);
  });
});