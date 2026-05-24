import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateReadinessChecks,
  deriveAutomaticStatus,
  saveEvaluation,
  loadReadiness,
  confirmFounderChecklist,
  buildReadinessReport,
  FOUNDER_CHECKLIST_ITEMS,
  type CheckResult,
  type ReadinessStatus,
} from "@/services/aiGoLiveReadiness";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Loader2, Download, RefreshCw } from "lucide-react";

const STATUS_LABEL: Record<ReadinessStatus, string> = {
  not_ready: "Not Ready",
  ready_for_simulation_only: "Ready for Simulation Only",
  ready_for_controlled_internal_use: "Ready for Controlled Internal Use",
  ready_for_limited_live_use: "Ready for Limited Live Use",
  ready_for_scale: "Ready for Scale",
};

const STATUS_ORDER: ReadinessStatus[] = [
  "not_ready",
  "ready_for_simulation_only",
  "ready_for_controlled_internal_use",
  "ready_for_limited_live_use",
  "ready_for_scale",
];

function statusVariant(s: CheckResult["status"]) {
  if (s === "pass") return "default" as const;
  if (s === "warn") return "secondary" as const;
  return "destructive" as const;
}

function StatusIcon({ s }: { s: CheckResult["status"] }) {
  if (s === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="Pass" />;
  if (s === "warn") return <AlertTriangle className="w-4 h-4 text-amber-400" aria-label="Warning" />;
  return <XCircle className="w-4 h-4 text-rose-400" aria-label="Fail" />;
}

export default function AIGoLiveReadiness() {
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [persisted, setPersisted] = useState<any>(null);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  const derived = useMemo(() => (checks.length ? deriveAutomaticStatus(checks) : null), [checks]);

  async function load() {
    setLoading(true);
    try {
      const row = await loadReadiness();
      setPersisted(row);
      if (row?.evaluation_results && Array.isArray(row.evaluation_results)) {
        setChecks(row.evaluation_results as CheckResult[]);
      }
      if (row?.founder_confirmations && typeof row.founder_confirmations === "object") {
        setConfirmations(row.founder_confirmations as Record<string, boolean>);
      }
    } catch (e: any) {
      toast({ title: "Failed to load readiness", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function reEvaluate() {
    setEvaluating(true);
    try {
      const next = await evaluateReadinessChecks();
      setChecks(next);
      const auto = deriveAutomaticStatus(next);
      // Persist automatic status but never auto-promote past controlled_internal_use.
      await saveEvaluation({ checks: next, status: auto.status, notes: notes || undefined });
      await load();
      toast({ title: "Readiness re-evaluated", description: auto.reason });
    } catch (e: any) {
      toast({ title: "Evaluation failed", description: e.message, variant: "destructive" });
    } finally {
      setEvaluating(false);
    }
  }

  async function confirmControlled() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated.");
      if (!derived || derived.status === "not_ready") {
        throw new Error("Cannot confirm — blocking checks must pass first.");
      }
      await confirmFounderChecklist({
        confirmations,
        user_id: u.user.id,
        target_status: "ready_for_controlled_internal_use",
      });
      await load();
      toast({ title: "Controlled internal use recorded" });
    } catch (e: any) {
      toast({ title: "Cannot confirm", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function escalate(target: "ready_for_limited_live_use" | "ready_for_scale") {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated.");
      const allConfirmed = FOUNDER_CHECKLIST_ITEMS.every((i) => confirmations[i.key] === true);
      if (!allConfirmed) throw new Error("Tick every founder confirmation item first.");
      const failedRequired = checks.filter((c) => c.required_for_controlled_use && c.status === "fail");
      if (failedRequired.length > 0) throw new Error("Blocking checks remain failed.");
      await confirmFounderChecklist({
        confirmations,
        user_id: u.user.id,
        target_status: target,
      });
      await load();
      toast({ title: `Status set to ${STATUS_LABEL[target]}` });
    } catch (e: any) {
      toast({ title: "Cannot escalate", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function downloadReport() {
    if (!derived) return;
    const md = buildReadinessReport({ status: derived.status, checks, reason: derived.reason });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_go_live_readiness_${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentStatus = (persisted?.current_status ?? "ready_for_simulation_only") as ReadinessStatus;
  const allConfirmed = FOUNDER_CHECKLIST_ITEMS.every((i) => confirmations[i.key] === true);
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold mb-1">AI Cost Governor — Go-Live Readiness</h1>
        <p className="text-muted-foreground text-sm">
          Required safety, cost, security, approval and audit checks for the AI Cost Governor + ROI Engine.
          Default status is <strong>Ready for Simulation Only</strong>. The module never auto-promotes to live use.
        </p>
      </div>

      <Card className="tech-card p-5">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Current status</div>
            <div className="text-2xl font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {STATUS_LABEL[currentStatus]}
            </div>
            {persisted?.confirmed_at && (
              <div className="text-xs text-muted-foreground mt-1">
                Confirmed {new Date(persisted.confirmed_at).toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="default">{passCount} pass</Badge>
            <Badge variant="secondary">{warnCount} warn</Badge>
            <Badge variant="destructive">{failCount} fail</Badge>
            {persisted?.evaluated_at && (
              <span className="text-xs text-muted-foreground self-center">
                Last evaluated {new Date(persisted.evaluated_at).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={reEvaluate} disabled={evaluating} variant="outline">
              {evaluating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Re-evaluate
            </Button>
            <Button onClick={downloadReport} disabled={checks.length === 0} variant="outline">
              <Download className="w-4 h-4 mr-2" /> Download report
            </Button>
          </div>
        </div>
        {derived && (
          <div className="mt-4 text-sm border-t border-border/40 pt-4">
            <strong>Automatic assessment:</strong> {STATUS_LABEL[derived.status]} — {derived.reason}
          </div>
        )}
      </Card>

      <Card className="tech-card p-5">
        <h2 className="text-lg font-semibold mb-3">26-check evaluation</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
        ) : checks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No evaluation yet. Click <strong>Re-evaluate</strong> to run all 26 checks.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {checks.map((c) => (
              <li key={c.key} className="py-3 flex items-start gap-3">
                <StatusIcon s={c.status} />
                <div className="flex-1">
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <Badge variant={statusVariant(c.status)} className="capitalize">
                  {c.status}
                </Badge>
                {c.required_for_controlled_use && (
                  <Badge variant="outline" className="text-xs">required</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="tech-card p-5">
        <h2 className="text-lg font-semibold mb-1">Founder confirmation checklist</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Required before recording <strong>Ready for Controlled Internal Use</strong> or any higher status.
        </p>
        <div className="space-y-3">
          {FOUNDER_CHECKLIST_ITEMS.map((item) => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={confirmations[item.key] === true}
                onCheckedChange={(v) => setConfirmations((p) => ({ ...p, [item.key]: v === true }))}
              />
              <span className="text-sm leading-snug">{item.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Textarea
            placeholder="Optional notes (decision context, exceptions, deadline for revisit)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
            rows={3}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={confirmControlled}
            disabled={!allConfirmed || saving || !derived || derived.status === "not_ready"}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Record: Controlled Internal Use
          </Button>
          <Button
            variant="outline"
            onClick={() => escalate("ready_for_limited_live_use")}
            disabled={!allConfirmed || saving}
          >
            Founder override: Limited Live Use
          </Button>
          <Button
            variant="outline"
            onClick={() => escalate("ready_for_scale")}
            disabled={!allConfirmed || saving}
          >
            Founder override: Scale
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Limited Live Use and Scale require explicit founder action — they are never set automatically. Live external
          sending is not enabled by this screen.
        </p>
      </Card>

      <Card className="tech-card p-5">
        <h2 className="text-lg font-semibold mb-3">Status ladder</h2>
        <ol className="space-y-2 text-sm">
          {STATUS_ORDER.map((s) => (
            <li
              key={s}
              className={`flex items-center gap-3 px-3 py-2 rounded-md border ${
                currentStatus === s ? "border-primary/60 bg-primary/5" : "border-border/40"
              }`}
            >
              <span className="font-medium">{STATUS_LABEL[s]}</span>
              {currentStatus === s && <Badge variant="default">current</Badge>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
