import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type Sensitivity = "standard" | "sensitive" | "high_risk";
export type ReqStatus = "missing" | "drafted" | "reviewed" | "approved" | "published" | "stale";
export type PublishStatus = "pending_approval" | "approved" | "rejected" | "published";

export interface PolicyTemplate {
  id: string; policy_type: string; archetype: string; jurisdiction: string;
  required: boolean; sensitivity: Sensitivity; default_review_frequency_days: number;
  template_summary: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface PolicyRequirement {
  id: string; business_name: string; archetype: string; jurisdiction: string;
  legal_entity: string|null; policy_type: string; required: boolean; status: ReqStatus;
  last_reviewed_at: string|null; next_review_due: string|null; is_stale: boolean;
  notes: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface PolicyDraft {
  id: string; requirement_id: string|null; business_name: string; policy_type: string;
  version: string; draft_summary: string; draft_body: string|null; sensitivity: Sensitivity;
  requires_legal_review: boolean; legal_reviewed: boolean; publish_status: PublishStatus;
  founder_decision: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface PolicyApproval {
  id: string; draft_id: string|null; approver_role: string; decision: string;
  decided_at: string|null; notes: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface PolicyPublicPage {
  id: string; business_name: string; policy_type: string; public_url: string|null;
  is_published: boolean; publish_status: string; last_published_version: string|null;
  last_published_at: string|null; requires_external_publish: boolean; founder_decision: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface PolicyReviewEvent {
  id: string; requirement_id: string|null; draft_id: string|null; event_type: string;
  triggered_by: string; detail: string|null; routed_to: string|null; status: string;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function listTemplates(): Promise<PolicyTemplate[]> {
  const { data } = await sb.from("policy_templates").select("*").order("archetype").limit(500);
  return (data ?? []) as PolicyTemplate[];
}
export async function listRequirements(): Promise<PolicyRequirement[]> {
  const { data } = await sb.from("policy_requirements").select("*").order("business_name").limit(1000);
  return (data ?? []) as PolicyRequirement[];
}
export async function listDrafts(): Promise<PolicyDraft[]> {
  const { data } = await sb.from("policy_drafts").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as PolicyDraft[];
}
export async function listApprovals(): Promise<PolicyApproval[]> {
  const { data } = await sb.from("policy_approvals").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as PolicyApproval[];
}
export async function listPublicPages(): Promise<PolicyPublicPage[]> {
  const { data } = await sb.from("policy_public_pages").select("*").order("business_name").limit(500);
  return (data ?? []) as PolicyPublicPage[];
}
export async function listReviewEvents(): Promise<PolicyReviewEvent[]> {
  const { data } = await sb.from("policy_review_events").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as PolicyReviewEvent[];
}

export interface PolicySummary {
  businesses: number; requirementsTotal: number; missing: number; stale: number;
  drafted: number; draftsPendingApproval: number; legalReviewPending: number;
  publishedPages: number; pagesAwaitingPublish: number; reviewEventsOpen: number;
  watchItems: string[];
}

export async function summarisePolicies(): Promise<PolicySummary> {
  const [reqs, drafts, pages, events] = await Promise.all([
    listRequirements(), listDrafts(), listPublicPages(), listReviewEvents()
  ]);
  const businesses = new Set(reqs.map(r => r.business_name)).size;
  const missing = reqs.filter(r => r.required && r.status === "missing").length;
  const stale = reqs.filter(r => r.is_stale).length;
  const drafted = reqs.filter(r => r.status === "drafted" || r.status === "reviewed").length;
  const draftsPendingApproval = drafts.filter(d => d.publish_status === "pending_approval").length;
  const legalReviewPending = drafts.filter(d => d.requires_legal_review && !d.legal_reviewed).length;
  const publishedPages = pages.filter(p => p.is_published).length;
  const pagesAwaitingPublish = pages.filter(p => !p.is_published && p.publish_status !== "rejected").length;
  const reviewEventsOpen = events.filter(e => e.status === "open").length;
  const watch: string[] = [];
  if (missing) watch.push(`${missing} required policy(ies) missing across businesses`);
  if (stale) watch.push(`${stale} policy(ies) stale and due for re-review`);
  if (legalReviewPending) watch.push(`${legalReviewPending} draft(s) awaiting legal/adviser review`);
  if (draftsPendingApproval) watch.push(`${draftsPendingApproval} draft(s) awaiting founder approval before publish`);
  if (pagesAwaitingPublish) watch.push(`${pagesAwaitingPublish} public page(s) awaiting founder approval to publish`);
  if (reviewEventsOpen) watch.push(`${reviewEventsOpen} open Policy Coverage Agent review event(s)`);
  return { businesses, requirementsTotal: reqs.length, missing, stale, drafted,
    draftsPendingApproval, legalReviewPending, publishedPages, pagesAwaitingPublish, reviewEventsOpen, watchItems: watch };
}