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
