import { describe, it, expect } from "vitest";
import {
  buildOperationKey,
  normaliseKeyPart,
  getFirewallStatus,
  reserveCredits,
  loadNoEmailPersonIds,
} from "../../../supabase/functions/_shared/apolloCreditFirewall";

describe("apollo credit firewall — deterministic operation keys", () => {
  it("produces the same key for the same logical operation regardless of id order", () => {
    const a = buildOperationKey({ function_source: "apollo-sync-enrich", scope: "run:1:bulk", apollo_person_ids: ["p2", "p1"] });
    const b = buildOperationKey({ function_source: "apollo-sync-enrich", scope: "run:1:bulk", apollo_person_ids: ["p1", "p2"] });
    expect(a).toBe(b);
  });

  it("separates bulk and single scopes so the fallback cannot reuse a bulk reservation", () => {
    const bulk = buildOperationKey({ function_source: "apollo-sync-enrich", scope: "run:1:bulk", apollo_person_ids: ["p1"] });
    const single = buildOperationKey({ function_source: "apollo-sync-enrich", scope: "run:1:single", apollo_person_ids: ["p1"] });
    expect(bulk).not.toBe(single);
  });

  it("separates different functions and runs", () => {
    const one = buildOperationKey({ function_source: "apollo-unlock-selected", scope: "business:neon", apollo_person_ids: ["p1"] });
    const two = buildOperationKey({ function_source: "autopilot-orchestrator", scope: "business:neon", apollo_person_ids: ["p1"] });
    expect(one).not.toBe(two);
  });

  it("normalises unsafe characters", () => {
    expect(normaliseKeyPart("Neon Candy Ltd!")).toBe("neon-candy-ltd");
  });
});

const rpcStub = (impl: Record<string, any>) => ({
  rpc: async (name: string, _args?: unknown) => ({ data: impl[name] ?? null, error: impl[`${name}__error`] ?? null }),
  from: () => ({
    select: () => ({ eq: () => ({ in: async () => ({ data: impl.no_email_rows ?? [] }) }) }),
  }),
});

describe("apollo credit firewall — fail-closed behaviour", () => {
  it("reports not-ok when the policy cannot be read", async () => {
    const status = await getFirewallStatus(rpcStub({ apollo_credit_status__error: { message: "boom" } }) as any);
    expect(status.ok).toBe(false);
    expect(status.paid_enrichment_enabled).toBe(false);
    expect(status.hard_credit_limit).toBe(0);
  });

  it("defaults to disabled with a zero limit when no policy row exists", async () => {
    const status = await getFirewallStatus(rpcStub({}) as any);
    expect(status.paid_enrichment_enabled).toBe(false);
    expect(status.hard_credit_limit).toBe(0);
    expect(status.allow_phone_reveal).toBe(false);
    expect(status.allow_waterfall).toBe(false);
  });

  it("treats an RPC error on reserve as a refusal, never as permission", async () => {
    const res = await reserveCredits(rpcStub({ apollo_credit_reserve__error: { message: "locked" } }) as any, {
      operation_key: "k", function_source: "test", estimated_credits: 5,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("firewall_error");
  });

  it("passes through a database refusal reason", async () => {
    const res = await reserveCredits(rpcStub({
      apollo_credit_reserve: { allowed: false, reason: "hard_credit_limit_zero" },
    }) as any, { operation_key: "k", function_source: "test", estimated_credits: 1 });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("hard_credit_limit_zero");
  });

  it("collects previously no-email person ids so they are not re-spent", async () => {
    const set = await loadNoEmailPersonIds(
      rpcStub({ no_email_rows: [{ apollo_person_id: "p1" }, { apollo_person_id: "p9" }] }) as any,
      ["p1", "p2", "p9"],
    );
    expect(set.has("p1")).toBe(true);
    expect(set.has("p9")).toBe(true);
    expect(set.has("p2")).toBe(false);
  });

  it("returns an empty set without querying when no ids are supplied", async () => {
    const set = await loadNoEmailPersonIds(rpcStub({}) as any, []);
    expect(set.size).toBe(0);
  });
});
