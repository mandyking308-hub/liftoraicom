import { describe, expect, it } from "vitest";
import {
  expectedProviderSecretRef,
  resolveProviderConnectionSecret,
  resolveScopedProviderConnection,
  type ScopedProviderConnection,
} from "../../../supabase/functions/_shared/providerConnectionResolver";

const businessAConnection: ScopedProviderConnection = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  business_id: "business-a",
  provider_type: "smartlead",
  connection_status: "verified",
  is_enabled: true,
  inbound_receiver_enabled: false,
  mutations_enabled: false,
  credential_secret_ref: "LIFTOR_OUTREACH_SMARTLEAD_AAAAAAAAAAAA4AAA8AAAAAAAAAAAAAAA_CREDENTIAL",
  webhook_secret_ref: "LIFTOR_OUTREACH_SMARTLEAD_AAAAAAAAAAAA4AAA8AAAAAAAAAAAAAAA_WEBHOOK_SECRET",
};

describe("Worker 3 tenant and provider connection isolation", () => {
  it("resolves only the requested business, provider, and explicit connection", () => {
    const businessBConnection = { ...businessAConnection, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", business_id: "business-b" };
    expect(resolveScopedProviderConnection([businessAConnection, businessBConnection], "business-a", businessAConnection.id, "smartlead"))
      .toEqual({ ok: true, connection: businessAConnection });
    expect(resolveScopedProviderConnection([businessAConnection, businessBConnection], "business-a", businessBConnection.id, "smartlead"))
      .toEqual({ ok: false, reason: "provider_connection_not_found" });
    expect(resolveScopedProviderConnection([businessAConnection], "business-a", null, "smartlead"))
      .toEqual({ ok: false, reason: "provider_connection_id_required" });
    expect(resolveScopedProviderConnection([businessAConnection], "business-a", businessAConnection.id, "apollo"))
      .toEqual({ ok: false, reason: "provider_connection_not_found" });
  });

  it("accepts only connection-namespaced server secret references", () => {
    const expected = expectedProviderSecretRef(businessAConnection.id, "smartlead", "WEBHOOK_SECRET");
    expect(expected).toBe(businessAConnection.webhook_secret_ref);
    expect(resolveProviderConnectionSecret(businessAConnection, "WEBHOOK_SECRET", (name) =>
      name === expected ? "  scoped-secret  " : null,
    )).toBe("scoped-secret");

    expect(resolveProviderConnectionSecret(
      { ...businessAConnection, webhook_secret_ref: "SMARTLEAD_WEBHOOK_SECRET" },
      "WEBHOOK_SECRET",
      () => "global-secret-must-not-be-used",
    )).toBeNull();
    expect(resolveProviderConnectionSecret(
      { ...businessAConnection, credential_secret_ref: "LIFTOR_OUTREACH_SMARTLEAD_BBBBBBBBBBBB4BBB8BBBBBBBBBBBBBBB_CREDENTIAL" },
      "CREDENTIAL",
      () => "another-connection-secret",
    )).toBeNull();
  });
});

