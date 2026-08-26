import { describe, expect, it } from "vitest";
import {
  manifestHash,
  parseManifest,
  runFidelityCheck,
} from "../../../supabase/functions/_shared/sourceManifest";

describe("source manifest", () => {
  it("parses markdown headings into canonical fields", () => {
    const p = parseManifest(`# Neon Candy\n## Purpose\nAI music label\n## ICP\nBrands and artists\n`);
    expect(p.format).toBe("markdown");
    expect(p.sections.purpose).toContain("AI music label");
    expect(p.sections.icp).toContain("Brands");
    expect(p.missing_fields).toContain("pricing");
  });

  it("parses json manifests", () => {
    const p = parseManifest(JSON.stringify({ purpose: "AI music label", offers: ["licensing", "collabs"] }));
    expect(p.format).toBe("json");
    expect(p.sections.offers).toContain("licensing");
  });

  it("hash is stable and whitespace-insensitive", () => {
    expect(manifestHash("a  b")).toBe(manifestHash("a b"));
    expect(manifestHash("a b")).not.toBe(manifestHash("a c"));
  });

  it("flags a critical contradiction as FIDELITY_FAIL", () => {
    const r = runFidelityCheck(
      { purpose: "International education operations, student recruitment services" },
      { purpose: "Logistics and trades contractor dispatch haulage operations" },
    );
    expect(r.verdict).toBe("FIDELITY_FAIL");
    expect(r.blocks_activation).toBe(true);
    expect(r.mismatches[0].field).toBe("purpose");
  });

  it("reports missing source data instead of inventing it", () => {
    const r = runFidelityCheck({}, { purpose: "something derived" });
    expect(r.missing_in_source).toContain("pricing");
    expect(r.blocks_activation).toBe(false);
  });

  it("passes when source and derived agree", () => {
    const txt = "international education operations student recruitment universities";
    const r = runFidelityCheck({ purpose: txt }, { purpose: txt });
    expect(r.verdict).toBe("FIDELITY_PASS");
  });
});
