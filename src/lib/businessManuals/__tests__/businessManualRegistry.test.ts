import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BUSINESS_MANUALS, manualsForBusiness } from "../registry";
import { EDUCATION_BUSINESSES } from "../../education/educationBusinesses";

const KINDS = ["technical-manual", "user-guide", "customer-facing-manual"] as const;

describe("business manual registry — exactly 12 canonical manuals", () => {
  it("holds exactly 12 entries", () => {
    expect(BUSINESS_MANUALS).toHaveLength(12);
  });

  it("covers the four education businesses with three manuals each", () => {
    expect(EDUCATION_BUSINESSES).toHaveLength(4);
    for (const business of EDUCATION_BUSINESSES) {
      const manuals = manualsForBusiness(business.slug);
      expect(manuals).toHaveLength(3);
      expect(manuals.map((m) => m.kind).sort()).toEqual([...KINDS].sort());
    }
  });

  it("has unique business+kind pairs and unique GitHub paths", () => {
    const pairs = new Set(BUSINESS_MANUALS.map((m) => `${m.business_slug}:${m.kind}`));
    const paths = new Set(BUSINESS_MANUALS.map((m) => m.github_path));
    expect(pairs.size).toBe(12);
    expect(paths.size).toBe(12);
  });
});

describe("business manual registry — canonical raw-source parity with GitHub", () => {
  it("renders the exact markdown file content for every manual", () => {
    for (const manual of BUSINESS_MANUALS) {
      const abs = path.resolve(process.cwd(), manual.github_path);
      expect(fs.existsSync(abs), `missing markdown source: ${manual.github_path}`).toBe(true);
      const onDisk = fs.readFileSync(abs, "utf8");
      expect(manual.content, `drift in ${manual.github_path}`).toBe(onDisk);
      expect(manual.content.trim().length).toBeGreaterThan(200);
    }
  });

  it("keeps the docs folder free of extra business manual files", () => {
    const root = path.resolve(process.cwd(), "docs/business-manuals");
    const files = fs
      .readdirSync(root)
      .flatMap((dir) =>
        fs.readdirSync(path.join(root, dir)).map((f) => `docs/business-manuals/${dir}/${f}`),
      )
      .filter((f) => f.endsWith(".md"));
    expect(files.sort()).toEqual(BUSINESS_MANUALS.map((m) => m.github_path).sort());
  });
});
