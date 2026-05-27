import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export interface LoadSnapshot {
  id: string; snapshot_at: string; total_open_items: number; founder_only_items: number;
  critical_items: number; noise_items: number; delegated_items: number; deferred_items: number;
  overload_level: string; notes: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface NoiseRule {
  id: string; rule_name: string; match_pattern: string; action: string; reason: string|null;
  active: boolean; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface FocusPriority {
  id: string; title: string; source_module: string; source_ref: string|null; business_name: string|null;
  urgency: number; value: number; risk: number; founder_only: boolean; category: string;
  status: string; rationale: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface FatigueWarning {
  id: string; warning_type: string; detail: string|null; severity: string; status: string;
  recommended_action: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface DelegationItem {
  id: string; title: string; source_module: string; source_ref: string|null;
  recommended_action: string; recommended_owner: string|null; defer_until: string|null;
  status: string; founder_decision: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface NeverHideItem {
  id: string; category: string; reason: string; active: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function latestSnapshot(): Promise<LoadSnapshot|null> {
  const { data } = await sb.from("attention_load_snapshots").select("*").order("snapshot_at",{ascending:false}).limit(1);
  return (data?.[0] ?? null) as LoadSnapshot | null;
}
export async function listNoiseRules(): Promise<NoiseRule[]> {
  const { data } = await sb.from("attention_noise_rules").select("*").order("rule_name").limit(500);
  return (data ?? []) as NoiseRule[];
}
export async function listPriorities(): Promise<FocusPriority[]> {
  const { data } = await sb.from("attention_focus_priorities").select("*").order("created_at",{ascending:false}).limit(1000);
  return (data ?? []) as FocusPriority[];
}
export async function listFatigueWarnings(): Promise<FatigueWarning[]> {
  const { data } = await sb.from("attention_fatigue_warnings").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as FatigueWarning[];
}
export async function listDelegationItems(): Promise<DelegationItem[]> {
  const { data } = await sb.from("attention_delegation_items").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as DelegationItem[];
}
export async function listNeverHide(): Promise<NeverHideItem[]> {
  const { data } = await sb.from("attention_never_hide_items").select("*").order("category").limit(200);
  return (data ?? []) as NeverHideItem[];
}

export function priorityScore(p: FocusPriority): number {
  // Critical never-hide categories pinned to top
  const critical = ["legal","privacy","security","customer","revenue"].includes(p.category);
  const base = p.urgency * 2 + p.value + p.risk * 2 + (p.founder_only ? 2 : 0);
  return base + (critical ? 100 : 0);
}

export function topTen(items: FocusPriority[]): FocusPriority[] {
  return [...items].filter(i => i.status === "open").sort((a,b) => priorityScore(b) - priorityScore(a)).slice(0, 10);
}

export interface AttentionSummary {
  totalOpen: number; founderOnly: number; critical: number; noise: number;
  delegationCandidates: number; deferCandidates: number; openFatigueWarnings: number;
  overloadLevel: string; topTenCount: number; watchItems: string[];
}

export async function summariseAttention(): Promise<AttentionSummary> {
  const [snap, priorities, fatigue, deleg] = await Promise.all([
    latestSnapshot(), listPriorities(), listFatigueWarnings(), listDelegationItems()
  ]);
  const open = priorities.filter(p => p.status === "open");
  const critical = open.filter(p => ["legal","privacy","security","customer","revenue"].includes(p.category) && p.risk >= 4).length;
  const founderOnly = open.filter(p => p.founder_only).length;
  const openFatigue = fatigue.filter(f => f.status === "open").length;
  const watch: string[] = [];
  if (snap?.overload_level && snap.overload_level !== "normal") watch.push(`Overload level: ${snap.overload_level}`);
  if (founderOnly > 12) watch.push(`${founderOnly} founder-only items (target ≤ 12)`);
  if (openFatigue) watch.push(`${openFatigue} open decision-fatigue warning(s)`);
  const delegationCandidates = deleg.filter(d => d.status === "recommended" && d.recommended_action === "delegate").length;
  const deferCandidates = deleg.filter(d => d.status === "recommended" && d.recommended_action === "defer").length;
  if (delegationCandidates) watch.push(`${delegationCandidates} item(s) recommended for delegation`);
  return {
    totalOpen: open.length,
    founderOnly,
    critical,
    noise: snap?.noise_items ?? 0,
    delegationCandidates, deferCandidates,
    openFatigueWarnings: openFatigue,
    overloadLevel: snap?.overload_level ?? "normal",
    topTenCount: Math.min(10, open.length),
    watchItems: watch,
  };
}