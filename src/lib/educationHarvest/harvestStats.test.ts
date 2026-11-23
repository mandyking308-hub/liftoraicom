import { describe, it, expect } from "vitest";
import { harvestProgress, type HarvestRun } from "./harvestStats";
const run = (k: string, slot: "AM" | "PM", screened: number, claimed = 500): HarvestRun => ({ run_key: k, slot, status: "completed", claimed_count: claimed, screened_count: screened, buyer_researched_count: 0, held_count: 0, error_count: 0, claim_calls: 2, finished_at: "x", started_at: "x" });
describe("education harvest progress", () => {
  it("counts only completed unique schools, never claims", () => {
    const p = harvestProgress(27158, { claimed: 500, queued: 40, held: 3, error: 2 }, []);
    expect(p.screened).toBe(0);
    expect(p.remaining).toBe(27158);
    expect(p.estimatedDaysLeft).toBeNull();
  });
  it("screened plus buyer-researched is progress; timeline from screened per run", () => {
    const p = harvestProgress(27158, { institution_screened: 300, buyer_researched: 100 }, [run("2026-11-24-PM", "PM", 200), run("2026-11-24-AM", "AM", 200)]);
    expect(p.screened).toBe(400);
    expect(p.remaining).toBe(26758);
    expect(p.estimatedDaysLeft).toBe(Math.ceil(Math.ceil(26758 / 200) / 2));
    expect(p.repeatClaimCalls).toBe(2);
  });
});
