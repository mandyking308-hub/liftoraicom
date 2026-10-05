import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260928130000_worker3_tenant_provider_connections.sql",
  "utf8",
);
const crmAttributionMigration = readFileSync(
  "supabase/migrations/20260928140000_worker3_crm_bcr_campaign_scope.sql",
  "utf8",
);
const generatedTypes = readFileSync("src/integrations/supabase/types.ts", "utf8");

describe("Worker 3 tenant provider schema", () => {
  it("keeps every outbound event field aligned in the additive migration and generated types", () => {
    const eventFields = [
      "event_occurred_at",
      "idempotency_key",
      "lead_mapping_id",
      "liftor_campaign_id",
      "processed_at",
      "provider_mailbox_id",
    ];

    for (const field of eventFields) {
      expect(migration).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${field}\\b`));
      expect(generatedTypes).toMatch(new RegExp(`\\b${field}: (string \\| null)`));
    }
  });

  it("scopes event idempotency and connections by business, without migrating legacy rows", () => {
    expect(migration).toContain("UNIQUE (id, business_id, provider_type)");
    expect(migration).toContain("outbound_provider_events_connection_idempotency_key");
    expect(migration).toContain("ON public.outbound_provider_events (provider_connection_id, idempotency_key)");
    expect(migration).toContain("FOREIGN KEY (provider_connection_id, business_id, provider_type)");
    expect(migration).toContain("outbound_provider_connections_credential_ref_is_namespaced");
    expect(migration).toContain("outbound_provider_connections_webhook_ref_is_namespaced");
    expect(migration).toContain("DEFAULT false");
    expect(migration).toMatch(/NOT VALID/);
    expect(migration).not.toMatch(/\b(DROP TABLE|DROP COLUMN|TRUNCATE)\b/i);
  });

  it("adds a provider-connection-scoped mailbox mapping with an optional business-matched inbox", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.outbound_provider_mailbox_mappings");
    expect(migration).toContain("UNIQUE (provider_connection_id, provider_mailbox_id)");
    expect(migration).toContain("FOREIGN KEY (inbox_id, business_id)");
    expect(generatedTypes).toContain("outbound_provider_mailbox_mappings: {");
  });

  it("binds canonical outreach campaigns to businesses without rewriting legacy rows", () => {
    expect(crmAttributionMigration).toContain("ADD COLUMN IF NOT EXISTS business_id UUID");
    expect(crmAttributionMigration).toContain("outreach_campaigns_business_id_fkey");
    expect(crmAttributionMigration).toContain("campaign.business_name = business.name");
    expect(crmAttributionMigration).toContain("FOREIGN KEY (liftor_campaign_id, business_id)");
    expect(crmAttributionMigration).toContain("REFERENCES public.outreach_campaigns(id, business_id) NOT VALID");
    expect(generatedTypes).toMatch(/outreach_campaigns: \{[\s\S]*?business_id: string \| null/);
    // Postgres truncates identifiers to 63 bytes; live-generated types carry the truncated FK name.
    expect(generatedTypes).toContain("outbound_provider_campaign_mappings_liftor_campaign_business_scope_fkey".slice(0, 63));
    expect(crmAttributionMigration).not.toMatch(/\b(DROP TABLE|DROP COLUMN|TRUNCATE)\b/i);
  });
});
