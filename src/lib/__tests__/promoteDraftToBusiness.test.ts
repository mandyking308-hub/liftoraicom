import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ result: { data: null as any, error: null as any }, inserted: [] as any[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (row: any) => {
        mocks.inserted.push(row);
        return { select: () => ({ single: async () => mocks.result }) };
      },
    }),
  },
}));

import { promoteDraftToBusiness } from "../businessSetupTunnel";

const draft = (name: string) => ({ businessId: "draft:kindnesss", businessName: name, isDraft: true } as any);

describe("promoteDraftToBusiness", () => {
  beforeEach(() => { mocks.inserted = []; });

  it("creates an active business even when an archived legacy row has the same name", async () => {
    mocks.result = { data: { id: "new-id" }, error: null };
    await expect(promoteDraftToBusiness(draft("Kindnesss"))).resolves.toBe("new-id");
    expect(mocks.inserted[0]).toEqual({ name: "Kindnesss", portfolio_status: "active" });
  });

  it("surfaces active-only uniqueness conflicts as a meaningful error", async () => {
    mocks.result = { data: null, error: { code: "23505", message: "duplicate key" } };
    await expect(promoteDraftToBusiness(draft("Kindnesss"))).rejects.toThrow(/active business named "Kindnesss" already exists/);
  });

  it("surfaces other errors instead of returning null", async () => {
    mocks.result = { data: null, error: { code: "42501", message: "permission denied" } };
    await expect(promoteDraftToBusiness(draft("Kindnesss"))).rejects.toThrow(/permission denied/);
  });

  it("rejects blank names before inserting", async () => {
    await expect(promoteDraftToBusiness(draft("  "))).rejects.toThrow(/name is required/);
    expect(mocks.inserted).toHaveLength(0);
  });
});
