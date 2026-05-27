import { describe, it, expect } from "vitest";
import {
  ALL_MODES, MODE_BEHAVIOR, canPerform, isDangerousTransition,
} from "@/lib/systemModeEngine";

describe("System runtime mode engine", () => {
  it("exposes the 5 required modes", () => {
    expect(ALL_MODES).toEqual([
      "LIVE_INTERNAL_TEST",
      "APPROVAL_REQUIRED",
      "MONDAY_WATCH",
      "EMERGENCY_PAUSE",
      "READ_ONLY_RECOVERY",
    ]);
  });

  it("LIVE_INTERNAL_TEST blocks all external sends", () => {
    expect(canPerform("LIVE_INTERNAL_TEST", "external_send").allowed).toBe(false);
    expect(canPerform("LIVE_INTERNAL_TEST", "internal_write").allowed).toBe(true);
    expect(canPerform("LIVE_INTERNAL_TEST", "read").allowed).toBe(true);
  });

  it("APPROVAL_REQUIRED gates external sends behind founder approval", () => {
    const r = canPerform("APPROVAL_REQUIRED", "external_send");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("founder_approval_required");
  });

  it("MONDAY_WATCH allows supervised external sends without per-action approval", () => {
    expect(canPerform("MONDAY_WATCH", "external_send").allowed).toBe(true);
    expect(MODE_BEHAVIOR.MONDAY_WATCH.enhancedLogging).toBe(true);
    expect(MODE_BEHAVIOR.MONDAY_WATCH.escalationSensitivity).toBe("elevated");
  });

  it("EMERGENCY_PAUSE freezes queues and disables outbound, preserves reads", () => {
    expect(canPerform("EMERGENCY_PAUSE", "queue_drain").allowed).toBe(false);
    expect(canPerform("EMERGENCY_PAUSE", "external_send").allowed).toBe(false);
    expect(canPerform("EMERGENCY_PAUSE", "read").allowed).toBe(true);
    expect(canPerform("EMERGENCY_PAUSE", "internal_write").allowed).toBe(true);
  });

  it("READ_ONLY_RECOVERY disables writes, preserves reads", () => {
    expect(canPerform("READ_ONLY_RECOVERY", "internal_write").allowed).toBe(false);
    expect(canPerform("READ_ONLY_RECOVERY", "external_send").allowed).toBe(false);
    expect(canPerform("READ_ONLY_RECOVERY", "read").allowed).toBe(true);
  });

  it("flags entering EMERGENCY_PAUSE / READ_ONLY_RECOVERY as dangerous transitions", () => {
    expect(isDangerousTransition("MONDAY_WATCH", "EMERGENCY_PAUSE")).toBe(true);
    expect(isDangerousTransition("APPROVAL_REQUIRED", "READ_ONLY_RECOVERY")).toBe(true);
    expect(isDangerousTransition("LIVE_INTERNAL_TEST", "APPROVAL_REQUIRED")).toBe(false);
  });
});