import { supabase } from "@/integrations/supabase/client";

export type PortalType = "customer"|"seller"|"partner"|"adviser"|"document_upload"|"support"|"marketplace"|"other";
export type PortalStatus = "draft"|"internal_only"|"approval_required"|"live"|"paused"|"retired";
export type AccessMode = "invite_only"|"magic_link"|"account_login"|"manual"|"disabled";
export type PortalRole = "customer"|"seller"|"partner"|"adviser"|"uploader"|"read_only"|"admin_limited";
export type AccessStatus = "draft"|"invited"|"active"|"suspended"|"revoked"|"expired";
export type InviteType = "customer"|"seller"|"partner"|"adviser"|"upload_request";
export type InviteStatus = "draft"|"approval_required"|"approved"|"sent"|"accepted"|"expired"|"revoked"|"cancelled";
export type EventType = "invite_created"|"invite_sent"|"login"|"upload"|"download"|"view"|"access_revoked"|"suspicious"|"expired";
export type Severity = "info"|"low"|"medium"|"high"|"critical";

export interface PortalProfile {
  id: string;
  business_id: string | null;
  portal_type: PortalType;
  portal_name: string;
  portal_status: PortalStatus;
  public_url: string | null;
  access_mode: AccessMode;
  requires_founder_approval_for_invites: boolean;
  active: boolean;
  created_at: string;
  audit_metadata: any;
}

export interface PortalUser {
  id: string;
  portal_profile_id: string;
  business_id: string | null;
  email: string;
  display_name: string | null;
  portal_role: PortalRole;
  access_status: AccessStatus;
  invited_at: string | null;
  last_login_at: string | null;
  revoked_at: string | null;
  audit_metadata: any;
}

export interface PortalInvite {
  id: string;
  portal_profile_id: string;
  invitee_email: string;
  invite_type: InviteType;
  invite_status: InviteStatus;
  founder_approval_required: boolean;
  founder_approved_at: string | null;
  sent_at: string | null;
  expires_at: string | null;
  created_at: string;
  audit_metadata: any;
}

export interface PortalEvent {
  id: string;
  portal_profile_id: string | null;
  portal_user_id: string | null;
  event_type: EventType;
  event_summary: string;
  severity: Severity;
  created_at: string;
  audit_metadata: any;
}

export const PORTAL_TYPE_META: Record<PortalType, { label: string; route: string }> = {
  customer:        { label: "Customer",        route: "/portal/customer" },
  seller:          { label: "Seller",          route: "/portal/seller" },
  partner:         { label: "Partner",         route: "/portal/partner" },
  adviser:         { label: "Adviser",         route: "/portal/adviser" },
  document_upload: { label: "Upload",          route: "/portal/upload" },
  support:         { label: "Support",         route: "/portal/customer" },
  marketplace:     { label: "Marketplace",     route: "/portal/seller" },
  other:           { label: "Other",           route: "/portal/customer" },
};

export const STATUS_META: Record<PortalStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground border-border/50" },
  internal_only:     { label: "Internal only",     cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  approval_required: { label: "Approval required", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  live:              { label: "Live",              cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused:            { label: "Paused",            cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  retired:           { label: "Retired",           cls: "bg-muted text-muted-foreground border-border/50" },
};

export const SEVERITY_META: Record<Severity, { label: string; cls: string }> = {
  info:     { label: "Info",     cls: "bg-muted text-muted-foreground border-border/50" },
  low:      { label: "Low",      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  medium:   { label: "Medium",   cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export async function fetchPortalProfiles(opts: { type?: PortalType } = {}): Promise<PortalProfile[]> {
  let q = (supabase as any).from("portal_profiles").select("*").order("created_at", { ascending: false });
  if (opts.type) q = q.eq("portal_type", opts.type);
  const { data, error } = await q;
  if (error) { console.warn("portal_profiles fetch failed", error); return []; }
  return (data ?? []) as PortalProfile[];
}

export async function fetchPortalUsers(profileId?: string): Promise<PortalUser[]> {
  let q = (supabase as any).from("portal_users").select("*").order("created_at", { ascending: false });
  if (profileId) q = q.eq("portal_profile_id", profileId);
  const { data, error } = await q;
  if (error) { console.warn("portal_users fetch failed", error); return []; }
  return (data ?? []) as PortalUser[];
}

export async function fetchPortalInvites(): Promise<PortalInvite[]> {
  const { data, error } = await (supabase as any).from("portal_invites").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("portal_invites fetch failed", error); return []; }
  return (data ?? []) as PortalInvite[];
}

export async function fetchPortalEvents(): Promise<PortalEvent[]> {
  const { data, error } = await (supabase as any).from("portal_access_events").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) { console.warn("portal_access_events fetch failed", error); return []; }
  return (data ?? []) as PortalEvent[];
}

export interface PortalSummary {
  total_profiles: number;
  live: number;
  internal_only: number;
  draft_invites: number;
  approval_pending: number;
  active_users: number;
  suspicious_events: number;
  risk_warnings: string[];
}

export function summarize(profiles: PortalProfile[], users: PortalUser[], invites: PortalInvite[], events: PortalEvent[]): PortalSummary {
  const warnings: string[] = [];
  const live = profiles.filter(p => p.portal_status === "live");
  for (const p of live) {
    if (!p.requires_founder_approval_for_invites) warnings.push(`${p.portal_name}: invites do not require approval`);
    if (p.access_mode === "disabled") warnings.push(`${p.portal_name}: live but access_mode is disabled`);
  }
  return {
    total_profiles: profiles.length,
    live: live.length,
    internal_only: profiles.filter(p => p.portal_status === "internal_only").length,
    draft_invites: invites.filter(i => i.invite_status === "draft" || i.invite_status === "approval_required").length,
    approval_pending: invites.filter(i => i.invite_status === "approval_required").length,
    active_users: users.filter(u => u.access_status === "active").length,
    suspicious_events: events.filter(e => e.event_type === "suspicious" || e.severity === "critical" || e.severity === "high").length,
    risk_warnings: warnings,
  };
}