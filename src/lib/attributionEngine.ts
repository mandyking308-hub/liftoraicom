import { supabase } from "@/integrations/supabase/client";

export type SourceType =
  | "organic" | "outbound" | "social" | "referral" | "paid" | "partner"
  | "marketplace" | "direct" | "email" | "call" | "event" | "unknown";

export type EventType =
  | "visit" | "lead" | "call" | "email_reply" | "proposal" | "sale" | "upgrade" | "renewal" | "referral";

export type ModelType = "first_touch" | "last_touch" | "linear" | "manual" | "ai_assisted";

export const SOURCE_TYPE_META: Record<SourceType, { cls: string }> = {
  organic: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  outbound: { cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  social: { cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  referral: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paid: { cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  partner: { cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  marketplace: { cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  direct: { cls: "bg-muted text-muted-foreground border-border/50" },
  email: { cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  call: { cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  event: { cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  unknown: { cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export type AttributionSource = {
  id: string; business_id: string; source_name: string; source_type: SourceType;
  channel_id: string | null; active: boolean; created_at: string; updated_at: string;
};
export type AttributionEvent = {
  id: string; business_id: string; contact_id: string | null; deal_id: string | null;
  revenue_record_id: string | null; event_type: EventType; source_id: string | null;
  campaign_id: string | null; touchpoint_order: number | null;
  value_amount: number | null; currency: string | null;
  audit_metadata: Record<string, unknown> | null; created_at: string;
};
export type AttributionModel = {
  id: string; business_id: string; model_name: string; model_type: ModelType;
  active: boolean; created_at: string; updated_at: string;
};

const sb = () => supabase as any;

export async function fetchSources(): Promise<AttributionSource[]> {
  const { data, error } = await sb().from("attribution_sources").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchEvents(): Promise<AttributionEvent[]> {
  const { data, error } = await sb().from("attribution_events").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) throw error; return data ?? [];
}
export async function fetchModels(): Promise<AttributionModel[]> {
  const { data, error } = await sb().from("attribution_models").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export function summarize(sources: AttributionSource[], events: AttributionEvent[], models: AttributionModel[]) {
  const businessIds = new Set(events.map(e => e.business_id));
  const unknown = events.filter(e => !e.source_id).length;
  const leads = events.filter(e => e.event_type === "lead").length;
  const sales = events.filter(e => e.event_type === "sale");
  const revenue = sales.reduce((s, e) => s + (e.value_amount ?? 0), 0);
  return {
    sources_total: sources.length,
    sources_active: sources.filter(s => s.active).length,
    events_total: events.length,
    businesses_tracked: businessIds.size,
    unknown_events: unknown,
    unknown_pct: events.length ? (unknown / events.length) * 100 : 0,
    leads,
    sales: sales.length,
    revenue,
    models_total: models.length,
    models_active: models.filter(m => m.active).length,
  };
}

/** Aggregate revenue + counts by source. */
export function bySource(sources: AttributionSource[], events: AttributionEvent[]) {
  const map = new Map<string, { source: AttributionSource | null; leads: number; sales: number; revenue: number; events: number }>();
  const ensure = (key: string, source: AttributionSource | null) => {
    if (!map.has(key)) map.set(key, { source, leads: 0, sales: 0, revenue: 0, events: 0 });
    return map.get(key)!;
  };
  const sourceById = new Map(sources.map(s => [s.id, s]));
  for (const e of events) {
    const key = e.source_id ?? "__unknown__";
    const row = ensure(key, e.source_id ? sourceById.get(e.source_id) ?? null : null);
    row.events++;
    if (e.event_type === "lead") row.leads++;
    if (e.event_type === "sale") { row.sales++; row.revenue += e.value_amount ?? 0; }
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue || b.events - a.events);
}

/** Aggregate by campaign id. */
export function byCampaign(events: AttributionEvent[]) {
  const map = new Map<string, { campaign_id: string | null; leads: number; sales: number; revenue: number; events: number }>();
  const ensure = (k: string) => {
    if (!map.has(k)) map.set(k, { campaign_id: k === "__none__" ? null : k, leads: 0, sales: 0, revenue: 0, events: 0 });
    return map.get(k)!;
  };
  for (const e of events) {
    const key = e.campaign_id ?? "__none__";
    const r = ensure(key);
    r.events++;
    if (e.event_type === "lead") r.leads++;
    if (e.event_type === "sale") { r.sales++; r.revenue += e.value_amount ?? 0; }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** Funnel counts. */
export function funnel(events: AttributionEvent[]) {
  const counts: Record<EventType, number> = {
    visit: 0, lead: 0, call: 0, email_reply: 0, proposal: 0, sale: 0, upgrade: 0, renewal: 0, referral: 0,
  };
  for (const e of events) counts[e.event_type]++;
  const order: EventType[] = ["visit", "lead", "call", "email_reply", "proposal", "sale", "upgrade", "renewal"];
  return order.map(t => ({ stage: t, count: counts[t] }));
}

/** Aggregate revenue by business with confirmed (sale event) vs estimated (proposal). */
export function revenueByBusiness(events: AttributionEvent[]) {
  const m = new Map<string, { business_id: string; confirmed: number; estimated: number; sales: number; proposals: number }>();
  const ensure = (bid: string) => {
    if (!m.has(bid)) m.set(bid, { business_id: bid, confirmed: 0, estimated: 0, sales: 0, proposals: 0 });
    return m.get(bid)!;
  };
  for (const e of events) {
    const r = ensure(e.business_id);
    if (e.event_type === "sale" || e.event_type === "upgrade" || e.event_type === "renewal") {
      r.confirmed += e.value_amount ?? 0;
      r.sales++;
    } else if (e.event_type === "proposal") {
      r.estimated += e.value_amount ?? 0;
      r.proposals++;
    }
  }
  return Array.from(m.values()).sort((a, b) => b.confirmed - a.confirmed);
}

export type Diagnostic = {
  id: string;
  severity: "info" | "warn" | "block";
  business_id: string | null;
  message: string;
};

/**
 * Diagnostics:
 * - unknown source % too high → warn
 * - business has events but no sources defined → warn
 * - business has no active attribution model → warn
 * - top source identified → info recommendation
 */
export function diagnose(
  sources: AttributionSource[],
  events: AttributionEvent[],
  models: AttributionModel[],
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const sum = summarize(sources, events, models);
  if (events.length > 0 && sum.unknown_pct > 25) {
    out.push({ id: "unknown_pct", severity: sum.unknown_pct > 50 ? "block" : "warn",
      business_id: null,
      message: `${sum.unknown_pct.toFixed(1)}% of events have unknown source — improve tagging.` });
  }
  const evByBusiness = new Map<string, number>();
  for (const e of events) evByBusiness.set(e.business_id, (evByBusiness.get(e.business_id) ?? 0) + 1);
  const srcBusinesses = new Set(sources.map(s => s.business_id));
  for (const [bid, count] of evByBusiness) {
    if (!srcBusinesses.has(bid)) {
      out.push({ id: `no_src_${bid}`, severity: "warn", business_id: bid,
        message: `Business has ${count} events but no attribution sources defined.` });
    }
  }
  const modelByBusiness = new Map<string, AttributionModel[]>();
  for (const m of models) {
    const a = modelByBusiness.get(m.business_id) ?? [];
    a.push(m); modelByBusiness.set(m.business_id, a);
  }
  for (const bid of evByBusiness.keys()) {
    const list = modelByBusiness.get(bid) ?? [];
    if (!list.some(m => m.active)) {
      out.push({ id: `no_model_${bid}`, severity: "info", business_id: bid,
        message: `No active attribution model — defaulting to last-touch.` });
    }
  }
  const ranked = bySource(sources, events).filter(r => r.source);
  if (ranked.length > 0 && ranked[0].revenue > 0) {
    out.push({ id: `top_src`, severity: "info", business_id: ranked[0].source!.business_id,
      message: `Top revenue source: "${ranked[0].source!.source_name}" — consider reallocating more channel effort here.` });
  }
  return out;
}