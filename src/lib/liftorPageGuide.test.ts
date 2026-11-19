import { describe, it, expect } from "vitest";
import { founderAreas } from "./founderAreas";
import { AREA_GUIDES, buildPageGuideMarkdown } from "./liftorPageGuide";

describe("Liftor page guide", () => {
  it("has a user guide for every HQ section", () => {
    founderAreas.forEach((a) => expect(AREA_GUIDES[a.key], a.key).toBeDefined());
  });
  it("lists every registered page", () => {
    const md = buildPageGuideMarkdown();
    founderAreas.flatMap((a) => a.sections).forEach((s) => expect(md).toContain(`(${s.route})`));
  });
});
