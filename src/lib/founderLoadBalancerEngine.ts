import { supabase } from "@/integrations/supabase/client";

export type ApprovalItem = {
  id: string;
  business_id: string | null;
  approval_type: string;
  source_system: string | null;
  agent_key: string | null;
  title: string;
  summary: string | null;
  priority_level: string;
  risk_flags: any[];
  status: string;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  business_id: string | null;
  alert_title: string;
  alert_summary: string | null;
  severity: string;
  status: string;
  founder_action_required: boolean;
  created_at: string;
};

export type UrgencyTier = "critical" | "high" | "normal" | "defer";

export type ScoredItem = {
  id: string;
  kind: "approval" | "notification";
  title: string;
  businessId: string | null;
  agentKey: string | null;
  source: string;
  urgencyScore: number; // 0-100
  tier: UrgencyTier;
  ageMinutes: number;
  batchKey: string;
  canBatch: boolean;
  canDelay: boolean;
};

export type Group = {
  key: string;
  label: string;
  count: number;
  tier: UrgencyTier;
  items: ScoredItem[];
};

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 100, urgent: 90, high: 75, normal: 40, low: 20,
};
const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 100, high: 80, medium: 45, low: 20, info: 10,
};

/** Pure: compute urgency 0-100 from priority + age + risk flags. */
export function urgencyScore(item: ApprovalItem | NotificationItem, kind: "approval" | "notification", now = Date.now()): number {
  const created = new Date(item.created_at).getTime();
  const ageMin = Math.max(0, (now - created) / 60000);
  const base = kind === "approval"
    ? PRIORITY_WEIGHT[(item as ApprovalItem).priority_level] ?? 40
    : SEVERITY_WEIGHT[(item as NotificationItem).severity] ?? 40;
  const ageBoost = Math.min(40, ageMin / 30); // +1 every 30min, cap 40
  const riskBoost = kind === "approval" && Array.isArray((item as ApprovalItem).risk_flags)
    ? Math.min(20, (item as ApprovalItem).risk_flags.length * 5)
    : 0;
  return Math.min(100, Math.round(base + ageBoost + riskBoost));
}

export function tierFromScore(score: number): UrgencyTier {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "normal";
  return "defer";
}

/** Pure: low-risk repetitive actions should batch by (agent + type + business). */
export function makeBatchKey(item: ApprovalItem | NotificationItem, kind: "approval" | "notification"): string {
  if (kind === "approval") {
    const a = item as ApprovalItem;
    return `appr:${a.agent_key ?? "—"}:${a.approval_type}:${a.business_id ?? "—"}`;
  }
  const n = item as NotificationItem;
  return `notif:${n.alert_title}:${n.business_id ?? "—"}`;
}

