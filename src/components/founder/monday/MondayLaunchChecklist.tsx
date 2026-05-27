import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, ShieldCheck, Pause, Lock, ShieldAlert, Activity,
  Eye, Power, RefreshCw, Loader2,
} from "lucide-react";
import {
  fetchRuntimeState, setRuntimeMode, type RuntimeState, type SystemMode,
  MODE_BEHAVIOR,
} from "@/lib/systemModeEngine";
import {
  loadCombined, summarise, enforceMondaySafeBaseline, activateBusiness,
  type CombinedBusiness, type ActivationSummary,
} from "@/lib/businessActivationControl";
import { loadMondayReadiness, type ReadinessReport } from "@/lib/mondayReadinessEngine";

type Loading = "idle" | "switching" | "activating" | "baseline" | "emergency" | "recovery" | "approval";

export default function MondayLaunchChecklist() {
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [combined, setCombined] = useState<CombinedBusiness[]>([]);
  const [summary, setSummary] = useState<ActivationSummary | null>(null);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState<Loading>("idle");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [rs, combinedRows, rep] = await Promise.all([
        fetchRuntimeState().catch(() => null),
        loadCombined().catch(() => []),
        loadMondayReadiness().catch(() => null),
      ]);
      setRuntime(rs);
      setCombined(combinedRows);
      setSummary(summarise(combinedRows));
      setReport(rep);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const switchMode = async (mode: SystemMode, label: Loading, reason: string) => {
    setLoading(label);
    const res = await setRuntimeMode(mode, reason);
    setLoading("idle");
    if (!res.ok) {
      toast({ title: "Mode change failed", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: `Mode → ${MODE_BEHAVIOR[mode].label}`, description: reason });
    await refresh();
  };

  const activateAllowlist = async () => {
    setLoading("activating");
    let activated = 0; let skipped = 0;
    for (const c of combined) {
      if (!c.allowed) continue;
      if (c.effectiveState === "live") { skipped += 1; continue; }
      const res = await activateBusiness(c, { reason: "monday_launch_checklist" });
      if (res.ok) activated += 1;
    }
    setLoading("idle");
    toast({ title: "Activation complete", description: `Activated ${activated}, already live: ${skipped}.` });
    await refresh();
  };

  const enforceBaseline = async () => {
    setLoading("baseline");
    const res = await enforceMondaySafeBaseline();
    setLoading("idle");
    if (!res.ok) {
      toast({ title: "Baseline enforcement failed", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Baseline enforced", description: `Isolated ${res.isolated} non-allowlisted business(es).` });
    await refresh();
  };

  const mode: SystemMode = runtime?.mode ?? "LIVE_INTERNAL_TEST";
  const behavior = MODE_BEHAVIOR[mode];
  const inMondayWatch = mode === "MONDAY_WATCH";
  const activeCount = summary?.active ?? 0;
  const allowlisted = summary?.allowlisted ?? 0;
  const blockedCount = (summary?.isolated ?? 0) + (summary?.quarantined ?? 0);
  const health = report?.score ?? 0;
  const blockers = report?.blockers.length ?? 0;
  const warnings = report?.warnings.length ?? 0;
  const founderLoad = report?.confidence ?? 0;

  const classification =
    blockers > 0 || activeCount === 0
      ? { label: "HOLD LAUNCH", tone: "destructive" as const, final: "NO GO" }
      : warnings > 0 || !inMondayWatch
        ? { label: "SAFE WITH WATCH ITEMS", tone: "secondary" as const, final: "GO WITH WATCH" }
        : { label: "SAFE TO OPERATE", tone: "default" as const, final: "GO" };

  return (
    <div className="space-y-6">
      {/* Header / classification */}
      <Card className="tech-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Monday Launch Status</div>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <Badge variant={classification.tone} className="text-sm px-3 py-1">{classification.label}</Badge>
              <Badge variant="outline" className="text-xs">Runtime: {behavior.label}</Badge>
              <Badge variant="outline" className="text-xs">Final: {classification.final}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{behavior.summary}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="animate-spin mr-2" size={14} /> : <RefreshCw className="mr-2" size={14} />}
            Refresh
          </Button>
        </div>
      </Card>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Active businesses" value={`${activeCount} / ${allowlisted}`} tone={activeCount > 0 ? "ok" : "warn"} />
        <Metric label="Blocked businesses" value={blockedCount} tone={blockedCount > 0 ? "ok" : "info"} />
        <Metric label="Health score" value={`${health}`} tone={health >= 90 ? "ok" : health >= 75 ? "warn" : "danger"} />
        <Metric label="Blockers / Warnings" value={`${blockers} / ${warnings}`} tone={blockers > 0 ? "danger" : warnings > 0 ? "warn" : "ok"} />
        <Metric label="Approval queue" value={pendingApprovalsLabel(report)} tone="info" />
        <Metric label="Failed jobs (signal)" value={failedJobsLabel(report)} tone="info" />
        <Metric label="Founder load (confidence)" value={`${founderLoad}%`} tone={founderLoad >= 80 ? "ok" : "warn"} />
        <Metric label="Mode" value={behavior.label} tone={mode === "EMERGENCY_PAUSE" || mode === "READ_ONLY_RECOVERY" ? "danger" : mode === "MONDAY_WATCH" ? "warn" : "info"} />
      </div>

      {/* Primary launch actions */}
      <Card className="tech-card p-5 space-y-3">
        <div className="flex items-center gap-2"><ShieldCheck className="text-primary" size={16} /><h3 className="font-semibold text-sm">Launch actions</h3></div>
        <p className="text-xs text-muted-foreground">Run these in order. Each action is logged to the immutable runtime ledger.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={loading !== "idle" || inMondayWatch}
            onClick={() => switchMode("MONDAY_WATCH", "switching", "Monday launch — supervised live operation")}
          >
            {loading === "switching" && <Loader2 className="animate-spin mr-2" size={14} />}
            <Eye className="mr-2" size={14} />
            {inMondayWatch ? "Already in MONDAY_WATCH" : "Switch → MONDAY_WATCH"}
          </Button>
          <Button size="sm" variant="outline" disabled={loading !== "idle"} onClick={activateAllowlist}>
            {loading === "activating" && <Loader2 className="animate-spin mr-2" size={14} />}
            <Power className="mr-2" size={14} />
            Activate NeonCandy + ServiceOpsDemo + InternalOps
          </Button>
          <Button size="sm" variant="outline" disabled={loading !== "idle"} onClick={enforceBaseline}>
            {loading === "baseline" && <Loader2 className="animate-spin mr-2" size={14} />}
            <ShieldCheck className="mr-2" size={14} />
            Enforce isolation baseline
          </Button>
        </div>
      </Card>

      {/* Emergency controls */}
      <Card className="tech-card p-5 space-y-3 border-rose-500/30">
        <div className="flex items-center gap-2"><ShieldAlert className="text-rose-400" size={16} /><h3 className="font-semibold text-sm">Emergency controls</h3></div>
        <p className="text-xs text-muted-foreground">
          Each button transitions the entire runtime atomically and is recorded in <code>system_mode_ledger</code>.
          Use only when supervision indicates a real incident.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <DangerButton
            icon={<Pause size={14} />}
            label="Emergency stop (freeze queues + outbound)"
            mode="EMERGENCY_PAUSE"
            loading={loading === "emergency"}
            disabled={loading !== "idle" || mode === "EMERGENCY_PAUSE"}
            onClick={() => switchMode("EMERGENCY_PAUSE", "emergency", "Founder emergency stop")}
          />
          <DangerButton
            icon={<Lock size={14} />}
            label="Read-only recovery (disable all writes)"
            mode="READ_ONLY_RECOVERY"
            loading={loading === "recovery"}
            disabled={loading !== "idle" || mode === "READ_ONLY_RECOVERY"}
            onClick={() => switchMode("READ_ONLY_RECOVERY", "recovery", "Founder read-only recovery")}
          />
          <DangerButton
            icon={<AlertTriangle size={14} />}
            label="Pause outbound only (approval-gated)"
            mode="APPROVAL_REQUIRED"
            loading={loading === "approval"}
            disabled={loading !== "idle" || mode === "APPROVAL_REQUIRED"}
            onClick={() => switchMode("APPROVAL_REQUIRED", "approval", "Founder paused outbound — approval gate")}
          />
          <DangerButton
            icon={<Activity size={14} />}
            label="Resume MONDAY_WATCH supervision"
            mode="MONDAY_WATCH"
            loading={loading === "switching"}
            disabled={loading !== "idle" || mode === "MONDAY_WATCH"}
            onClick={() => switchMode("MONDAY_WATCH", "switching", "Resume supervised live operation")}
          />
        </div>
      </Card>

      {/* Business list */}
      <Card className="tech-card p-5 space-y-3">
        <div className="flex items-center gap-2"><Power className="text-primary" size={16} /><h3 className="font-semibold text-sm">Business activation snapshot</h3></div>
        {combined.length === 0 ? (
          <p className="text-xs text-muted-foreground">No business rows visible to this session.</p>
        ) : (
          <ul className="space-y-1">
            {combined.map((c) => (
              <li key={c.business.id} className="flex items-center justify-between text-xs border-b border-border/30 last:border-0 py-1.5">
                <span className="truncate">{c.business.name}</span>
                <span className="flex items-center gap-2">
                  {c.allowed
                    ? <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-400/30">allowlisted</Badge>
                    : <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-300 border-slate-400/30">not allowlisted</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">{c.effectiveState}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Readiness blockers / warnings */}
      {report && (
        <Card className="tech-card p-5 space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="text-primary" size={16} /><h3 className="font-semibold text-sm">Readiness blockers &amp; warnings</h3></div>
          {report.blockers.length === 0 && report.warnings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No blockers or warnings reported by the readiness engine.</p>
          ) : (
            <div className="space-y-2">
              {report.blockers.map((b) => (
                <Row key={b.id} tone="danger" label={b.label} message={b.message} fix={b.fix} />
              ))}
              {report.warnings.map((w) => (
                <Row key={w.id} tone="warn" label={w.label} message={w.message} fix={w.fix} />
              ))}
            </div>
          )}
          <Separator />
          <p className="text-[11px] text-muted-foreground">
            Recommendation: {report.recommendation}
          </p>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "ok" | "warn" | "danger" | "info" }) {
  const cls =
    tone === "ok" ? "text-emerald-300" :
    tone === "warn" ? "text-amber-300" :
    tone === "danger" ? "text-rose-300" : "text-foreground";
  return (
    <Card className="tech-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cls}`}>{value}</div>
    </Card>
  );
}

function DangerButton(props: {
  icon: React.ReactNode; label: string; mode: SystemMode;
  loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="justify-start text-xs border-rose-500/30 hover:bg-rose-500/10"
      disabled={props.disabled}
      onClick={() => {
        if (window.confirm(`Confirm transition → ${MODE_BEHAVIOR[props.mode].label}?\n\n${MODE_BEHAVIOR[props.mode].summary}`)) {
          props.onClick();
        }
      }}
    >
      {props.loading ? <Loader2 className="animate-spin mr-2" size={14} /> : <span className="mr-2">{props.icon}</span>}
      {props.label}
    </Button>
  );
}

function Row({ tone, label, message, fix }: { tone: "danger" | "warn"; label: string; message: string; fix?: string }) {
  const border = tone === "danger" ? "border-rose-500/30" : "border-amber-500/30";
  const text = tone === "danger" ? "text-rose-300" : "text-amber-300";
  return (
    <div className={`border ${border} rounded p-2 text-xs`}>
      <div className={`font-medium ${text}`}>{label}</div>
      <div className="text-muted-foreground mt-0.5">{message}</div>
      {fix && <div className="text-muted-foreground mt-1">→ {fix}</div>}
    </div>
  );
}

function pendingApprovalsLabel(r: ReadinessReport | null): string {
  if (!r) return "—";
  const c = r.checks.find((x) => x.category === "approvals");
  if (!c || c.status === "skipped") return "—";
  const m = c.message.match(/(\d+)/);
  return m ? m[1] : c.message;
}
function failedJobsLabel(r: ReadinessReport | null): string {
  if (!r) return "—";
  const c = r.checks.find((x) => x.category === "queues");
  if (!c || c.status === "skipped") return "—";
  const m = c.message.match(/(\d+)/);
  return m ? m[1] : c.message;
}