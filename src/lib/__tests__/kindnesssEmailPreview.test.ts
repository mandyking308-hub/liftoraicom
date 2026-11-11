import { describe, it, expect } from "vitest";
import { renderStepPreview, footerQa } from "@/lib/kindnesss/emailPreview";

const footer = '<table><tr><td>A product of Global Solutions Management LLC. To opt out: %unsubscribe-text%</td></tr></table>';
const body = `Dear {{first_name}},\n\nSee https://joinkindnesss.com\n\nKind regards,\n\n${footer}`;

describe("Kindnesss email preview", () => {
  it("uses 'there' when first name is missing", () => {
    expect(renderStepPreview(body)).toContain("Dear there,");
  });
  it("renders exactly one unsubscribe link and no raw tags", () => {
    const html = renderStepPreview(body, { firstName: "Sam" });
    expect(html.match(/Unsubscribe from Kindnesss emails/g)?.length).toBe(1);
    expect(html).not.toContain("%unsubscribe-text%");
    expect(html).not.toContain("{{first_name}}");
  });
  it("flags duplicate signatures/unsubscribe tags", () => {
    const qa = footerQa(body + "\n%signature%\n%unsubscribe-text%");
    expect(qa.unsubscribeTags).toBe(2);
    expect(qa.signaturePlaceholders).toBe(1);
  });
  it("passes a single-footer body", () => {
    const qa = footerQa(body);
    expect([qa.signoffs, qa.unsubscribeTags, qa.signaturePlaceholders, qa.hasCompanyAttribution]).toEqual([1, 1, 0, true]);
  });
});

import v2 from "./fixtures/kindnesssFooterV2.html?raw";
const above = "Dear {{first_name}},\n\nApproved paragraph.\n\nKind regards,\n\n";
describe("Kindnesss footer v2 (logo + disclaimers)", () => {
  const qa = footerQa(above + v2);
  it("has one sign-off, one unsubscribe tag, zero %signature%", () => {
    expect([qa.signoffs, qa.unsubscribeTags, qa.signaturePlaceholders]).toEqual([1, 1, 0]);
  });
  it("has the real PNG logo with alt text and all four disclaimers", () => {
    expect(qa.hasLogo).toBe(true);
    expect(qa.disclaimers).toBe(4);
  });
  it("contains no school-hours, police or blanket-liability text", () => {
    expect(qa.forbiddenSchoolText).toBe(false);
  });
  it("links privacy, legal, privacy-request and site", () => {
    for (const l of ["https://joinkindnesss.com/privacy", "https://joinkindnesss.com/legal", "https://joinkindnesss.com/privacy-request", "https://joinkindnesss.com"]) expect(qa.links).toContain(l);
  });
  it("detects a school-style police disclaimer", () => {
    expect(footerQa(v2 + " contact the police on 999").forbiddenSchoolText).toBe(true);
  });
});
