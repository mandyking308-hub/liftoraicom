import { supabase } from "@/integrations/supabase/client";

export type AssetType =
  | "music" | "video" | "image" | "course" | "template"
  | "software" | "domain" | "brand_asset" | "document"
  | "ai_generated" | "dataset" | "other";

export type RightsStatus =
  | "unknown" | "owned" | "licensed" | "restricted" | "expired" | "disputed";

export type RightsType =
  | "copyright" | "trademark" | "licence" | "distribution"
  | "usage" | "sync" | "resale" | "commercial_use" | "other";

export type OpportunityType =
  | "sync" | "brand_use" | "resale" | "partnership"
  | "distribution" | "marketplace_listing" | "custom";

export type OpportunityStatus =
  | "draft" | "approval_required" | "approved" | "contacted"
  | "negotiated" | "closed" | "lost" | "parked";

export const ASSET_TYPE_META: Record<AssetType, { label: string; cls: string }> = {
  music:        { label: "Music",        cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  video:        { label: "Video",        cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  image:        { label: "Image",        cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  course:       { label: "Course",       cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  template:     { label: "Template",     cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  software:     { label: "Software",     cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  domain:       { label: "Domain",       cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  brand_asset:  { label: "Brand",        cls: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  document:     { label: "Document",     cls: "bg-muted text-muted-foreground border-border/50" },
  ai_generated: { label: "AI-generated", cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  dataset:      { label: "Dataset",      cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  other:        { label: "Other",        cls: "bg-muted text-muted-foreground border-border/50" },
};

export const RIGHTS_STATUS_META: Record<RightsStatus, { label: string; cls: string }> = {
  unknown:    { label: "Unknown",    cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  owned:      { label: "Owned",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  licensed:   { label: "Licensed",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  restricted: { label: "Restricted", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  expired:    { label: "Expired",    cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  disputed:   { label: "Disputed",   cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export const OPPORTUNITY_STATUS_META: Record<OpportunityStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground border-border/50" },
  approval_required: { label: "Approval required", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approved:          { label: "Approved",          cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  contacted:         { label: "Contacted",         cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  negotiated:        { label: "Negotiated",        cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  closed:            { label: "Closed",            cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  lost:              { label: "Lost",              cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  parked:            { label: "Parked",            cls: "bg-muted text-muted-foreground border-border/50" },
};

export type DigitalAsset = {
  id: string;
  business_id: string | null;
  asset_name: string;
  asset_type: AssetType;
  asset_url: string | null;
  storage_location_summary: string | null;
  owner_entity_id: string | null;
  creator_summary: string | null;
  commercial_use_allowed: boolean | null;
  rights_status: RightsStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RightsRecord = {
  id: string;
  asset_id: string | null;
  rights_type: RightsType;
  rights_summary: string | null;
  start_date: string | null;
  end_date: string | null;
  restrictions: string | null;
  evidence_source: string | null;
  created_at: string;
  updated_at: string;
};

export type LicensingOpportunity = {
  id: string;
  business_id: string | null;
  asset_id: string | null;
  opportunity_type: OpportunityType;
  opportunity_status: OpportunityStatus;
  expected_value: number | null;
  currency: string | null;
  risk_flags: string[] | null;
  created_at: string;
  updated_at: string;
};

const sb = () => supabase as any;

export async function fetchAssets(): Promise<DigitalAsset[]> {
  const { data, error } = await sb().from("digital_assets").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchRights(): Promise<RightsRecord[]> {
  const { data, error } = await sb().from("asset_rights_records").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchOpportunities(): Promise<LicensingOpportunity[]> {
  const { data, error } = await sb().from("licensing_opportunities").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function updateOpportunityStatus(id: string, status: OpportunityStatus): Promise<void> {
  const { error } = await sb().from("licensing_opportunities").update({ opportunity_status: status }).eq("id", id);
  if (error) throw error;
}
export async function updateAssetRightsStatus(id: string, status: RightsStatus): Promise<void> {
  const { error } = await sb().from("digital_assets").update({ rights_status: status }).eq("id", id);
  if (error) throw error;
}

export function summarize(assets: DigitalAsset[], rights: RightsRecord[], opps: LicensingOpportunity[]) {
  const now = Date.now();
  const expired = rights.filter(r => r.end_date && new Date(r.end_date).getTime() < now).length;
  const expiringSoon = rights.filter(r => {
    if (!r.end_date) return false;
    const ms = new Date(r.end_date).getTime() - now;
    return ms > 0 && ms < 1000 * 60 * 60 * 24 * 30;
  }).length;
  return {
    assets_total: assets.length,
    assets_active: assets.filter(a => a.active).length,
    unknown_rights: assets.filter(a => a.rights_status === "unknown").length,
    disputed: assets.filter(a => a.rights_status === "disputed").length,
    expired_status: assets.filter(a => a.rights_status === "expired").length,
    rights_total: rights.length,
    rights_expired: expired,
    rights_expiring_soon: expiringSoon,
    opps_total: opps.length,
    opps_draft: opps.filter(o => o.opportunity_status === "draft").length,
    opps_approval: opps.filter(o => o.opportunity_status === "approval_required").length,
    opps_active: opps.filter(o => ["approved", "contacted", "negotiated"].includes(o.opportunity_status)).length,
    opps_closed: opps.filter(o => o.opportunity_status === "closed").length,
    expected_value_open: opps
      .filter(o => !["closed", "lost", "parked"].includes(o.opportunity_status))
      .reduce((s, o) => s + Number(o.expected_value ?? 0), 0),
  };
}

export type Diagnostic = {
  id: string;
  severity: "info" | "warn" | "block";
  asset_id: string | null;
  business_id: string | null;
  message: string;
};

export function diagnose(
  assets: DigitalAsset[],
  rights: RightsRecord[],
  opps: LicensingOpportunity[],
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const now = Date.now();
  const rightsByAsset = new Map<string, RightsRecord[]>();
  for (const r of rights) {
    if (!r.asset_id) continue;
    const arr = rightsByAsset.get(r.asset_id) ?? [];
    arr.push(r); rightsByAsset.set(r.asset_id, arr);
  }

  for (const a of assets) {
    if (a.rights_status === "unknown") {
      out.push({ id: a.id, severity: "warn", asset_id: a.id, business_id: a.business_id,
        message: `Asset "${a.asset_name}" has unknown rights — IP Agent must catalogue and legal-review.` });
    }
    if (a.rights_status === "disputed") {
      out.push({ id: a.id, severity: "block", asset_id: a.id, business_id: a.business_id,
        message: `Asset "${a.asset_name}" rights disputed — block public use until resolved.` });
    }
    if (a.rights_status === "expired") {
      out.push({ id: a.id, severity: "block", asset_id: a.id, business_id: a.business_id,
        message: `Asset "${a.asset_name}" licence expired — block external distribution.` });
    }
    if (a.asset_type === "ai_generated" && a.commercial_use_allowed === false) {
      out.push({ id: a.id, severity: "warn", asset_id: a.id, business_id: a.business_id,
        message: `AI-generated asset "${a.asset_name}" lacks commercial-use clearance.` });
    }
    const rr = rightsByAsset.get(a.id) ?? [];
    if (rr.length === 0 && a.rights_status !== "unknown") {
      out.push({ id: a.id, severity: "info", asset_id: a.id, business_id: a.business_id,
        message: `Asset "${a.asset_name}" has rights_status "${a.rights_status}" but no evidence record attached.` });
    }
  }

  for (const r of rights) {
    if (!r.end_date) continue;
    const ms = new Date(r.end_date).getTime() - now;
    if (ms < 0) {
      out.push({ id: r.id, severity: "block", asset_id: r.asset_id, business_id: null,
        message: `Rights record (${r.rights_type}) expired ${r.end_date} — block dependent use.` });
    } else if (ms < 1000 * 60 * 60 * 24 * 30) {
      out.push({ id: r.id, severity: "warn", asset_id: r.asset_id, business_id: null,
        message: `Rights record (${r.rights_type}) expires ${r.end_date} — renew before external use.` });
    }
  }

  for (const o of opps) {
    if (o.opportunity_status === "contacted" || o.opportunity_status === "negotiated" || o.opportunity_status === "closed") {
      const asset = assets.find(a => a.id === o.asset_id);
      if (asset && (asset.rights_status === "unknown" || asset.rights_status === "disputed" || asset.rights_status === "expired")) {
        out.push({ id: o.id, severity: "block", asset_id: o.asset_id, business_id: o.business_id,
          message: `Licensing opportunity advancing on asset with ${asset.rights_status} rights — halt.` });
      }
    }
    if ((o.risk_flags ?? []).length > 0 && o.opportunity_status === "approved") {
      out.push({ id: o.id, severity: "warn", asset_id: o.asset_id, business_id: o.business_id,
        message: `Approved opportunity has open risk flags: ${(o.risk_flags ?? []).join(", ")}.` });
    }
  }

  return out;
}
