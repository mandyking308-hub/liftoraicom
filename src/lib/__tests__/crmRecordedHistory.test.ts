import { describe, expect, it } from "vitest";
import { readRecordedPages, recordedCampaignName } from "../crmRecordedHistory";

describe("recorded CRM history", () => {
  it("keeps all recorded rows beyond the first page", async () => {
    const rows = Array.from({ length: 205 }, (_, id) => ({ id }));
    const result = await readRecordedPages((from, to) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }));
    expect(result).toEqual(rows);
    expect(result[204].id).toBe(204);
  });
  it("reports lookup failure instead of presenting missing records as empty history", async () => {
    await expect(readRecordedPages(() => Promise.resolve({ data: null, error: { message: "History unavailable" } }))).rejects.toThrow("History unavailable");
  });
  it("uses the recorded campaign from the same business, not another business with the same campaign ID", () => {
    expect(recordedCampaignName({ business_id: "kindnesss", provider_campaign_id: "4664652" }, [
      { business_id: "other", provider_campaign_id: "4664652", campaign_name: "Other business" },
      { business_id: "kindnesss", provider_campaign_id: "4664652", campaign_name: "Kindnesss education" },
    ])).toBe("Kindnesss education");
    expect(recordedCampaignName({ business_id: "kindnesss", provider_campaign_id: "4664652" }, [
      { business_id: "other", provider_campaign_id: "4664652", campaign_name: "Other business" },
    ])).toBe("Campaign 4664652");
  });
});