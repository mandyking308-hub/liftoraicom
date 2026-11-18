import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rows: {} as Record<string, any[]>,
  failTable: null as string | null,
  inserts: 0,
  updates: 0,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const filters: [string, any][] = [];
      const q: any = {
        select: () => q,
        eq: (k: string, v: any) => { filters.push([k, v]); return q; },
        not: (k: string, _op: string, v: string) => { const bad = v.replace(/[()]/g, "").split(","); filters.push([k, { notIn: bad }]); return q; },
        order: () => q,
        limit: async () => ({
          data: (db.rows[table] ?? []).filter((r) => filters.every(([k, v]) => (v && v.notIn ? !v.notIn.includes(r[k]) : r[k] === v))),
          error: db.failTable === table ? { message: `column "x" of relation "${table}" does not exist` } : null,
        }),
        insert: (row: any) => ({
          select: () => ({
            single: async () => {
              if (db.failTable === table) return { data: null, error: { message: `column "x" of relation "${table}" does not exist` } };
              db.inserts += 1;
              const rec = { id: `${table}-${db.inserts}`, ...row };
              (db.rows[table] ??= []).push(rec);
              return { data: { id: rec.id }, error: null };
            },
          }),
        }),
        update: (patch: any) => ({
          eq: async (column: string, value: any) => {
            if (db.failTable === table) return { error: { message: `column "x" of relation "${table}" does not exist` } };
            const row = (db.rows[table] ?? []).find((r) => r[column] === value);
            if (row) Object.assign(row, patch);
            db.updates += 1;
            return { error: null };
          },
        }),
      };
      return q;
    },
  },
}));

import {
  promoteIntoLiftorModules,
  buildPromoteAttempts,
  TUNNEL_STEPS,
  MODULE_AREAS,
  normaliseModuleConnections,
} from "../businessSetupTunnel";
import { founderAreas } from "../founderAreas";

const BIZ = "640de582-a112-4d16-a221-03c27f00c6ec";
const state = () => ({
  businessId: BIZ,
  businessName: "Example Company",
  isDraft: false,
  createdAt: "2026-11-17T00:00:00.000Z",
  steps: Object.fromEntries(TUNNEL_STEPS.map((s) => [s.key, {
    status: "saved",
    fields: {
      ...(s.key === "identity" ? { short_description: "A useful service", business_model: "service", archetype: "consultancy" } : {}),
      ...(s.key === "offer" ? { pricing: "£995", products: "Useful package", onboarding_checklist: "Welcome\nDeliver" } : {}),
      ...(s.key === "market" ? { icp: "Small businesses", segments: "Owners", geography: "UK" } : {}),
      ...(s.key === "knowledge" ? { business_manual: "Original manual", technical_manual: "Technical notes" } : {}),
      ...(s.key === "marketing" ? { brand_voice: "Plain and helpful", channels: "LinkedIn", content_calendar: "A draft social plan" } : {}),
      ...(s.key === "sales" ? { email_drafts: Array.from({ length: 6 }, (_, i) => `Draft email ${i + 1}`).join("\n\n") } : {}),
      ...(s.key === "commercial" ? { target_monthly_revenue: "1000", currency: "GBP" } : {}),
      ...(s.key === "support" ? { onboarding_checklist: "Welcome\nDeliver", welcome_pack: "Welcome" } : {}),
      ...(s.key === "operations" ? { daily_loop: "Review\nDeliver", workforce: "Founder" } : {}),
    },
  }])),
} as any);

