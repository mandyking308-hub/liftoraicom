import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildCandidate, dedupeRows, normalizeListingUrl, classifySellerFinance, parseBulk, economics, isDueDiligenceReady } from "../retirementAcquisition";
import { founderAreas } from "@/lib/founderAreas";

const SRC = ["businessesforsale", "rightbiz"];
const base = { source_key: "businessesforsale", source_url: "https://uk.businessesforsale.com/uk/x-123.aspx?utm_source=a", title: "B2B IT support firm, owner retiring" };

describe("retirement acquisition rules", () => {
  it("normalizes URLs so the same listing dedupes", () => {
    expect(normalizeListingUrl("https://WWW.rightbiz.co.uk/a/?utm_source=x#top")).toBe(normalizeListingUrl("http://rightbiz.co.uk/a"));
    expect(normalizeListingUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeListingUrl("not a url")).toBeNull();
  });
  it("rejects malformed URL, missing source and private details", () => {
    expect(buildCandidate({ ...base, source_url: "ftp://x" }, SRC).ok).toBe(false);
    expect(buildCandidate({ ...base, source_key: "" }, SRC).ok).toBe(false);
    const r = buildCandidate({ ...base, listing_text: "call owner on 07700 900123 or bob@x.com" }, SRC);
    expect(r.ok).toBe(false);
  });
  it("unknown profit stays null, is flagged and penalised — never zero", () => {
    const r = buildCandidate({ ...base, asking_price: 300000 }, SRC);
    if (!r.ok) throw new Error();
    expect(r.row.profit).toBeNull();
    expect(r.row.red_flags).toContain("Profit unknown");
    expect(economics(r.row).multiple).toBeNull();
    const withProfit = buildCandidate({ ...base, asking_price: 300000, profit: 100000 }, SRC);
    if (!withProfit.ok) throw new Error();
    expect(withProfit.row.score).toBeGreaterThan(r.row.score);
  });
  it("CSV 'unknown' money parses to null", () => {
    const rows = parseBulk("source_key,source_url,title,profit\nrightbiz,https://rightbiz.co.uk/l/1,Shop retiring,unknown");
    expect(rows[0].profit).toBeNull();
  });
  it("third-party loan is not seller finance; explicit needs quoted proof", () => {
    expect(classifySellerFinance("Bank finance available to approved buyers").status).toBe("unknown");
    expect(classifySellerFinance("Vendor finance considered").status).toBe("possible");
    expect(classifySellerFinance("x", "Vendor finance available on 40% of price").status).toBe("explicit");
    const r = buildCandidate({ ...base, listing_text: "Funding available through our lender partner" }, SRC);
    if (!r.ok) throw new Error();
    expect(r.row.seller_finance_status).toBe("unknown");
    expect(r.row.third_party_finance_note).not.toBeNull();
  });
  it("retirement is not treated as distressed and fields are unverified unless checked", () => {
    const r = buildCandidate({ ...base, sale_reason: "Owner retiring", profit: 1 }, SRC);
    if (!r.ok) throw new Error();
    expect(r.row.retirement_confidence).toBe("explicit");
    expect(r.row.evidence_quality).toBe("unverified");
    expect(r.row.unverified_fields).toContain("profit");
    expect(JSON.stringify(r.row)).not.toMatch(/distress/i);
  });
  it("interesting is separate from due-diligence ready", () => {
    const r = buildCandidate({ ...base, sale_reason: "Retirement", asking_price: 200000, profit: 90000, turnover: 400000, years_trading: 12, evidence_url: base.source_url, verified_fields: ["asking_price", "profit", "turnover", "sale_reason", "years_trading"] }, SRC);
    if (!r.ok) throw new Error();
    expect(isDueDiligenceReady(r.row)).toBe(true);
    const r2 = buildCandidate({ ...base, sale_reason: "Retirement", asking_price: 200000, profit: 90000, turnover: 400000 }, SRC);
    if (!r2.ok) throw new Error();
    expect(isDueDiligenceReady(r2.row)).toBe(false);
  });
  it("franchises and empty premises are excluded by default", () => {
    const r = buildCandidate({ ...base, is_franchise: true }, SRC);
    if (!r.ok) throw new Error();
    expect(r.row.red_flags.join()).toMatch(/Franchise/);
  });
  it("duplicate links in one batch collapse to one", () => {
    const a = buildCandidate(base, SRC), b = buildCandidate({ ...base, source_url: "https://uk.businessesforsale.com/uk/x-123.aspx/" }, SRC);
    if (!a.ok || !b.ok) throw new Error();
    expect(dedupeRows([a.row, b.row]).rows).toHaveLength(1);
  });
  it("page is linked in Radars and from Portfolio & exit", () => {
    const radars = founderAreas.find((a) => a.key === "radars")!;
    expect(radars.sections.some((s) => s.route === "/founder/retirement-succession" && !s.legacy)).toBe(true);
    expect(readFileSync("src/pages/founder/PortfolioExitCommandCentre.tsx", "utf8")).toContain("/founder/retirement-succession");
  });
  it("no provider calls, outreach or edge invocations in the feature code", () => {
    const code = readFileSync("src/pages/founder/RetirementSuccession.tsx", "utf8") + readFileSync("src/lib/retirement/retirementAcquisition.ts", "utf8");
    expect(code).not.toMatch(/fetch\(|functions\.invoke|smartlead|apollo|sendEmail|mailto:/i);
  });
  it("migration is founder/admin-only, never anon, with seller-finance proof constraint", () => {
    const sql = readFileSync("drizzle/migrations/0034_retirement_succession_discovery.sql", "utf8");
    expect(sql).toMatch(/_is_founder_or_admin\(\)/);
    expect(sql).not.toMatch(/TO anon/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.retirement_candidates_upsert\(jsonb, text\) FROM PUBLIC, anon/);
    expect(sql).toMatch(/seller_finance_needs_proof/);
  });
});
