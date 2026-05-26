import { supabase } from "@/integrations/supabase/client";

export type IdentityStatus = "active" | "watch" | "duplicate_review" | "merged" | "suppressed" | "archived";
export type LinkedRole = "customer" | "prospect" | "seller" | "partner" | "adviser" | "vendor" | "investor" | "operator" | "other";
export type LinkStatus = "suggested" | "approved" | "rejected" | "active";
export type MergeStatus = "open" | "approval_required" | "approved" | "rejected" | "merged" | "ignored";
export type MergeActionStatus = "draft" | "approval_required" | "approved" | "completed" | "failed" | "cancelled";

export interface IdentityProfile {
  id: string;
  primary_email?: string | null;
  primary_phone_summary?: string | null;
  display_name?: string | null;
  canonical_contact_id?: string | null;
  identity_status: IdentityStatus;
  do_not_contact_global: boolean;
  created_at: string;
  audit_metadata?: Record<string, any>;
}

const sb: any = supabase as any;

export async function listIdentities(limit = 200): Promise<IdentityProfile[]> {
  const { data } = await sb.from("identity_profiles").select("*").order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function listLinks(profileId?: string) {
  let q = sb.from("identity_links").select("*").order("created_at", { ascending: false }).limit(500);
  if (profileId) q = q.eq("identity_profile_id", profileId);
  const { data } = await q;
  return data ?? [];
}

export async function listDuplicates() {
  const { data } = await sb.from("duplicate_identity_candidates").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function listMergeActions() {
  const { data } = await sb.from("identity_merge_actions").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function listDoNotContact() {
  const { data } = await sb.from("identity_profiles").select("*").eq("do_not_contact_global", true).order("updated_at", { ascending: false }).limit(200);
  return data ?? [];
}

export interface IdentitySummary {
  totalProfiles: number;
  duplicateReview: number;
  openDuplicates: number;
  mergesAwaiting: number;
  doNotContact: number;
  roleConflicts: number;
  watchItems: string[];
}

export async function summariseIdentity(): Promise<IdentitySummary> {
  const [profiles, dupes, merges, links] = await Promise.all([
    sb.from("identity_profiles").select("identity_status,do_not_contact_global").limit(2000),
    sb.from("duplicate_identity_candidates").select("merge_status").limit(500),
    sb.from("identity_merge_actions").select("action_status").in("action_status", ["draft", "approval_required", "approved"]),
    sb.from("identity_links").select("identity_profile_id,linked_role").limit(2000),
  ]);
  const p = (profiles.data ?? []) as Array<{ identity_status: string; do_not_contact_global: boolean }>;
  const d = (dupes.data ?? []) as Array<{ merge_status: string }>;

  // Role conflict detection: same profile linked to incompatible roles (e.g. customer + seller, prospect + vendor)
  const byProfile: Record<string, Set<string>> = {};
  for (const l of (links.data ?? []) as Array<{ identity_profile_id: string; linked_role: string }>) {
    (byProfile[l.identity_profile_id] ??= new Set()).add(l.linked_role);
  }
  const CONFLICT_PAIRS: Array<[string, string]> = [
    ["customer","seller"], ["customer","vendor"], ["seller","vendor"],
    ["prospect","vendor"], ["adviser","seller"], ["investor","vendor"],
  ];
  let roleConflicts = 0;
  for (const roles of Object.values(byProfile)) {
    for (const [a,b] of CONFLICT_PAIRS) if (roles.has(a) && roles.has(b)) { roleConflicts++; break; }
  }

  const summary: IdentitySummary = {
    totalProfiles: p.length,
    duplicateReview: p.filter(x => x.identity_status === "duplicate_review").length,
    openDuplicates: d.filter(x => x.merge_status === "open" || x.merge_status === "approval_required").length,
    mergesAwaiting: (merges.data ?? []).length,
    doNotContact: p.filter(x => x.do_not_contact_global).length,
    roleConflicts,
    watchItems: [],
  };
  if (summary.openDuplicates > 0) summary.watchItems.push(`${summary.openDuplicates} duplicate candidate(s) open`);
  if (summary.mergesAwaiting > 0) summary.watchItems.push(`${summary.mergesAwaiting} merge action(s) awaiting founder approval`);
  if (summary.roleConflicts > 0) summary.watchItems.push(`${summary.roleConflicts} profile(s) with conflicting roles`);
  return summary;
}

export function statusBadge(s: IdentityStatus): string {
  const m: Record<IdentityStatus, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    watch: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    duplicate_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    merged: "bg-muted text-muted-foreground border-border/50",
    suppressed: "bg-red-500/15 text-red-300 border-red-500/30",
    archived: "bg-muted text-muted-foreground border-border/50",
  };
  return m[s] ?? "bg-muted";
}

export function roleBadge(r: string): string {
  const m: Record<string, string> = {
    customer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    prospect: "bg-primary/15 text-primary border-primary/30",
    seller: "bg-primary/15 text-primary border-primary/30",
    partner: "bg-primary/15 text-primary border-primary/30",
    adviser: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    vendor: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    investor: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    operator: "bg-muted text-muted-foreground border-border/50",
    other: "bg-muted text-muted-foreground border-border/50",
  };
  return m[r] ?? "bg-muted";
}