import { describe, it, expect } from "vitest";
import {
  scoreFailureRate,
  scoreLatency,
  isStale,
  aggregateHealth,
  ALL_COMPONENTS,
  type ComponentHealth,
} from "@/lib/systemHealthEngine";

function mk(id: any, status: any, score: number): ComponentHealth {
  return {
    id, label: id, status, score,
    metric: "", detail: "", lastHeartbeat: new Date().toISOString(), stale: false,
  };
}

describe("systemHealthEngine — scoring", () => {
  it("flags GREEN under 2% failure", () => {
    expect(scoreFailureRate(0.01, 200).status).toBe("GREEN");
  });
  it("flags AMBER between 2% and 10%", () => {
    expect(scoreFailureRate(0.05, 200).status).toBe("AMBER");
  });
  it("flags RED at or above 10% (simulated outage)", () => {
    const r = scoreFailureRate(0.4, 500);
    expect(r.status).toBe("RED");
    expect(r.score).toBeLessThan(40);
  });
  it("returns UNKNOWN with no samples", () => {
    expect(scoreFailureRate(0, 0).status).toBe("UNKNOWN");
  });
});

describe("systemHealthEngine — latency (timeout/degraded API)", () => {
  it("GREEN at low latency", () => {
    expect(scoreLatency(120).status).toBe("GREEN");
  });
  it("AMBER on degraded API", () => {
    expect(scoreLatency(700).status).toBe("AMBER");
  });
  it("RED on timeout scenario", () => {
    expect(scoreLatency(2000).status).toBe("RED");
  });
});

describe("systemHealthEngine — heartbeat / stale worker detection", () => {
  it("treats missing heartbeat as stale", () => {
    expect(isStale(null)).toBe(true);
  });
  it("treats >15m old heartbeat as stale (worker failure)", () => {
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isStale(old)).toBe(true);
  });
  it("treats recent heartbeat as fresh", () => {
    expect(isStale(new Date().toISOString())).toBe(false);
  });
});

describe("systemHealthEngine — aggregation", () => {
  it("returns RED overall when any component is RED", () => {
    const r = aggregateHealth([mk("a", "GREEN", 95), mk("b", "RED", 20)]);
    expect(r.status).toBe("RED");
    expect(r.criticals).toBe(1);
  });
  it("returns AMBER when warnings but no criticals", () => {
    const r = aggregateHealth([mk("a", "GREEN", 95), mk("b", "AMBER", 70)]);
    expect(r.status).toBe("AMBER");
    expect(r.warnings).toBe(1);
  });
  it("returns GREEN when all clear", () => {
    const r = aggregateHealth([mk("a", "GREEN", 95), mk("b", "GREEN", 92)]);
    expect(r.status).toBe("GREEN");
    expect(r.uptimeEstimatePct).toBeGreaterThanOrEqual(95);
  });
  it("covers all 13 monitored services", () => {
    expect(ALL_COMPONENTS).toHaveLength(13);
  });
});