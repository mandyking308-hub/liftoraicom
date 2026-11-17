import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  updates: [] as { row: any; id: string }[],
  inserts: [] as any[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      expect(table).toBe("business_setup_tunnel_runs");
      const q: any = {
        select: () => q,
        eq: (column: string, value: any) => {
          q.column = column;
          q.value = value;
          return q;
        },
        is: () => q,
        limit: async () => ({
          data: q.column === "draft_business_name" ? [{ id: "existing-draft-run" }] : [],
          error: null,
        }),
        update: (row: any) => ({
          eq: async (_column: string, id: string) => {
            db.updates.push({ row, id });
            return { error: null };
          },
        }),
        insert: (row: any) => {
          db.inserts.push(row);
          throw new Error("The promoted draft must reuse its existing setup run");
        },
      };
      return q;
    },
    auth: { getUser: vi.fn() },
  },
}));

import { saveRemote, TUNNEL_STEPS, type TunnelState } from "../businessSetupTunnel";

const BIZ = "640de582-a112-4d16-a221-03c27f00c6ec";

describe("saveRemote company promotion", () => {
  beforeEach(() => { db.updates = []; db.inserts = []; });

  it("adopts the existing draft run instead of duplicating it", async () => {
    const state: TunnelState = {
      businessId: BIZ,
      businessName: "Example Company",
      isDraft: false,
      steps: Object.fromEntries(TUNNEL_STEPS.map((step) => [step.key, { status: "saved", fields: {} }])) as TunnelState["steps"],
      createdAt: "2026-11-17T00:00:00.000Z",
      updatedAt: "2026-11-17T00:00:00.000Z",
    };

    await expect(saveRemote(state, {} as any)).resolves.toBe("existing-draft-run");
    expect(db.inserts).toHaveLength(0);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).toMatchObject({ id: "existing-draft-run" });
    expect(db.updates[0].row).toMatchObject({ business_id: BIZ, is_draft: false, setup_status: "complete" });
  });
});
