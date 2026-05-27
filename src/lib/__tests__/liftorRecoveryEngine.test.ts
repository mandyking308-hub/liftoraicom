import { describe, it, expect } from "vitest";
import {
  integrityHash,
  verifyIntegrity,
  isDangerousRestore,
  scopeHealth,
  computeUsage,
  SNAPSHOT_SCOPES,
  type Snapshot,
} from "@/lib/liftorRecoveryEngine";

function snap(over: Partial<Snapshot> = {}): Snapshot {
  const payload = over.payload ?? { hello: "world" };
  return {
    id: crypto.randomUUID(),
    scope: "database",
    label: "test",
    taken_by: null,
    payload,
    byte_size: JSON.stringify(payload).length,
    integrity_hash: integrityHash(payload),
    status: "ready",
    error_message: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}

describe("liftorRecoveryEngine — integrity", () => {
  it("hash is stable for the same payload", () => {
    expect(integrityHash({ a: 1 })).toBe(integrityHash({ a: 1 }));
  });
  it("verifies clean snapshot", () => {
    expect(verifyIntegrity(snap())).toBe(true);
  });
  it("detects corrupted snapshot (corrupted state simulation)", () => {
    const s = snap();
    s.payload = { hello: "tampered" };
    expect(verifyIntegrity(s)).toBe(false);
  });
});

describe("liftorRecoveryEngine — dangerous restore confirmation", () => {
  it("flags database/runtime_state/config as dangerous", () => {
    expect(isDangerousRestore("database")).toBe(true);
    expect(isDangerousRestore("runtime_state")).toBe(true);
    expect(isDangerousRestore("config")).toBe(true);
  });
  it("safe scopes do not require confirmation", () => {
    expect(isDangerousRestore("prompt")).toBe(false);
    expect(isDangerousRestore("workflow")).toBe(false);
    expect(isDangerousRestore("memory")).toBe(false);
  });
});

describe("liftorRecoveryEngine — snapshot health", () => {
  it("missing when no snapshot exists", () => {
    expect(scopeHealth(null, "database")).toBe("missing");
  });
  it("healthy when recent", () => {
    expect(scopeHealth(snap(), "database")).toBe("healthy");
  });
  it("stale when older than threshold", () => {
    const old = snap({ created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() });
    expect(scopeHealth(old, "database")).toBe("stale");
  });
  it("failed propagates from status", () => {
    expect(scopeHealth(snap({ status: "failed" }), "database")).toBe("failed");
  });
});

describe("liftorRecoveryEngine — partial restore / usage", () => {
  it("computes per-scope usage with all six scopes present", () => {
    const usage = computeUsage([snap({ scope: "database" }), snap({ scope: "prompt" })]);
    expect(usage.totalSnapshots).toBe(2);
    expect(usage.byScope.database.count).toBe(1);
    expect(usage.byScope.prompt.count).toBe(1);
    expect(usage.byScope.memory.health).toBe("missing");
    expect(SNAPSHOT_SCOPES).toHaveLength(6);
  });
  it("counts failed snapshots (failed restore recovery)", () => {
    const usage = computeUsage([snap({ status: "failed" }), snap()]);
    expect(usage.failedCount).toBe(1);
  });
});