export function scoreAll(approvals: ApprovalItem[], notifications: NotificationItem[], now = Date.now()): ScoredItem[] {
  const scored: ScoredItem[] = [];
  for (const a of approvals) {
    const s = urgencyScore(a, "approval", now);
    const tier = tierFromScore(s);
    scored.push({
      id: a.id, kind: "approval", title: a.title,
      businessId: a.business_id, agentKey: a.agent_key, source: a.source_system ?? a.approval_type,
      urgencyScore: s, tier,
      ageMinutes: Math.round((now - new Date(a.created_at).getTime()) / 60000),
      batchKey: makeBatchKey(a, "approval"),
      canBatch: tier !== "critical" && (PRIORITY_WEIGHT[a.priority_level] ?? 40) <= 40,
      canDelay: tier === "defer",
    });
  }
  for (const n of notifications) {
    const s = urgencyScore(n, "notification", now);
    const tier = tierFromScore(s);
    scored.push({
      id: n.id, kind: "notification", title: n.alert_title,
      businessId: n.business_id, agentKey: null, source: "notification",
      urgencyScore: s, tier,
      ageMinutes: Math.round((now - new Date(n.created_at).getTime()) / 60000),
      batchKey: makeBatchKey(n, "notification"),
      canBatch: tier !== "critical" && (SEVERITY_WEIGHT[n.severity] ?? 40) <= 45,
      canDelay: tier === "defer",
    });
  }
  return scored.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/** Pure: merge duplicates by batchKey. Critical items always stay singular. */
export function groupItems(scored: ScoredItem[]): Group[] {
  const map = new Map<string, Group>();
  for (const s of scored) {
    const key = s.tier === "critical" ? `${s.batchKey}:${s.id}` : s.batchKey;
    const g = map.get(key) ?? { key, label: s.title, count: 0, tier: s.tier, items: [] };
    g.items.push(s);
    g.count = g.items.length;
    // Group tier = highest-urgency tier present
    if (rankTier(s.tier) > rankTier(g.tier)) g.tier = s.tier;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => rankTier(b.tier) - rankTier(a.tier) || b.count - a.count);
}

function rankTier(t: UrgencyTier): number {
  return t === "critical" ? 4 : t === "high" ? 3 : t === "normal" ? 2 : 1;
}

/** Compute decision-fatigue / load score. 0-100, higher = more loaded. */
export type LoadMetrics = {
  loadScore: number;
  totalItems: number;
  criticalCount: number;
  highCount: number;
  groupedCount: number;
  batchedSavings: number; // how many interruptions saved by batching
  approvalBurstsPerHour: number;
  noisyAgents: Array<{ agentKey: string; count: number }>;
  delegationOpportunities: Array<{ batchKey: string; count: number; reason: string }>;
};

export function computeLoad(scored: ScoredItem[], groups: Group[], now = Date.now()): LoadMetrics {
  const totalItems = scored.length;
  const criticalCount = scored.filter((s) => s.tier === "critical").length;
  const highCount = scored.filter((s) => s.tier === "high").length;
  const groupedCount = groups.length;
  const batchedSavings = Math.max(0, totalItems - groupedCount);

  const lastHour = now - 60 * 60 * 1000;
  const recent = scored.filter((s) => now - s.ageMinutes * 60000 >= lastHour);
  const approvalBurstsPerHour = recent.filter((s) => s.kind === "approval").length;

  const byAgent = new Map<string, number>();
  for (const s of scored) {
    if (!s.agentKey) continue;
    byAgent.set(s.agentKey, (byAgent.get(s.agentKey) ?? 0) + 1);
  }
  const noisyAgents = Array.from(byAgent.entries())
    .map(([agentKey, count]) => ({ agentKey, count }))
    .filter((a) => a.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const delegationOpportunities = groups
    .filter((g) => g.count >= 3 && g.tier !== "critical")
    .map((g) => ({
      batchKey: g.key,
      count: g.count,
      reason: `Repetitive ${g.items[0].kind} from ${g.items[0].agentKey ?? g.items[0].source} — auto-batch or delegate.`,
    }))
    .slice(0, 8);

  // Load = weighted sum normalised
  const raw = criticalCount * 12 + highCount * 5 + totalItems * 0.5 + approvalBurstsPerHour * 2;
  const loadScore = Math.min(100, Math.round(raw));

  return {
    loadScore, totalItems, criticalCount, highCount, groupedCount, batchedSavings,
    approvalBurstsPerHour, noisyAgents, delegationOpportunities,
  };
}

export async function loadFounderAttention(): Promise<{
  scored: ScoredItem[];
  groups: Group[];
  metrics: LoadMetrics;
  generatedAt: string;
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [apprRes, notifRes] = await Promise.all([
    supabase.from("founder_approval_items")
      .select("id,business_id,approval_type,source_system,agent_key,title,summary,priority_level,risk_flags,status,created_at")
      .eq("status", "pending")
      .gte("created_at", since)
      .limit(1000),
    supabase.from("founder_notification_queue")
      .select("id,business_id,alert_title,alert_summary,severity,status,founder_action_required,created_at")
      .in("status", ["unread", "open"])
      .gte("created_at", since)
      .limit(1000),
  ]);
  const approvals = (apprRes.data ?? []) as ApprovalItem[];
  const notifications = (notifRes.data ?? []) as NotificationItem[];
  const scored = scoreAll(approvals, notifications);
  const groups = groupItems(scored);
  const metrics = computeLoad(scored, groups);
  return { scored, groups, metrics, generatedAt: new Date().toISOString() };
}

export const TIER_CLS: Record<UrgencyTier, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  normal: "text-foreground border-border",
  defer: "text-muted-foreground border-border bg-muted/10",
};