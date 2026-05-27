import { describe, it, expect } from "vitest";
import {
  aggregateScore, statusFromScore, recommendation,
  checkFromBool, checkFromRatio,
  type ReadinessCheck,
} from "../mondayReadinessEngine";

const pass = (id: string, w = 1, sev: "blocker" | "warning" | "info" = "warning"): ReadinessCheck =>
  checkFromBool(id, id, "routes", true, w, sev, "ok", "bad");
const fail = (id: string, w = 1, sev: "blocker" | "warning" | "info" = "blocker"): ReadinessCheck =>
  checkFromBool(id, id, "routes", false, w, sev, "ok", "bad", "fix it");

describe("aggregateScore", () => {
  it("returns 100 when all pass", () => {
    const r = aggregateScore([pass("a"), pass("b"), pass("c")]);
    expect(r.score).toBe(100);
    expect(r.confidence).toBe(100);
  });
  it("weights checks correctly", () => {
    const r = aggregateScore([pass("a", 1), fail("b", 3)]);
    // 100*1 + 0*3 over 4 → 25
    expect(r.score).toBe(25);
  });
  it("ignores skipped from score, lowers confidence", () => {
    const skipped: ReadinessCheck = {
      id: "x", label: "x", category: "queues", weight: 1,
      severity: "warning", status: "skipped", score: 0, message: "n/a",
    };
    const r = aggregateScore([pass("a"), skipped]);
    expect(r.score).toBe(100);
    expect(r.confidence).toBe(50);
  });
});

describe("statusFromScore", () => {
  it("blockers force NOT_READY regardless of score", () => {
    expect(statusFromScore(99, 1)).toBe("NOT_READY");
  });
  it("maps score buckets", () => {
    expect(statusFromScore(40, 0)).toBe("NOT_READY");
    expect(statusFromScore(60, 0)).toBe("PARTIAL");
    expect(statusFromScore(80, 0)).toBe("WATCH_MODE");
    expect(statusFromScore(95, 0)).toBe("FOUNDER_READY");
  });
});

describe("recommendation", () => {
  it("blocks when NOT_READY", () => {
    expect(recommendation("NOT_READY", 2, 0)).toMatch(/Do not launch/);
  });
  it("greenlights when FOUNDER_READY", () => {
    expect(recommendation("FOUNDER_READY", 0, 0)).toMatch(/Founder Ready/);
  });
});

describe("intentional failure scenarios", () => {
  it("missing secrets simulated → NOT_READY", () => {
    const checks = [pass("a", 1, "warning"), fail("environment", 2, "blocker")];
    const { score } = aggregateScore(checks);
    const blockers = checks.filter((c) => c.status === "fail" && c.severity === "blocker").length;
    expect(statusFromScore(score, blockers)).toBe("NOT_READY");
  });
  it("failed workers (warnings only) → PARTIAL or WATCH_MODE", () => {
    const checks = [
      pass("a", 2), pass("b", 2),
      checkFromBool("worker_heartbeat", "wh", "worker_heartbeat", false, 2, "warning", "ok", "stale", "restart"),
    ];
    const { score } = aggregateScore(checks);
    const status = statusFromScore(score, 0);
    expect(["PARTIAL", "WATCH_MODE"]).toContain(status);
  });
  it("approval bypass attempts modeled as blocker → NOT_READY", () => {
    const checks = [pass("a", 1), fail("approvals", 3, "blocker")];
    const blockers = 1;
    const { score } = aggregateScore(checks);
    expect(statusFromScore(score, blockers)).toBe("NOT_READY");
  });
});

describe("checkFromRatio", () => {
  it("buckets ratios into pass/warn/fail", () => {
    expect(checkFromRatio("x", "x", "queues", 1, 1, "warning", "ok").status).toBe("pass");
    expect(checkFromRatio("x", "x", "queues", 0.7, 1, "warning", "ok").status).toBe("warn");
    expect(checkFromRatio("x", "x", "queues", 0.2, 1, "warning", "ok").status).toBe("fail");
  });
});