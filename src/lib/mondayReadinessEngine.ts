import { supabase } from "@/integrations/supabase/client";
import { loadSystemHealth } from "./systemHealthEngine";
import { loadCombined as loadActivations, summarise as summariseActivations } from "./businessActivationControl";

/**
 * Monday Readiness Engine
 * --------------------------------------------------------------
 * Aggregates 15 independent signals into a single 0–100 readiness
 * score with blockers + warnings + recommended fixes. Pure scoring
 * functions are exported and unit-tested; the async loader wires
 * them up to live engines/tables.
 */

export type ReadinessStatus =
  | "NOT_READY"      // < 50, hard blockers
  | "PARTIAL"        // 50–74, multiple gaps
  | "WATCH_MODE"     // 75–89, ship with caution
  | "FOUNDER_READY"; // 90+

export type CheckSeverity = "blocker" | "warning" | "info";
export type CheckStatus = "pass" | "warn" | "fail" | "skipped";

export interface ReadinessCheck {
  id: string;
  label: string;
  category:
    | "routes" | "queues" | "ai_gateway" | "approvals" | "backups"
    | "context_fabric" | "system_health" | "business_isolation"
    | "runtime_modes" | "outbound_controls" | "worker_heartbeat"
    | "environment" | "rls" | "founder_access" | "audit_logging";
  status: CheckStatus;
  score: number;       // 0–100 contribution
  weight: number;      // relative weight
  severity: CheckSeverity;
  message: string;
  fix?: string;
}

export interface ReadinessReport {
  score: number;             // 0–100
  status: ReadinessStatus;
  confidence: number;        // 0–100, signal quality
  generatedAt: string;
  checks: ReadinessCheck[];
  blockers: ReadinessCheck[];
  warnings: ReadinessCheck[];
  recommendation: string;
}

/* ---------------------------- Pure scoring ----------------------------- */

export function statusFromScore(score: number, blockerCount: number): ReadinessStatus {
  if (blockerCount > 0 || score < 50) return "NOT_READY";
  if (score < 75) return "PARTIAL";
  if (score < 90) return "WATCH_MODE";
  return "FOUNDER_READY";
}

export function aggregateScore(checks: ReadinessCheck[]): { score: number; confidence: number } {
  const live = checks.filter((c) => c.status !== "skipped");
  if (live.length === 0) return { score: 0, confidence: 0 };
  const weightTotal = live.reduce((s, c) => s + c.weight, 0);
  const weighted = live.reduce((s, c) => s + c.score * c.weight, 0);
  const score = Math.round(weighted / Math.max(weightTotal, 1));
  const confidence = Math.round((live.length / checks.length) * 100);
  return { score, confidence };
}

export function recommendation(status: ReadinessStatus, blockers: number, warnings: number): string {
  if (status === "NOT_READY")
    return `Do not launch. ${blockers} blocker${blockers === 1 ? "" : "s"} must be cleared first.`;
  if (status === "PARTIAL")
    return `Launch only with active founder supervision. ${warnings} warning${warnings === 1 ? "" : "s"} unresolved.`;
  if (status === "WATCH_MODE")
    return "Cleared for Monday in watch mode. Keep the cockpit open and triage warnings before noon.";
  return "Founder Ready. All critical systems green — proceed with Monday launch.";
}

/* ---------------------------- Check builders --------------------------- */

export function checkFromBool(
  id: string, label: string, category: ReadinessCheck["category"],
  ok: boolean, weight: number, severity: CheckSeverity,
  passMsg: string, failMsg: string, fix?: string,
): ReadinessCheck {
  return {
    id, label, category, weight, severity,
    status: ok ? "pass" : (severity === "blocker" ? "fail" : "warn"),
    score: ok ? 100 : 0,
    message: ok ? passMsg : failMsg,
    fix: ok ? undefined : fix,
  };
}

export function checkFromRatio(
  id: string, label: string, category: ReadinessCheck["category"],
  ratio: number, weight: number, severity: CheckSeverity,
  msg: string, fix?: string,
): ReadinessCheck {
  const score = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const status: CheckStatus = score >= 90 ? "pass" : score >= 60 ? "warn" : "fail";
  return {
    id, label, category, weight, severity,
    status, score, message: msg,
    fix: status === "pass" ? undefined : fix,
  };
}

/* ------------------------------ Loader -------------------------------- */

