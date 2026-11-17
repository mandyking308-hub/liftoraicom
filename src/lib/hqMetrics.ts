import { supabase } from "@/integrations/supabase/client";

/** Read-only count used by Liftor HQ. Returns null when the table can't be read, so the UI shows "—" instead of guessing. */
export type CountSpec = { table: string; biz?: boolean; eq?: Record<string, unknown>; in?: [string, unknown[]]; gte?: [string, string] };

export async function hqCount(spec: CountSpec, businessId: string | null): Promise<number | null> {
  let q: any = supabase.from(spec.table as never).select("*", { count: "exact", head: true });
  if (spec.biz && businessId) q = q.eq("business_id", businessId);
  for (const [k, v] of Object.entries(spec.eq ?? {})) q = q.eq(k, v);
  if (spec.in) q = q.in(spec.in[0], spec.in[1]);
  if (spec.gte) q = q.gte(spec.gte[0], spec.gte[1]);
  const { count, error } = await q;
  return error ? null : count ?? 0;
}

export type Metric = { label: string; spec: CountSpec; attentionIfAbove?: number; goodIfAbove?: number };

const now = () => new Date().toISOString();

/** 2–3 live numbers per area. `biz: true` means the number follows the business switcher. */
export const areaMetrics: Record<string, Metric[]> = {
  daily: [
    { label: "Open work items", spec: { table: "master_work_items", biz: true, in: ["status", ["new", "active", "blocked", "waiting_approval"]] } },
    { label: "Waiting on you", spec: { table: "master_work_items", biz: true, eq: { status: "waiting_approval" } }, attentionIfAbove: 0 },
    { label: "Blocked", spec: { table: "master_work_items", biz: true, eq: { status: "blocked" } }, attentionIfAbove: 0 },
  ],
  radars: [
    { label: "Contacts in CRM", spec: { table: "contacts" } },
    { label: "Business relationships", spec: { table: "business_contact_relationships", biz: true } },
  ],
  sales: [
    { label: "Deals", spec: { table: "deals", biz: true } },
    { label: "Proposals", spec: { table: "internal_proposals" } },
  ],
  outreach: [
    { label: "Active mailboxes (incl. 20 GHAT)", spec: { table: "gsm_mailboxes", eq: { active: true } }, goodIfAbove: 0 },
    { label: "Campaign drafts", spec: { table: "outreach_campaign_drafts", biz: true } },
    { label: "Upcoming send bookings", spec: { table: "portfolio_send_bookings", biz: true, gte: ["starts_at", now()] } },
  ],
  social: [{ label: "Post drafts", spec: { table: "social_post_drafts", biz: true } }],
  marketing: [{ label: "Campaign drafts", spec: { table: "outreach_campaign_drafts", biz: true } }],
  customers: [
    { label: "Support tickets", spec: { table: "support_tickets", biz: true }, attentionIfAbove: 0 },
    { label: "Privacy requests", spec: { table: "data_privacy_requests", biz: true }, attentionIfAbove: 0 },
  ],
  money: [{ label: "Invoices", spec: { table: "invoices" } }],
  legal: [{ label: "Privacy requests", spec: { table: "data_privacy_requests", biz: true }, attentionIfAbove: 0 }],
  portfolio: [{ label: "Active businesses", spec: { table: "businesses", eq: { portfolio_status: "active" } }, goodIfAbove: 0 }],
  setup: [
    { label: "Manuals uploaded", spec: { table: "business_knowledge_uploads", biz: true }, goodIfAbove: 0 },
    { label: "Apollo records kept", spec: { table: "apollo_contact_intelligence", biz: true } },
  ],
  people: [
    { label: "Suppliers", spec: { table: "suppliers" } },
    { label: "Operator tasks", spec: { table: "human_operator_tasks", biz: true } },
  ],
  ai: [{ label: "AI calls logged", spec: { table: "ai_usage_ledger", biz: true } }],
  platform: [
    { label: "Safety switches ON", spec: { table: "external_action_gates", eq: { enabled: true } }, attentionIfAbove: 0 },
  ],
};

export type AreaStatus = "attention" | "working" | "idle";
export function areaStatus(metrics: Metric[], values: (number | null)[]): AreaStatus {
  if (metrics.some((m, i) => m.attentionIfAbove !== undefined && (values[i] ?? 0) > m.attentionIfAbove)) return "attention";
  if (values.some((v) => (v ?? 0) > 0)) return "working";
  return "idle";
}
