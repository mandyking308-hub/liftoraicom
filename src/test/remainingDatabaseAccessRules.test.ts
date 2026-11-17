import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  "drizzle/migrations/0026_tighten_remaining_public_and_authenticated_policies.sql",
  "utf8",
);

describe("remaining database access rules", () => {
  it("keeps public proposal enquiries in the new-inquiry state with no internal links", () => {
    expect(sql).toContain('CREATE POLICY "Anyone can submit a proposal"');
    expect(sql).toContain("status = 'submitted'");
    expect(sql).toContain("lead_status = 'new_inquiry'");
    expect(sql).toContain("crm_reconciliation_status = 'pending'");
    expect(sql).toContain("contact_id IS NULL");
    expect(sql).toContain("business_id IS NULL");
  });

  it("keeps partner applications pending and prevents user identity injection", () => {
    expect(sql).toContain('CREATE POLICY "Anyone can submit partner application"');
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("user_id IS NULL");
    expect(sql).toContain("'enterprise_advisor'");
  });

  it("limits anonymous legal-version reads to published versions", () => {
    expect(sql).toContain('CREATE POLICY "Anyone can read legal versions"');
    expect(sql).toContain("published_at <= now()");
  });

  it.each(["activity_log", "global_audit_events"])(
    "requires founder/admin for direct %s writes",
    (table) => {
      expect(sql).toContain(`ON public.${table}`);
      expect(sql).toContain("WITH CHECK (public._is_founder_or_admin())");
    },
  );

  it.each(["ecommerce_products", "scheduling_resources"])(
    "requires founder/admin to read %s",
    (table) => {
      expect(sql).toContain(`ON public.${table}`);
      expect(sql).toContain("USING (public._is_founder_or_admin())");
    },
  );

  it("does not leave a tautological policy on the seven corrected tables", () => {
    const correctedTables = [
      "proposals",
      "partner_applications",
      "legal_document_versions",
      "activity_log",
      "global_audit_events",
      "ecommerce_products",
      "scheduling_resources",
    ];
    for (const table of correctedTables) {
      const statements = sql.split(";").filter((statement) => statement.includes(`ON public.${table}`));
      expect(statements.join(";")).not.toMatch(/(?:WITH CHECK|USING)\s*\(true\)/i);
    }
  });
});
