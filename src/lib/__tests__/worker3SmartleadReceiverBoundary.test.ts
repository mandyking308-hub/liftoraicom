import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const receiver = readFileSync("supabase/functions/smartlead-webhook/index.ts", "utf8");
const mappingPreview = readFileSync("supabase/functions/smartlead-campaign-mapping-preview/index.ts", "utf8");
const mappingApply = readFileSync("supabase/functions/smartlead-campaign-mapping-apply/index.ts", "utf8");
const campaignDiscovery = readFileSync("supabase/functions/smartlead-campaign-discovery/index.ts", "utf8");
const mappingUi = readFileSync("src/components/founder/integrations/SmartleadCampaignMappingPreview.tsx", "utf8");

describe("Worker 3 Smartlead receiver boundary", () => {
  it("requires the feature gate and signs the raw request bytes before parsing JSON", () => {
    expect(receiver).toContain("smartleadWebhookReceiverEnabled(Deno.env.get(\"SMARTLEAD_WEBHOOK_RECEIVER_ENABLED\"))");
    expect(receiver).toContain("new Uint8Array(await req.arrayBuffer())");
    expect(receiver).toContain("verifySmartleadWebhookSignature(rawBody, signature, secret)");
    expect(receiver.indexOf("verifySmartleadWebhookSignature(rawBody, signature, secret)")).toBeLessThan(
      receiver.indexOf("JSON.parse(new TextDecoder().decode(rawBody))"),
    );
  });

  it("uses connection-owned secrets and request-scoped idempotency without a global fallback", () => {
    expect(receiver).toContain("resolveProviderConnectionSecret(connection, \"WEBHOOK_SECRET\"");
    expect(receiver).toContain(".eq(\"provider_connection_id\", connection.id)");
    expect(receiver).toContain(".eq(\"idempotency_key\", idempotencyKey)");
    expect(receiver).not.toContain("SMARTLEAD_WEBHOOK_SECRET");
    expect(receiver).not.toContain("x-webhook-secret");
    expect(receiver).not.toContain(".from(\"outbound_providers\")");
  });

  it("scopes campaign, lead, BCR, canonical contact, and event updates to the owning chain", () => {
    expect(receiver).toContain(".eq(\"business_id\", connection.business_id)");
    expect(receiver).toContain(".eq(\"provider_connection_id\", connection.id)");
    expect(receiver).toContain(".eq(\"campaign_mapping_id\", campaignMappings[0].id)");
    expect(receiver).toContain(".from(\"outreach_campaigns\")");
    expect(receiver).toContain(".eq(\"business_id\", connection.business_id)");
    expect(receiver).toContain("canonical_campaign_business_mismatch");
    expect(receiver).toContain(".eq(\"id\", attributionResult.contactId)");
    expect(receiver).toContain(".eq(\"id\", attribution.businessContactRelationship.id)");
    expect(receiver).toContain(".eq(\"contact_id\", attribution.contactId)");
    expect(receiver).not.toMatch(/\.ilike\(\s*["']email["']/);
  });

  it("does not send, push leads, or call provider APIs", () => {
    expect(receiver).not.toMatch(/fetch\s*\(/);
    expect(receiver).not.toMatch(/\.from\(["']email_queue["']\)/);
  });

  it("keeps campaign preview, discovery, and mapping apply on explicit business connections", () => {
    for (const source of [mappingPreview, mappingApply, campaignDiscovery]) {
      expect(source).toContain("provider_connection_id");
      expect(source).toContain("resolveProviderConnectionSecret");
      expect(source).not.toContain("Deno.env.get(\"SMARTLEAD_API_KEY\")");
    }
    expect(mappingPreview).toContain(".eq(\"business_id\", connection.business_id)");
    expect(mappingApply).toContain(".eq(\"provider_connection_id\", connectionResult.connection.id)");
    expect(campaignDiscovery).toContain(".eq(\"provider_connection_id\", connection.id)");
    expect(mappingUi).toContain("provider_connection_id: providerConnectionId");
    expect(mappingUi).toContain("Business-owned Smartlead connection");
  });
});
