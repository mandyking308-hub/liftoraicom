import { describe, it, expect } from "vitest";
import { buildGiasSearchArgs, inferSnapshotDateFromFilename, safeWebsite } from "@/lib/gias/giasSearch";

describe("GIAS search args", () => {
  it("bounds page size and page number (no bulk reads)", () => {
    expect(buildGiasSearchArgs({ pageSize: 100000, page: -3 })).toMatchObject({ _page_size: 100, _page: 1 });
    expect(buildGiasSearchArgs({ pageSize: 0 })._page_size).toBe(1);
  });
  it("turns blank filters into null and trims text", () => {
    expect(buildGiasSearchArgs({ q: "  Croydon ", status: " ", phase: "Primary" })).toMatchObject({ _q: "Croydon", _status: null, _phase: "Primary" });
  });
  it("rejects over-long search text", () => {
    expect(() => buildGiasSearchArgs({ q: "x".repeat(101) })).toThrow();
  });
});

describe("GIAS validation helpers", () => {
  it("only allows http(s) websites", () => {
    expect(safeWebsite("https://school.example")).toBe("https://school.example");
    expect(safeWebsite("javascript:alert(1)")).toBeNull();
    expect(safeWebsite("www.school.example")).toBeNull();
  });
  it("infers snapshot date from filename only when valid", () => {
    expect(inferSnapshotDateFromFilename("edubasealldata20261016.csv")).toBe("2026-10-16");
    expect(inferSnapshotDateFromFilename("gias_2026-10-16_clean.csv")).toBe("2026-10-16");
    expect(inferSnapshotDateFromFilename("gias_20261340.csv")).toBeNull();
    expect(inferSnapshotDateFromFilename("gias.csv")).toBeNull();
  });
});

import { buildGiasGroupQuery, sanitiseFilterText, GIAS_GROUPS } from "@/lib/gias/giasSearch";
import { navGroups } from "@/components/founder/FounderLayout";

describe("GIAS group filter", () => {
  it("accepts Independent schools with bounded range", () => {
    const g = buildGiasGroupQuery({ group: "Independent schools", status: "Open", page: 3, pageSize: 25 });
    expect(g).toMatchObject({ group: "Independent schools", _status: "Open", from: 50, to: 74 });
    expect(GIAS_GROUPS).toContain("Independent schools");
  });
  it("rejects unknown groups and caps page size", () => {
    expect(() => buildGiasGroupQuery({ group: "Anything" })).toThrow();
    expect(buildGiasGroupQuery({ group: "Academies", pageSize: 9999 }).to).toBe(99);
  });
  it("sanitises filter-breaking characters", () => {
    expect(sanitiseFilterText("a,b(c)%*:d")).toBe("a b c d");
  });
});

describe("Founder navigation", () => {
  it("links School Register (GIAS) once to /founder/gias-search", () => {
    const items = navGroups.flatMap((g) => g.items).filter((i) => i.to === "/founder/gias-search");
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("School Register (GIAS)");
  });
});