describe("one company setup synchronisation", () => {
  beforeEach(() => { db.rows = {}; db.failTable = null; db.inserts = 0; db.updates = 0; });

  it("connects all 14 areas with native records and every new external switch off", async () => {
    const out = await promoteIntoLiftorModules(state());
    expect(MODULE_AREAS).toHaveLength(14);
    for (const area of MODULE_AREAS) expect(out[area.key]?.status).toBe("connected");

    expect(db.rows.business_activation_profiles[0].go_live_allowed).toBe(false);
    expect(db.rows.business_onboarding_factory_runs[0]).toMatchObject({ external_ready: false, internal_ready: true, materialisation_completed: true, fallback_items_count: 0 });
    expect(db.rows.business_runtime_activation[0]).toMatchObject({ activated: false, outbound_allowed: false, queue_allowed: false, ai_orchestration_allowed: false });
    expect(db.rows.outreach_campaign_drafts[0]).toMatchObject({ external_send_blocked: true, is_live: false, smartlead_campaign_id: null });
    expect(db.rows.outreach_campaign_drafts[0].email_sequence).toHaveLength(5);
    expect(db.rows.social_post_drafts[0]).toMatchObject({ publish_allowed: false, scheduled_externally: false });
    expect(db.rows.marketing_campaign_briefs[0].launch_allowed).toBe(false);
    expect(db.rows.customer_onboarding_plans[0]).toMatchObject({ onboarding_type: "business_template", customer_share_allowed: false, external_share_allowed: false });
    expect(db.rows.data_room_profiles[0].data_room_status).toBe("closed");
    expect(db.rows.business_exit_intelligence_profiles[0]).toMatchObject({ for_sale: false, outreach_approved: false, data_room_open: false });
    expect(db.rows.agent_business_live_settings[0].setting_value).toBe(false);
    expect(db.rows.business_operating_profiles[0]).toMatchObject({ smartlead_enabled: false, native_email_enabled: false, apollo_enabled: false, auto_send_allowed: false, external_provider_mutation_allowed: false });
  });

  it("is idempotent and refreshes setup-owned native records instead of leaving stale data", async () => {
    await promoteIntoLiftorModules(state());
    const firstInserts = db.inserts;
    const changed = state();
    changed.steps.knowledge.fields.business_manual = "Updated manual";
    changed.steps.commercial.fields.target_monthly_revenue = "2500";
    const out = await promoteIntoLiftorModules(changed);

    expect(db.inserts).toBe(firstInserts);
    expect(db.updates).toBeGreaterThan(0);
    expect(db.rows.business_knowledge_assets.find((r) => r.asset_type === "setup_business_manual").asset_content).toBe("Updated manual");
    expect(db.rows.business_sales_targets[0].target_monthly_revenue).toBe(2500);
    expect(out.setup_knowledge?.records?.some((r) => r.action === "updated")).toBe(true);
  });

  it("surfaces one section failure while preserving successful sections for safe retry", async () => {
    db.failTable = "cashflow_forecasts";
    const out = await promoteIntoLiftorModules(state());
    expect(out.money?.status).toBe("failed");
    expect(out.money?.note).toMatch(/does not exist/);
    expect(out.sales?.status).toBe("connected");
    expect(db.rows.business_onboarding_factory_runs[0]).toMatchObject({ internal_ready: false, materialisation_completed: false, external_ready: false });
  });

  it("persists manuals as real Brain-readable knowledge and uses a generic customer template", async () => {
    await promoteIntoLiftorModules(state());
    expect(db.rows.business_knowledge_profiles[0]).toMatchObject({ business_summary: "A useful service", approved_tone: "Plain and helpful" });
    expect(db.rows.business_knowledge_assets).toHaveLength(2);
    for (const asset of db.rows.business_knowledge_assets) expect(asset).toMatchObject({ status: "active", agent_visible: true });
    expect(db.rows.customer_onboarding_plans[0].onboarding_type).not.toBe("school_licence_template");
  });

  it("leaves social optional without inventing a blank post", async () => {
    const input = state();
    input.steps.marketing.fields.content_calendar = "";
    input.steps.marketing.fields.campaign_themes = "";
    const out = await promoteIntoLiftorModules(input);
    expect(out.social_media?.status).toBe("manual_action_needed");
    expect(db.rows.social_post_drafts).toBeUndefined();
  });

  it("preserves live or externally shared records and existing runtime switches", async () => {
    db.rows.outreach_campaign_drafts = [{ id: "live-email", campaign_key: `setup_tunnel_${BIZ}`, is_live: true, email_sequence: [{ body: "Approved live copy" }] }];
    db.rows.social_post_drafts = [{ id: "scheduled-social", business_id: BIZ, platform_key: "setup_plan", post_type: "text", scheduled_externally: true, caption: "Approved scheduled copy" }];
    db.rows.business_runtime_activation = [{ id: "runtime", business_id: BIZ, activated: true, outbound_allowed: true, queue_allowed: true, ai_orchestration_allowed: true }];
    db.rows.business_activation_profiles = [{ id: "activation", business_id: BIZ, go_live_allowed: true, activation_status: "live" }];
    db.rows.business_operating_profiles = [{ id: "operating", business_id: BIZ, smartlead_enabled: true, auto_send_allowed: false, metadata: { existing_fact: "keep me" } }];

    await promoteIntoLiftorModules(state());
    expect(db.rows.outreach_campaign_drafts[0].email_sequence).toEqual([{ body: "Approved live copy" }]);
    expect(db.rows.social_post_drafts[0].caption).toBe("Approved scheduled copy");
    expect(db.rows.business_runtime_activation[0]).toMatchObject({ activated: true, outbound_allowed: true, queue_allowed: true, ai_orchestration_allowed: true });
    expect(db.rows.business_activation_profiles[0]).toMatchObject({ go_live_allowed: true, activation_status: "live" });
    expect(db.rows.business_operating_profiles[0].smartlead_enabled).toBe(true);
    expect(db.rows.business_operating_profiles[0].metadata.existing_fact).toBe("keep me");
  });

  it("maps old outreach connections to Email outreach instead of mislabelling them as Sales", () => {
    const legacy = { id: "old", status: "connected", target_table: "outreach_campaign_drafts", draft_record_id: "draft", note: "Old outreach", attempted_at: "2026-11-17" } as const;
    const out = normaliseModuleConnections({ sales: legacy, operations: { ...legacy, target_table: "business_operating_runbooks" } });
    expect(out.email_outreach).toEqual(legacy);
    expect(out.sales).toBeUndefined();
    expect(out.daily_running?.target_table).toBe("business_operating_runbooks");
  });

  it("links every section status to a registered founder page", () => {
    const registered = new Set(founderAreas.flatMap((area) => area.sections.map((section) => section.route)));
    for (const area of MODULE_AREAS) expect(registered.has(area.route)).toBe(true);
  });

  it("leaves sensitive-data flags to non-null database defaults pending founder review", () => {
    const attempts = buildPromoteAttempts(state());
    const compliance = attempts.find((x) => x.table === "business_compliance_profiles")!.payload;
    for (const key of ["handles_children_data", "handles_health_data", "handles_financial_data", "handles_legal_sensitive_data"]) {
      expect(compliance).not.toHaveProperty(key);
    }
    expect(compliance.founder_confirmed).toBe(false);
  });

  it("uses only real spine column names", () => {
    const attempts = buildPromoteAttempts(state());
    const activation = attempts.find((x) => x.table === "business_activation_profiles")!.payload;
    expect(activation).not.toHaveProperty("stage");
    expect(activation).not.toHaveProperty("status");
    const runtime = attempts.find((x) => x.table === "business_runtime_activation")!.payload;
    expect(runtime).not.toHaveProperty("runtime_mode");
    expect(runtime).not.toHaveProperty("is_live");
  });
  it("reuses an existing approved campaign instead of creating a setup duplicate", async () => {
    db.rows.outreach_campaign_drafts = [
      { id: "canonical", business_id: BIZ, campaign_key: "approved-campaign", status: "draft", email_sequence: { steps: [1, 2, 3, 4] } },
      { id: "old-setup", business_id: BIZ, campaign_key: `setup_tunnel_${BIZ}`, status: "archived", email_sequence: [{ body: "old" }] },
    ];
    const out = await promoteIntoLiftorModules(state());
    expect(db.rows.outreach_campaign_drafts).toHaveLength(2);
    expect(db.rows.outreach_campaign_drafts[1].email_sequence).toEqual([{ body: "old" }]);
    expect(out.email_outreach.records.find((r: any) => r.table === "outreach_campaign_drafts")?.record_id).toBe("canonical");
  });
});
