import { supabase } from "@/integrations/supabase/client";

export type CatalogRow = {
  id: string;
  provider_name: string;
  provider_type: "payment"|"email"|"voice"|"calendar"|"social"|"crm"|"marketplace"|"analytics"|"hosting"|"ai"|"fulfilment"|"legal"|"ecommerce"|"other";
  description: string | null;
  supported_archetypes: string[];
  external_action_risk_level: "low"|"medium"|"high"|"critical";
  paid_api_risk: boolean;
  active: boolean;
};

export type RequirementRow = {
  id: string;
  business_id: string;
  integration_id: string;
  requirement_status: "needed"|"optional"|"not_needed"|"connected"|"missing"|"blocked"|"approval_required";
  reason: string | null;
  priority: "low"|"normal"|"high"|"critical";
  required_before_external_live: boolean;
};

export type ConnectionStatusRow = {
  id: string;
  business_id: string;
  integration_id: string;
  provider_status: "not_connected"|"configured"|"live"|"paused"|"error";
  secret_configured: boolean;
  webhook_configured: boolean;
  last_test_status: string | null;
  last_test_at: string | null;
  last_error: string | null;
};

export async function fetchCatalog() {
  const { data, error } = await (supabase as any).from("integration_catalog").select("*").order("provider_type").order("provider_name");
  if (error) throw error;
  return (data ?? []) as CatalogRow[];
}
export async function fetchRequirements(business_id?: string) {
  let q = (supabase as any).from("business_integration_requirements").select("*").order("priority");
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RequirementRow[];
}
export async function fetchConnections(business_id?: string) {
  let q = (supabase as any).from("integration_connection_status").select("*").order("updated_at", { ascending: false });
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ConnectionStatusRow[];
}

/* Recommend integrations by archetype: needed if archetype is in supported list, else optional. */
export function recommendIntegrationsForArchetype(catalog: CatalogRow[], archetype_code: string) {
  return catalog
    .filter(c => c.active)
    .map(c => ({
      integration: c,
      requirement_status: c.supported_archetypes.includes(archetype_code) ? "needed" as const : "optional" as const,
      reason: c.supported_archetypes.includes(archetype_code)
        ? `Standard for ${archetype_code}`
        : `Not standard for ${archetype_code}; flag if requested`,
      priority: c.external_action_risk_level === "critical" ? "critical" as const
              : c.external_action_risk_level === "high" ? "high" as const
              : "normal" as const,
      required_before_external_live: c.supported_archetypes.includes(archetype_code) && c.external_action_risk_level !== "low",
    }));
}

export async function generateRequirementsForBusiness(args: { business_id: string; archetype_code: string; replace?: boolean }) {
  const catalog = await fetchCatalog();
  if (args.replace) {
    await (supabase as any).from("business_integration_requirements").delete().eq("business_id", args.business_id);
  }
  const recs = recommendIntegrationsForArchetype(catalog, args.archetype_code);
  const rows = recs.map(r => ({
    business_id: args.business_id,
    integration_id: r.integration.id,
    requirement_status: r.requirement_status,
    reason: r.reason,
    priority: r.priority,
    required_before_external_live: r.required_before_external_live,
  }));
  const { data, error } = await (supabase as any)
    .from("business_integration_requirements")
    .upsert(rows, { onConflict: "business_id,integration_id" })
    .select();
  if (error) throw error;
  return (data ?? []) as RequirementRow[];
}

export type IntegrationWarning = {
  business_id: string;
  integration_id: string;
  severity: "missing"|"approval"|"risk"|"info";
  message: string;
};

export function diagnoseIntegrations(
  catalog: CatalogRow[],
  reqs: RequirementRow[],
  conns: ConnectionStatusRow[],
): IntegrationWarning[] {
  const out: IntegrationWarning[] = [];
  const cMap = new Map(catalog.map(c => [c.id, c]));
  const connMap = new Map(conns.map(c => [`${c.business_id}:${c.integration_id}`, c]));

  for (const r of reqs) {
    const cat = cMap.get(r.integration_id);
    if (!cat) continue;
    const conn = connMap.get(`${r.business_id}:${r.integration_id}`);
    const live = conn?.provider_status === "live" || conn?.provider_status === "configured";

    if (r.requirement_status === "needed" && !live) {
      out.push({ business_id: r.business_id, integration_id: r.integration_id, severity: "missing",
        message: `${cat.provider_name} required but not connected` });
    }
    if (cat.paid_api_risk && live) {
      out.push({ business_id: r.business_id, integration_id: r.integration_id, severity: "risk",
        message: `${cat.provider_name} is a paid API — monitor usage and approval gates` });
    }
    if (r.required_before_external_live && !live) {
      out.push({ business_id: r.business_id, integration_id: r.integration_id, severity: "approval",
        message: `${cat.provider_name} required before external go-live` });
    }
    if (conn?.provider_status === "error") {
      out.push({ business_id: r.business_id, integration_id: r.integration_id, severity: "risk",
        message: `${cat.provider_name} connection in error: ${conn.last_error ?? "unknown"}` });
    }
  }
  return out;
}

export function summarize(catalog: CatalogRow[], reqs: RequirementRow[], conns: ConnectionStatusRow[]) {
  const needed = reqs.filter(r => r.requirement_status === "needed").length;
  const connectedCount = conns.filter(c => c.provider_status === "live" || c.provider_status === "configured").length;
  const paidProviders = catalog.filter(c => c.paid_api_risk).length;
  const errors = conns.filter(c => c.provider_status === "error").length;
  return { providers: catalog.length, needed, connected: connectedCount, paidProviders, errors };
}