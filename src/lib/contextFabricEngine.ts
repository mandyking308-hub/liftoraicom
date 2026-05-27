import { supabase } from "@/integrations/supabase/client";

export type FabricEnvelope = {
  id: string;
  business_id: string;
  archetype_code: string | null;
  brand_name: string;
  context_status: string;
  product_catalogue_status: string;
  entity_mapping_status: string;
  integration_status: string;
  founder_confirmed: boolean;
};

export type FabricContract = {
  id: string;
  source_module: string;
  target_module: string;
  contract_name: string;
  required_context_fields: string[];
  required_source_fields: string[];
  active: boolean;
  external_action_possible: boolean;
  approval_required_for_external: boolean;
};

export type FabricLink = {
  id: string;
  business_id: string | null;
  source_module: string;
  target_module: string;
  source_record_id: string;
  target_record_id: string;
  link_status: string;
};

export type FabricValidationEvent = {
  id: string;
  business_id: string | null;
  severity: string;
  validation_type: string;
  action_taken: string;
  validation_summary: string;
  resolved_at: string | null;
};

export type FabricRepair = {
  id: string;
  business_id: string | null;
  repair_type: string;
  repair_status: string;
  founder_approval_required: boolean;
};

export async function fetchFabric() {
  const [env, con, lnk, evt, rep] = await Promise.all([
    supabase.from("business_context_envelopes").select("*"),
    supabase.from("module_integration_contracts").select("*"),
    supabase.from("cross_module_record_links").select("*"),
    supabase.from("business_context_validation_events").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("context_repair_actions").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  return {
    envelopes: (env.data ?? []) as FabricEnvelope[],
    contracts: (con.data ?? []) as FabricContract[],
    links: (lnk.data ?? []) as FabricLink[],
    events: (evt.data ?? []) as FabricValidationEvent[],
    repairs: (rep.data ?? []) as FabricRepair[],
  };
}

export type FabricSummary = {
  businesses: number;
  envelopes_ready: number;
  envelope_health_pct: number;
  contracts_active: number;
  contract_integrity_pct: number;
  links_active: number;
  orphaned_links: number;
  open_warnings: number;
  draft_repairs: number;
  activation_state: "ready" | "watch" | "blocked";
};

const READY = "ready";

export function summarizeFabric(d: {
  envelopes: FabricEnvelope[];
  contracts: FabricContract[];
  links: FabricLink[];
  events: FabricValidationEvent[];
  repairs: FabricRepair[];
}): FabricSummary {
  const envelopes_ready = d.envelopes.filter(
    (e) =>
      e.context_status === READY &&
      e.product_catalogue_status === READY &&
      e.entity_mapping_status === READY &&
      e.integration_status === READY &&
      e.founder_confirmed
  ).length;
  const envelope_health_pct = d.envelopes.length === 0 ? 0 : Math.round((envelopes_ready / d.envelopes.length) * 100);

  const businessIds = new Set(d.envelopes.map((e) => e.business_id));
  const contracts_active = d.contracts.filter((c) => c.active).length;
  const orphaned_links = d.links.filter((l) => !l.business_id || !businessIds.has(l.business_id)).length;
  const links_active = d.links.filter((l) => l.link_status === "active").length;
  const integrity_denom = d.links.length + d.events.filter((e) => e.severity !== "info").length;
  const integrity_fail = orphaned_links + d.events.filter((e) => ["high", "critical"].includes(e.severity) && !e.resolved_at).length;
  const contract_integrity_pct = integrity_denom === 0 ? 100 : Math.max(0, Math.round(((integrity_denom - integrity_fail) / integrity_denom) * 100));

  const open_warnings = d.events.filter((e) => ["low", "medium", "high", "critical"].includes(e.severity) && !e.resolved_at).length;
  const draft_repairs = d.repairs.filter((r) => r.repair_status === "draft").length;

  const has_critical = d.events.some((e) => e.severity === "critical" && !e.resolved_at);
  const activation_state: FabricSummary["activation_state"] =
    has_critical || envelope_health_pct < 50 ? "blocked" : envelope_health_pct < 100 || open_warnings > 0 ? "watch" : "ready";

  return {
    businesses: d.envelopes.length,
    envelopes_ready,
    envelope_health_pct,
    contracts_active,
    contract_integrity_pct,
    links_active,
    orphaned_links,
    open_warnings,
    draft_repairs,
    activation_state,
  };
}

/** Runtime guard: rejects payloads missing business_id or pointing to an unknown envelope. */
export function validateBusinessContext(
  payload: { business_id?: string | null },
  envelopes: Pick<FabricEnvelope, "business_id">[]
): { ok: boolean; reason?: string } {
  if (!payload.business_id) return { ok: false, reason: "missing_business_id" };
  if (!envelopes.some((e) => e.business_id === payload.business_id)) return { ok: false, reason: "unknown_business" };
  return { ok: true };
}

/** Runtime guard: rejects cross-business links (records from different business envelopes). */
export function detectCrossBusinessContamination(
  link: { business_id: string | null; source_business_id?: string | null; target_business_id?: string | null }
): { ok: boolean; reason?: string } {
  if (link.source_business_id && link.target_business_id && link.source_business_id !== link.target_business_id) {
    return { ok: false, reason: "cross_business_contamination" };
  }
  if (link.source_business_id && link.business_id && link.source_business_id !== link.business_id) {
    return { ok: false, reason: "cross_business_contamination" };
  }
  return { ok: true };
}