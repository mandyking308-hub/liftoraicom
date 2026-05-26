import { supabase } from "@/integrations/supabase/client";

export type FlagCategory =
  | "module" | "workflow" | "external_action" | "provider"
  | "ui" | "experiment" | "safety" | "business_override";

export type ConfigCategory =
  | "ai" | "finance" | "sales" | "marketplace" | "privacy"
  | "notifications" | "workflow" | "ui" | "provider" | "safety" | "other";

export type Sensitivity = "low" | "medium" | "high" | "critical";

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  flag_category: FlagCategory;
  description: string | null;
  default_value: boolean;
  current_value: boolean;
  external_action_risk: boolean;
  requires_founder_approval: boolean;
  active: boolean;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface BusinessOverride {
  id: string;
  business_id: string | null;
  flag_id: string;
  override_value: boolean;
  override_reason: string | null;
  founder_approved_at: string | null;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface SystemConfigValue {
  id: string;
  config_key: string;
  config_name: string;
  config_category: ConfigCategory;
  config_value: any;
  sensitivity_level: Sensitivity;
  founder_approval_required: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigAuditEvent {
  id: string;
  config_type: "feature_flag" | "business_override" | "system_value";
  config_key: string;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  change_reason: string | null;
  approval_item_id: string | null;
  audit_metadata: any;
  created_at: string;
}

const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true || m?.tag === "LIVE_INTERNAL_TEST");

export async function fetchFlags(): Promise<FeatureFlag[]> {
  const { data } = await (supabase as any)
    .from("feature_flags").select("*").order("flag_category").order("flag_name");
  return (data ?? []) as FeatureFlag[];
}
export async function fetchOverrides(): Promise<BusinessOverride[]> {
  const { data } = await (supabase as any)
    .from("business_feature_overrides").select("*").order("created_at", { ascending: false });
  return (data ?? []) as BusinessOverride[];
}
export async function fetchConfigs(): Promise<SystemConfigValue[]> {
  const { data } = await (supabase as any)
    .from("system_configuration_values").select("*").order("config_category").order("config_name");
  return (data ?? []) as SystemConfigValue[];
}
export async function fetchAuditEvents(limit = 200): Promise<ConfigAuditEvent[]> {
  const { data } = await (supabase as any)
    .from("configuration_audit_events").select("*")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as ConfigAuditEvent[];
}

export interface ConfigSummary {
  flags_total: number;
  modules_active: number;
  modules_inactive: number;
  external_locked: number;
  external_enabled_without_approval: number;
  dangerous_enabled: number;
  overrides_active: number;
  recent_changes_24h: number;
  test_records: number;
  recommended_action: string;
  top_alert: { kind: string; summary: string; severity: Sensitivity } | null;
}

export function summarize(
  flags: FeatureFlag[], overrides: BusinessOverride[], audit: ConfigAuditEvent[],
): ConfigSummary {
  const modules = flags.filter(f => f.flag_category === "module");
  const external = flags.filter(f => f.external_action_risk);
  const externalLocked = external.filter(f => !f.current_value).length;
  const externalEnabledWithoutApproval = external.filter(f =>
    f.current_value && f.requires_founder_approval && !(f.audit_metadata?.founder_approved_at)
  ).length;

  const dangerousEnabled = flags.filter(f => f.current_value && (f.external_action_risk || f.requires_founder_approval)).length;

  const day = Date.now() - 24 * 3600 * 1000;
  const recent = audit.filter(a => new Date(a.created_at).getTime() > day);

  let top: ConfigSummary["top_alert"] = null;
  if (externalEnabledWithoutApproval > 0)
    top = { kind: "unapproved_external", summary: `${externalEnabledWithoutApproval} external-action flag(s) enabled without approval`, severity: "critical" };
  else if (dangerousEnabled > 0)
    top = { kind: "dangerous_enabled", summary: `${dangerousEnabled} dangerous flag(s) currently on — review`, severity: "high" };
  else if (recent.length > 0)
    top = { kind: "recent", summary: `${recent.length} config change(s) in last 24h`, severity: "low" };

  let recommended = "Configuration registry healthy.";
  if (externalEnabledWithoutApproval > 0) recommended = "Disable external flags pending approval and route through approval queue.";
  else if (dangerousEnabled > 0) recommended = "Verify dangerous flag rationale and founder approval audit.";

  return {
    flags_total: flags.length,
    modules_active: modules.filter(m => m.current_value).length,
    modules_inactive: modules.filter(m => !m.current_value).length,
    external_locked: externalLocked,
    external_enabled_without_approval: externalEnabledWithoutApproval,
    dangerous_enabled: dangerousEnabled,
    overrides_active: overrides.length,
    recent_changes_24h: recent.length,
    test_records: [...flags.map(f => f.audit_metadata), ...overrides.map(o => o.audit_metadata)].filter(isTest).length,
    recommended_action: recommended,
    top_alert: top,
  };
}

export const FLAG_CATEGORY_LABEL: Record<FlagCategory, string> = {
  module: "Module", workflow: "Workflow", external_action: "External Action",
  provider: "Provider", ui: "UI", experiment: "Experiment",
  safety: "Safety", business_override: "Business Override",
};

/**
 * Toggle a flag. Internal flags toggle immediately. External-action /
 * founder-approval-required flags are not flipped on the server — instead an
 * audit event is recorded marking the request as blocked pending approval.
 */
export async function requestFlagToggle(flag: FeatureFlag, next: boolean, reason?: string) {
  const gated = flag.requires_founder_approval || flag.external_action_risk;
  if (gated && next === true) {
    await (supabase as any).from("configuration_audit_events").insert({
      config_type: "feature_flag",
      config_key: flag.flag_key,
      old_value: flag.current_value, new_value: flag.current_value,
      change_reason: reason || "Enable attempted; founder approval required, change blocked",
      audit_metadata: { blocked: true, reason: "requires_founder_approval", tag: "LIVE_INTERNAL_TEST" },
    });
    return { blocked: true } as const;
  }
  const { error } = await (supabase as any).from("feature_flags")
    .update({ current_value: next }).eq("id", flag.id);
  if (error) throw error;
  return { blocked: false } as const;
}

/** Safe read: missing flag defaults to false (not crash). */
export async function isFlagOn(flagKey: string): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("feature_flags").select("current_value").eq("flag_key", flagKey).maybeSingle();
  return !!data?.current_value;
}