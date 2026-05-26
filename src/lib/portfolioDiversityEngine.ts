import { supabase } from "@/integrations/supabase/client";

export type DiversityCounts = {
  businesses_total: number;
  classified: number;
  unclassified: number;
  templates_applied: number;
  entities_mapped: number;
  launch_items_missing: number;
  integrations_missing: number;
  compliance_profiles: number;
  compliance_high_risk: number;
  context_warnings: number;
  priority_recommendations: number;
  resource_allocations: number;
  portfolio_risk_high: number;
  lifecycle_assigned: number;
  offers: number;
  margin_warnings: number;
  channel_strategies: number;
  attribution_sources: number;
  attribution_unknown: number;
  partner_prospects: number;
  digital_assets: number;
  ip_rights_risks: number;
  insurance_gaps: number;
  exit_scorecards: number;
  exit_not_ready: number;
  test_records_total: number;
};

const TEST_TAG = "LIVE_INTERNAL_TEST";

async function count(table: string, builder?: (q: any) => any): Promise<number> {
  const sb: any = supabase as any;
  try {
    let q = sb.from(table).select("id", { head: true, count: "exact" });
    if (builder) q = builder(q);
    const { count: c } = await q;
    return c ?? 0;
  } catch {
    return 0;
  }
}

export async function loadDiversity(): Promise<DiversityCounts> {
  const [
    businesses_total,
    classified,
    templates_applied,
    entities_mapped,
    launch_items_missing,
    integrations_missing,
    compliance_profiles,
    compliance_high_risk,
    context_warnings,
    priority_recommendations,
    resource_allocations,
    portfolio_risk_high,
    lifecycle_assigned,
    offers,
    margin_warnings,
    channel_strategies,
    attribution_sources,
    attribution_unknown,
    partner_prospects,
    digital_assets,
    ip_rights_risks,
    insurance_gaps,
    exit_scorecards,
    exit_not_ready,
    test_archetypes,
    test_launch,
    test_partner,
    test_asset,
  ] = await Promise.all([
    count("businesses"),
    count("business_archetype_assignments"),
    count("business_template_applications"),
    count("business_entity_assignments"),
    count("business_launch_checklist_items", q => q.eq("item_status", "missing")),
    count("business_integration_requirements", q => q.eq("requirement_status", "missing")),
    count("business_compliance_profiles"),
    count("business_compliance_profiles", q => q.eq("compliance_risk_level", "high")),
    count("context_guard_events"),
    count("portfolio_priority_scores"),
    count("resource_allocation_items"),
    count("business_risk_scores", q => q.eq("high_risk", true)),
    count("business_lifecycle_assignments"),
    count("global_offers"),
    count("product_margin_profiles", q => q.in("margin_status", ["poor", "loss_making"])),
    count("business_channel_strategies"),
    count("attribution_sources"),
    count("attribution_sources", q => q.eq("source_type", "unknown")),
    count("partner_prospects"),
    count("digital_assets"),
    count("digital_assets", q => q.in("rights_status", ["unknown", "disputed", "expired"])),
    count("insurance_gap_assessments"),
    count("business_exit_readiness_scores"),
    count("business_exit_readiness_scores", q => q.lt("total_exit_readiness_score", 60)),
    count("business_archetype_assignments", q => q.ilike("audit_metadata->>source", `%${TEST_TAG}%`)),
    count("business_launch_checklist_items", q => q.ilike("item_name", `%${TEST_TAG}%`)),
    count("partner_prospects", q => q.ilike("partner_name", `%${TEST_TAG}%`)),
    count("digital_assets", q => q.ilike("asset_name", `%${TEST_TAG}%`)),
  ]);
  const unclassified = Math.max(0, businesses_total - classified);
  const test_records_total = test_archetypes + test_launch + test_partner + test_asset;
  return {
    businesses_total, classified, unclassified, templates_applied, entities_mapped,
    launch_items_missing, integrations_missing, compliance_profiles, compliance_high_risk,
    context_warnings, priority_recommendations, resource_allocations, portfolio_risk_high,
    lifecycle_assigned, offers, margin_warnings, channel_strategies,
    attribution_sources, attribution_unknown, partner_prospects,
    digital_assets, ip_rights_risks, insurance_gaps, exit_scorecards, exit_not_ready,
    test_records_total,
  };
}

export const DIVERSITY_MODULES: Array<{ key: keyof DiversityCounts; label: string; to: string; hint?: string }> = [
  { key: "classified",                label: "Businesses classified",       to: "/founder/archetypes" },
  { key: "unclassified",              label: "Unclassified businesses",     to: "/founder/archetypes" },
  { key: "templates_applied",         label: "Templates applied",           to: "/founder/business-templates" },
  { key: "entities_mapped",           label: "Entity mapped",               to: "/founder/entity-map" },
  { key: "launch_items_missing",      label: "Launch basics missing",       to: "/founder/launch-factory" },
  { key: "integrations_missing",      label: "Integrations missing",        to: "/founder/integration-map" },
  { key: "compliance_high_risk",      label: "Compliance risks",            to: "/founder/business-compliance" },
  { key: "context_warnings",          label: "Context guard warnings",      to: "/founder/context-guard" },
  { key: "priority_recommendations",  label: "Priority recommendations",    to: "/founder/portfolio-prioritisation" },
  { key: "resource_allocations",      label: "Resource allocation items",   to: "/founder/resource-allocation" },
  { key: "portfolio_risk_high",       label: "Portfolio risk (high)",       to: "/founder/portfolio-risk" },
  { key: "lifecycle_assigned",        label: "Lifecycle assigned",          to: "/founder/business-lifecycle" },
  { key: "offers",                    label: "Product / offer count",       to: "/founder/product-catalogue" },
  { key: "margin_warnings",           label: "Margin warnings",             to: "/founder/pricing-margin" },
  { key: "channel_strategies",        label: "Channel strategies",          to: "/founder/channel-strategy" },
  { key: "attribution_unknown",       label: "Attribution gaps",            to: "/founder/analytics-attribution" },
  { key: "partner_prospects",         label: "Partner opportunities",       to: "/founder/partners" },
  { key: "ip_rights_risks",           label: "IP / rights risks",           to: "/founder/ip-assets" },
  { key: "insurance_gaps",            label: "Insurance gaps",              to: "/founder/insurance-liability" },
  { key: "exit_not_ready",            label: "Exit readiness gaps",         to: "/founder/exit-metrics" },
];