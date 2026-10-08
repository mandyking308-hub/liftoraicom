import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rows: {} as Record<string, any[]>,
  failTable: null as string | null,
  inserts: 0,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const filters: [string, any][] = [];
      const q: any = {
        select: () => q,
        eq: (k: string, v: any) => { filters.push([k, v]); return q; },
        limit: async () => ({
          data: (db.rows[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v)),
          error: null,
        }),
        insert: (row: any) => ({
          select: () => ({
            single: async () => {
              if (db.failTable === table) return { data: null, error: { message: `column "x" of relation "${table}" does not exist` } };
              db.inserts += 1;
              const rec = { id: `${table}-${db.inserts}`, ...row };
              (db.rows[table] ??= []).push(rec);
              return { data: { id: rec.id }, error: null };
            },
          }),
        }),
      };
      return q;
    },
  },
}));

import { promoteIntoLiftorModules, buildPromoteAttempts, TUNNEL_STEPS } from "../businessSetupTunnel";

const BIZ = "640de582-a112-4d16-a221-03c27f00c6ec";
const state = () => ({
  businessId: BIZ, businessName: "Kindnesss", isDraft: false,
  steps: Object.fromEntries(TUNNEL_STEPS.map((s) => [s.key, { status: s.key === "offer" ? "saved" : "pending", fields: s.key === "offer" ? { pricing: "$995/yr" } : {} }])),
} as any);

describe("promoteIntoLiftorModules", () => {
  beforeEach(() => { db.rows = {}; db.failTable = null; db.inserts = 0; });

  it("connects every table-backed area and never enables go-live or sending", async () => {
    const out = await promoteIntoLiftorModules(state());
    for (const k of ["activation", "onboarding_factory", "runtime", "marketing", "sales", "support", "operations", "finance", "evidence"]) {
      expect(out[k as keyof typeof out]?.status).toBe("connected");
    }
    expect(db.rows.business_activation_profiles[0].go_live_allowed).toBe(false);
    expect(db.rows.business_onboarding_factory_runs[0].external_ready).toBe(false);
    expect(db.rows.business_runtime_activation[0].outbound_allowed).toBe(false);
    expect(db.rows.outreach_campaign_drafts[0]).toMatchObject({ external_send_blocked: true, is_live: false });
    expect(db.rows.data_room_profiles[0].data_room_status).toBe("closed");
  });

  it("is idempotent: a retry reuses records instead of duplicating", async () => {
    await promoteIntoLiftorModules(state());
    const first = db.inserts;
    await promoteIntoLiftorModules(state());
    expect(db.inserts).toBe(first);
  });

  it("surfaces database errors as failed instead of hiding them", async () => {
    db.failTable = "cashflow_forecasts";
    const out = await promoteIntoLiftorModules(state());
    expect(out.finance?.status).toBe("failed");
    expect(out.finance?.note).toMatch(/does not exist/);
  });

  it("uses only real column names (no legacy status/stage/runtime_mode/is_live on spine)", () => {
    const a = buildPromoteAttempts(state());
    const act = a.find((x) => x.area === "activation")!.payload;
    expect(act).not.toHaveProperty("stage");
    expect(act).not.toHaveProperty("status");
    const rt = a.find((x) => x.area === "runtime")!.payload;
    expect(rt).not.toHaveProperty("runtime_mode");
    expect(rt).not.toHaveProperty("is_live");
  });
});
