import { describe, expect, it } from "vitest";
import { expectedProviderSecretRef } from "../../../supabase/functions/_shared/providerConnectionResolver";

describe("provider secret reference naming", () => {
  it("uses uppercase hex so the DB check and the runtime resolver agree for real UUIDs", () => {
    expect(expectedProviderSecretRef("4f9c2a1e-0b3d-4e5f-8a7b-c6d5e4f3a2b1", "smartlead", "WEBHOOK_SECRET"))
      .toBe("LIFTOR_OUTREACH_SMARTLEAD_4F9C2A1E0B3D4E5F8A7BC6D5E4F3A2B1_WEBHOOK_SECRET");
  });
});
