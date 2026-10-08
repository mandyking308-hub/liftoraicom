import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCanonicalActiveBusiness } from "../../../supabase/functions/_shared/canonicalBusinessResolver";

const legacy = { id: "993b9b12-ada2-42e0-97c7-0eda1f591889", name: "Kindnesss", portfolio_status: "legacy_prelaunch" };
const active = { id: "640de582-a112-4d16-a221-03c27f00c6ec", name: "Kindnesss", portfolio_status: "active" };

describe("canonical business resolution for outbound eligibility", () => {
  it("picks only the active row when an archived row shares the name", () => {
    expect(resolveCanonicalActiveBusiness([legacy, active], "Kindnesss")).toEqual({ ok: true, id: active.id });
    expect(resolveCanonicalActiveBusiness([legacy, active], " kindnesss ")).toEqual({ ok: true, id: active.id });
  });
  it("never resolves to an archived-only business", () => {
    expect(resolveCanonicalActiveBusiness([legacy], "Kindnesss")).toEqual({ ok: false, reason: "business_not_found" });
  });
  it("fails closed on duplicate active rows", () => {
    expect(resolveCanonicalActiveBusiness([active, { ...active, id: "x" }], "Kindnesss"))
      .toEqual({ ok: false, reason: "ambiguous_active_business" });
  });
  it("eligibility function no longer looks businesses up by bare name", () => {
    const src = readFileSync("supabase/functions/education-outreach-eligibility/index.ts", "utf8");
    expect(src).not.toMatch(/from\("businesses"\)\.select\("id"\)\.eq\("name"/);
    expect(src).toContain('.eq("portfolio_status", "active")');
    expect(src).toContain("resolveCanonicalActiveBusiness");
  });
});
