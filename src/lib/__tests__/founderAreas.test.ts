import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { founderAreas } from "@/lib/founderAreas";

const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
const topLevel = new Set(
  [...app.matchAll(/path="\/founder(\/[a-z0-9-]+)?/g)].map((m) => m[1] ?? "/"),
);
const IGNORE = new Set(["/", "/login", "/area"]) // "/" is Liftor HQ itself;
const all = founderAreas.flatMap((a) => a.sections);

describe("founder area registry", () => {
  it("has 15 areas", () => expect(founderAreas).toHaveLength(15));
  it("puts every founder section in exactly one area, so nothing is lost", () => {
    const missing = [...topLevel].filter((t) => !IGNORE.has(t) && !all.some((s) => s.route === (t === "/" ? "/founder" : `/founder${t}`)));
    expect(missing).toEqual([]);
  });
  it("lists no route twice", () => {
    const routes = all.map((s) => s.route);
    expect(routes.length).toBe(new Set(routes).size);
  });
});

import { areaStatus, type Metric } from "@/lib/hqMetrics";
describe("HQ box status", () => {
  const m: Metric[] = [{ label: "a", spec: { table: "x" }, attentionIfAbove: 0 }, { label: "b", spec: { table: "y" } }];
  it("needs attention when a watched number is above zero", () => expect(areaStatus(m, [1, 0])).toBe("attention"));
  it("shows activity when only other numbers are above zero", () => expect(areaStatus(m, [0, 5])).toBe("working"));
  it("shows nothing yet when everything is zero or unreadable", () => expect(areaStatus(m, [null, 0])).toBe("idle"));
});
