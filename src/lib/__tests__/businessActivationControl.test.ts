import { describe, it, expect } from "vitest";
import {
  matchAllowlist, deriveEffectiveState, canExecute, summarise,
  type ActivationRow, type BusinessRow,
} from "../businessActivationControl";

function biz(id: string, name: string): BusinessRow {
  return { id, name };
}

function act(overrides: Partial<ActivationRow>): ActivationRow {
  return {
    id: "a1",
    business_id: "b1",
    activated: true,
    risk_level: "low",
    runtime_state: "live",
    outbound_allowed: true,
    queue_allowed: true,
    ai_orchestration_allowed: true,
    notes: null,
    activated_by: null,
    activated_at: new Date().toISOString(),
    deactivated_at: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("matchAllowlist", () => {
  it("matches NeonCandy variations", () => {
    expect(matchAllowlist("Neon Candy")?.key).toBe("neoncandy");
    expect(matchAllowlist("NEONCANDY")?.key).toBe("neoncandy");
  });
  it("matches ServiceOpsDemo aliases", () => {
    expect(matchAllowlist("ServiceOpsDemo")?.key).toBe("serviceopsdemo");
    expect(matchAllowlist("LIVE_INTERNAL_TEST · Service / agency test business")?.key).toBe("serviceopsdemo");
  });
  it("matches InternalOps aliases", () => {
    expect(matchAllowlist("Liftor Rehearsal Business — Internal Test")?.key).toBe("internalops");
    expect(matchAllowlist("InternalOps")?.key).toBe("internalops");
  });
  it("rejects unknown businesses", () => {
    expect(matchAllowlist("Test Business 002")).toBeNull();
    expect(matchAllowlist("Random LLC")).toBeNull();
  });
});

describe("deriveEffectiveState — disabled business cannot execute", () => {
  it("forces non-allowlisted active rows to isolated", () => {
    const c = deriveEffectiveState(
      biz("b1", "Test Business 002"),
      act({ business_id: "b1", activated: true, runtime_state: "live" }),
    );
    expect(c.allowed).toBe(false);
    expect(c.effectiveState).toBe("isolated");
    expect(c.outboundAllowed).toBe(false);
    expect(c.queueAllowed).toBe(false);
    expect(c.aiAllowed).toBe(false);
  });

  it("respects activation only when allowlisted", () => {
    const c = deriveEffectiveState(
      biz("b1", "Neon Candy"),
      act({ business_id: "b1" }),
    );
    expect(c.allowed).toBe(true);
    expect(c.effectiveState).toBe("live");
    expect(c.outboundAllowed).toBe(true);
  });

  it("treats missing activation row as isolated", () => {
    const c = deriveEffectiveState(biz("b1", "Neon Candy"), null);
    expect(c.effectiveState).toBe("isolated");
    expect(c.queueAllowed).toBe(false);
  });
});

describe("canExecute — runtime gate", () => {
  it("blocks every channel for disabled businesses", () => {
    const c = deriveEffectiveState(biz("b1", "Test Business 002"), null);
    expect(canExecute(c, "queue").allowed).toBe(false);
    expect(canExecute(c, "outbound").allowed).toBe(false);
    expect(canExecute(c, "ai").allowed).toBe(false);
    expect(canExecute(c, "outbound").reason).toMatch(/allowlist|isolated/);
  });

  it("blocks channels when the specific flag is off even for live businesses", () => {
    const c = deriveEffectiveState(
      biz("b1", "Neon Candy"),
      act({ business_id: "b1", outbound_allowed: false }),
    );
    expect(canExecute(c, "queue").allowed).toBe(true);
    expect(canExecute(c, "outbound").allowed).toBe(false);
    expect(canExecute(c, "outbound").reason).toBe("outbound_disabled");
  });

  it("allows all channels for fully-live allowlisted business", () => {
    const c = deriveEffectiveState(biz("b1", "Neon Candy"), act({ business_id: "b1" }));
    expect(canExecute(c, "queue").allowed).toBe(true);
    expect(canExecute(c, "outbound").allowed).toBe(true);
    expect(canExecute(c, "ai").allowed).toBe(true);
  });

  it("blocks quarantined businesses even if allowlisted (DB row deactivated)", () => {
    const c = deriveEffectiveState(
      biz("b1", "Neon Candy"),
      act({ business_id: "b1", activated: false, runtime_state: "quarantined", outbound_allowed: false, queue_allowed: false, ai_orchestration_allowed: false }),
    );
    expect(c.effectiveState).toBe("isolated");
    expect(canExecute(c, "queue").allowed).toBe(false);
  });
});

describe("summarise", () => {
  it("computes active/isolated/allowlisted counts", () => {
    const rows = [
      deriveEffectiveState(biz("1", "Neon Candy"), act({ business_id: "1" })),
      deriveEffectiveState(biz("2", "ServiceOpsDemo"), act({ business_id: "2" })),
      deriveEffectiveState(biz("3", "InternalOps"), null),
      deriveEffectiveState(biz("4", "Random LLC"), act({ business_id: "4", activated: true, runtime_state: "live" })),
    ];
    const s = summarise(rows);
    expect(s.total).toBe(4);
    expect(s.active).toBe(2);
    expect(s.isolated).toBe(2);
    expect(s.allowlisted).toBe(3);
    expect(s.outboundEnabled).toBe(2);
  });
});