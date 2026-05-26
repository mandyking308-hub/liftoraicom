import { supabase } from "@/integrations/supabase/client";

export type ProviderType = "ai"|"voice"|"payment"|"calendar"|"email"|"social"|"crm"|"marketplace"|"document"|"hosting"|"analytics"|"ecommerce"|"legal"|"other";
export type RiskLevel = "low"|"medium"|"high"|"critical";
export type ConnectorStatus = "not_needed"|"needed"|"not_connected"|"configured"|"live"|"paused"|"error";
export type HealthStatus = "unknown"|"healthy"|"warning"|"failed"|"paused"|"not_configured";
export type CheckType = "internal_config"|"provider_ping"|"webhook"|"credential"|"dry_run"|"manual";
export type WebhookStatus = "not_configured"|"configured"|"live"|"paused"|"error";

export interface Connector {
  id: string; connector_key: string; connector_name: string;
  provider_type: ProviderType; description: string | null;
  external_action_risk_level: RiskLevel; paid_api_possible: boolean;
  supports_webhooks: boolean; supports_sandbox: boolean; active: boolean;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface Assignment {
  id: string; business_id: string | null; connector_id: string;
  connector_status: ConnectorStatus; secret_configured: boolean;
  webhook_configured: boolean; external_action_enabled: boolean;
  last_health_status: HealthStatus | null; last_health_checked_at: string | null;
  last_error: string | null; audit_metadata: any;
  created_at: string; updated_at: string;
}
export interface HealthCheck {
  id: string; connector_id: string; business_id: string | null;
  health_status: HealthStatus; check_type: CheckType;
  check_summary: string | null; error_message: string | null;
  checked_at: string; audit_metadata: any;
}
export interface WebhookEndpoint {
  id: string; connector_id: string; business_id: string | null;
  endpoint_name: string; endpoint_url: string;
  webhook_status: WebhookStatus; signature_verification_required: boolean;
  last_event_at: string | null; last_error: string | null;
  audit_metadata: any; created_at: string; updated_at: string;
}

export async function fetchConnectors(): Promise<Connector[]> {
  const { data } = await (supabase as any).from("connector_registry").select("*").order("provider_type").order("connector_name");
  return (data ?? []) as Connector[];
}
export async function fetchAssignments(): Promise<Assignment[]> {
  const { data } = await (supabase as any).from("business_connector_assignments").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as Assignment[];
}
export async function fetchHealthChecks(limit = 200): Promise<HealthCheck[]> {
  const { data } = await (supabase as any).from("connector_health_checks").select("*").order("checked_at", { ascending: false }).limit(limit);
  return (data ?? []) as HealthCheck[];
}
export async function fetchWebhooks(): Promise<WebhookEndpoint[]> {
  const { data } = await (supabase as any).from("connector_webhook_endpoints").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as WebhookEndpoint[];
}

/** Internal config-only health check. Safe: no provider ping, no mutation. */
export async function runInternalConfigCheck(connectorId: string, businessId: string | null = null): Promise<HealthCheck | null> {
  const { data: as } = await (supabase as any).from("business_connector_assignments")
    .select("*").eq("connector_id", connectorId).eq("business_id", businessId).maybeSingle();
  let status: HealthStatus = "not_configured";
  let summary = "No assignment record.";
  if (as) {
    if (!as.secret_configured) { status = "warning"; summary = "Secret not configured."; }
    else if (as.connector_status === "error") { status = "failed"; summary = as.last_error ?? "Marked error."; }
    else if (as.connector_status === "paused") { status = "paused"; summary = "Paused."; }
    else if (as.connector_status === "live" || as.connector_status === "configured") { status = "healthy"; summary = "Config present."; }
    else { status = "warning"; summary = `Status: ${as.connector_status}`; }
  }
  const { data } = await (supabase as any).from("connector_health_checks").insert({
    connector_id: connectorId, business_id: businessId,
    health_status: status, check_type: "internal_config",
    check_summary: summary, audit_metadata: { source: "registry_engine", read_only: true },
  }).select().single();
  return data as HealthCheck;
}

export interface RegistrySummary {
  connectors_total: number;
  connectors_active: number;
  assignments_live: number;
  assignments_configured: number;
  assignments_failed: number;
  assignments_missing_secret: number;
  webhooks_total: number;
  webhooks_not_configured: number;
  webhooks_unverified: number;
  external_action_enabled_count: number;
  paid_api_count: number;
  critical_risk_count: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

export function summarize(connectors: Connector[], assignments: Assignment[], webhooks: WebhookEndpoint[]): RegistrySummary {
  const byId = new Map(connectors.map(c => [c.id, c]));
  const live = assignments.filter(a => a.connector_status === "live").length;
  const configured = assignments.filter(a => a.connector_status === "configured").length;
  const failed = assignments.filter(a => a.connector_status === "error" || a.last_health_status === "failed").length;
  const missingSecret = assignments.filter(a => !a.secret_configured && a.connector_status !== "not_needed" && a.connector_status !== "not_connected").length;
  const externalOn = assignments.filter(a => a.external_action_enabled).length;
  const paidLive = assignments.filter(a => a.connector_status === "live" && byId.get(a.connector_id)?.paid_api_possible).length;
  const criticalLive = assignments.filter(a => (a.connector_status === "live" || a.external_action_enabled) && byId.get(a.connector_id)?.external_action_risk_level === "critical").length;
  const whUnverified = webhooks.filter(w => !w.signature_verification_required).length;
  const whMissing = webhooks.filter(w => w.webhook_status === "not_configured").length;

  let top: RegistrySummary["top_alert"] = null;
  if (failed > 0) top = { kind: "failed_connector", summary: `${failed} connector assignment(s) failing.`, severity: "high" };
  else if (missingSecret > 0) top = { kind: "missing_secret", summary: `${missingSecret} assignment(s) missing secrets.`, severity: "medium" };
  else if (whUnverified > 0) top = { kind: "webhook_unverified", summary: `${whUnverified} webhook(s) without signature verification required.`, severity: "high" };
  else if (criticalLive > 0) top = { kind: "critical_external", summary: `${criticalLive} critical-risk external connector(s) enabled.`, severity: "critical" };

  return {
    connectors_total: connectors.length,
    connectors_active: connectors.filter(c => c.active).length,
    assignments_live: live,
    assignments_configured: configured,
    assignments_failed: failed,
    assignments_missing_secret: missingSecret,
    webhooks_total: webhooks.length,
    webhooks_not_configured: whMissing,
    webhooks_unverified: whUnverified,
    external_action_enabled_count: externalOn,
    paid_api_count: paidLive,
    critical_risk_count: criticalLive,
    top_alert: top,
  };
}