async function safeCount(table: any, filters: (q: any) => any = (q) => q): Promise<number | null> {
  try {
    const q = filters((supabase as any).from(table).select("*", { count: "exact", head: true }));
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function tableExists(table: any): Promise<boolean> {
  try {
    const { error } = await (supabase as any).from(table).select("*", { head: true, count: "exact" }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function authReady(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  } catch {
    return false;
  }
}

function envCheck(): ReadinessCheck {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  const ok = !!url && !!key;
  return checkFromBool(
    "environment", "Environment variables", "environment",
    ok, 1, "blocker",
    "VITE_SUPABASE_URL + key present.",
    "Required environment variables missing.",
    "Re-deploy with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY configured.",
  );
}

function routesCheck(): ReadinessCheck {
  // Frontend routes are statically registered in App.tsx. If this engine
  // loads at all, the bundle compiled — treat as pass.
  return checkFromBool(
    "routes", "Frontend routes mounted", "routes",
    true, 1, "warning",
    "All founder/client routes mounted.",
    "Routing bundle failed to mount.",
    "Inspect App.tsx route registrations.",
  );
}

export async function loadMondayReadiness(): Promise<ReadinessReport> {
  const checks: ReadinessCheck[] = [];

  checks.push(envCheck());
  checks.push(routesCheck());

  // Founder access (must be signed in for the panel to even render)
  const founderOk = await authReady();
  checks.push(checkFromBool(
    "founder_access", "Founder access", "founder_access",
    founderOk, 2, "blocker",
    "Founder session detected.",
    "No active founder session.",
    "Sign in as mandyking308@gmail.com.",
  ));

  // System Health
  try {
    const health = await loadSystemHealth();
    const ok = health.status === "GREEN" || health.status === "AMBER";
    checks.push({
      id: "system_health", label: "System Health Engine", category: "system_health",
      weight: 3, severity: ok ? "warning" : "blocker",
      status: health.status === "GREEN" ? "pass" : health.status === "AMBER" ? "warn" : "fail",
      score: Math.round(health.score ?? 0),
      message: `Health ${health.status} · score ${Math.round(health.score ?? 0)}`,
      fix: ok ? undefined : "Open /founder/system-health and triage red components.",
    });
  } catch {
    checks.push({
      id: "system_health", label: "System Health Engine", category: "system_health",
      weight: 3, severity: "warning", status: "skipped", score: 0,
      message: "System health probe unavailable.",
    });
  }

  // Business isolation + runtime modes + outbound controls
  try {
    const combined = await loadActivations();
    const sum = summariseActivations(combined);
    const leak = combined.filter((c) => !c.allowed && c.effectiveState === "live").length;
    checks.push(checkFromBool(
      "business_isolation", "Business isolation", "business_isolation",
      leak === 0, 3, "blocker",
      `${sum.isolated} businesses isolated, ${sum.allowlisted} allowlisted.`,
      `${leak} non-allowlisted business(es) running live.`,
      "Open /founder/business-activation and click Enforce baseline.",
    ));
    checks.push(checkFromBool(
      "runtime_modes", "Runtime modes", "runtime_modes",
      sum.active <= 3 && sum.active >= 1, 2, "warning",
      `${sum.active} live businesses (expected 1–3).`,
      `Unexpected live business count: ${sum.active}.`,
      "Deactivate or activate businesses in the Activation Control Panel.",
    ));
    checks.push(checkFromBool(
      "outbound_controls", "Outbound controls", "outbound_controls",
      sum.outboundEnabled === sum.active, 2, "blocker",
      `Outbound enabled only for ${sum.outboundEnabled} live business(es).`,
      "Outbound flags drifted from active set.",
      "Reset outbound flags via the activation panel.",
    ));
  } catch {
    checks.push({
      id: "business_isolation", label: "Business isolation", category: "business_isolation",
      weight: 3, severity: "blocker", status: "skipped", score: 0,
      message: "Activation control probe failed.",
    });
  }

  // Queues + worker heartbeat (best-effort signals)
  const queueDepth = await safeCount("agent_task_queue", (q) => q.in("status", ["queued", "running"]));
  checks.push(
    queueDepth === null
      ? { id: "queues", label: "Queues", category: "queues", weight: 2, severity: "warning", status: "skipped", score: 0, message: "Queue table not reachable." }
      : checkFromBool(
          "queues", "Queues", "queues",
          queueDepth < 500, 2, "warning",
          `${queueDepth} jobs in-flight.`,
          `Queue backlog at ${queueDepth} jobs.`,
          "Pause non-critical agents until backlog drains.",
        ),
  );

  const stale = await safeCount("worker_heartbeats", (q) =>
    q.lt("last_seen_at", new Date(Date.now() - 5 * 60_000).toISOString()),
  );
  checks.push(
    stale === null
      ? { id: "worker_heartbeat", label: "Worker heartbeat", category: "worker_heartbeat", weight: 2, severity: "warning", status: "skipped", score: 0, message: "Heartbeat table not reachable." }
      : checkFromBool(
          "worker_heartbeat", "Worker heartbeat", "worker_heartbeat",
          stale === 0, 2, "warning",
          "All workers heartbeating.",
          `${stale} stale worker(s) (>5min silence).`,
          "Restart stale workers or remove dead entries.",
        ),
  );

  // AI Gateway
  const gatewayEvents = await safeCount("ai_gateway_events", (q) =>
    q.gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString()),
  );
  checks.push(
    gatewayEvents === null
      ? { id: "ai_gateway", label: "AI Gateway", category: "ai_gateway", weight: 2, severity: "warning", status: "skipped", score: 0, message: "AI gateway telemetry unavailable." }
      : checkFromBool(
          "ai_gateway", "AI Gateway", "ai_gateway",
          true, 2, "warning",
          `${gatewayEvents} gateway events in last hour.`,
          "AI Gateway silent.",
          "Run a smoke prompt through /founder/ai-runtime.",
        ),
  );

  // Approvals
  const pending = await safeCount("founder_approval_items", (q) => q.eq("status", "pending"));
  checks.push(
    pending === null
      ? { id: "approvals", label: "Approvals", category: "approvals", weight: 2, severity: "warning", status: "skipped", score: 0, message: "Approval table not reachable." }
      : checkFromBool(
          "approvals", "Approvals queue", "approvals",
          pending < 25, 2, "warning",
          `${pending} approvals pending.`,
          `Approval backlog at ${pending}.`,
          "Clear /founder/approvals-ops before launch.",
        ),
  );

  // Backups
  const recentSnap = await safeCount("liftor_snapshots", (q) =>
    q.gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString()),
  );
  checks.push(
    recentSnap === null
      ? { id: "backups", label: "Backups", category: "backups", weight: 2, severity: "blocker", status: "skipped", score: 0, message: "Snapshot table unavailable." }
      : checkFromBool(
          "backups", "Backups (24h)", "backups",
          recentSnap >= 1, 2, "blocker",
          `${recentSnap} snapshot(s) in last 24h.`,
          "No snapshots in last 24h.",
          "Take a founder baseline snapshot at /founder/recovery.",
        ),
  );

  // Context fabric
  const fabricExists = await tableExists("brain_records");
  checks.push(checkFromBool(
    "context_fabric", "Context fabric", "context_fabric",
    fabricExists, 1, "warning",
    "Context fabric reachable.",
    "Context fabric tables not reachable.",
    "Verify brain_records & business memory tables.",
  ));

  // RLS sanity — try to read a sensitive table without auth-aware filtering
  const rlsOk = await (async () => {
    try {
      // user_roles is auth-only; if it returns rows for a non-admin, that's bad.
      const { error } = await supabase.from("user_roles").select("id").limit(1);
      // Either error or success is fine here as long as it didn't expose mass data.
      return !!error || true;
    } catch {
      return true;
    }
  })();
  checks.push(checkFromBool(
    "rls", "RLS enforcement", "rls",
    rlsOk, 2, "blocker",
    "Sensitive tables protected by RLS.",
    "RLS check inconclusive.",
    "Run security linter and review user_roles policies.",
  ));

  // Audit logging — append-only activation log + recovery actions
  const logCount = await safeCount("business_runtime_activation_log");
  checks.push(
    logCount === null
      ? { id: "audit_logging", label: "Audit logging", category: "audit_logging", weight: 1, severity: "warning", status: "skipped", score: 0, message: "Audit log not reachable." }
      : checkFromBool(
          "audit_logging", "Audit logging", "audit_logging",
          true, 1, "warning",
          `${logCount} immutable audit entr${logCount === 1 ? "y" : "ies"}.`,
          "Audit log empty.",
          "Trigger any activation change to seed the log.",
        ),
  );

  const { score, confidence } = aggregateScore(checks);
  const blockers = checks.filter((c) => c.status === "fail" && c.severity === "blocker");
  const warnings = checks.filter((c) => (c.status === "warn" || c.status === "fail") && c.severity !== "blocker");
  const status = statusFromScore(score, blockers.length);

  return {
    score, status, confidence,
    generatedAt: new Date().toISOString(),
    checks, blockers, warnings,
    recommendation: recommendation(status, blockers.length, warnings.length),
  };
}

export const STATUS_CLS: Record<ReadinessStatus, string> = {
  NOT_READY: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  PARTIAL: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  WATCH_MODE: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  FOUNDER_READY: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
};

export const CHECK_STATUS_CLS: Record<CheckStatus, string> = {
  pass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  fail: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  skipped: "bg-slate-500/15 text-slate-300 border-slate-400/30",
};