import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck, ShieldAlert, Power, PowerOff, Lock, History, Sparkles,
} from "lucide-react";
import {
  loadCombined, listLog, summarise, activateBusiness, deactivateBusiness,
  enforceMondaySafeBaseline, STATE_CLS, RISK_CLS,
  type CombinedBusiness,
} from "@/lib/businessActivationControl";

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function BusinessActivationControlPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "isolated" | "allowed">("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["business_runtime_activation"],
    queryFn: loadCombined,
    refetchInterval: 30_000,
  });
  const { data: log = [] } = useQuery({
    queryKey: ["business_runtime_activation_log"],
    queryFn: () => listLog(50),
    refetchInterval: 30_000,
  });

  const summary = useMemo(() => summarise(rows), [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "active") return r.effectiveState === "live";
      if (filter === "isolated") return r.effectiveState !== "live";
      if (filter === "allowed") return r.allowed;
      return true;
    });
  }, [rows, filter]);

  const activateMut = useMutation({
    mutationFn: (c: CombinedBusiness) => activateBusiness(c, { reason: "founder one-click activate" }),
    onSuccess: (res, c) => {
      if (!res.ok) toast({ title: "Activation blocked", description: res.error, variant: "destructive" });
      else toast({ title: "Activated", description: c.business.name });
      qc.invalidateQueries({ queryKey: ["business_runtime_activation"] });
      qc.invalidateQueries({ queryKey: ["business_runtime_activation_log"] });
    },
  });
  const deactivateMut = useMutation({
    mutationFn: (c: CombinedBusiness) => deactivateBusiness(c, { reason: "founder one-click deactivate" }),
    onSuccess: (res, c) => {
      if (!res.ok) toast({ title: "Deactivation failed", description: res.error, variant: "destructive" });
      else toast({ title: "Deactivated", description: c.business.name });
      qc.invalidateQueries({ queryKey: ["business_runtime_activation"] });
      qc.invalidateQueries({ queryKey: ["business_runtime_activation_log"] });
    },
  });
  const baselineMut = useMutation({
    mutationFn: () => enforceMondaySafeBaseline(),
    onSuccess: (res) => {
      if (!res.ok) toast({ title: "Baseline failed", description: res.error, variant: "destructive" });
      else toast({ title: "Monday-safe baseline applied", description: `${res.isolated} businesses isolated` });
      qc.invalidateQueries({ queryKey: ["business_runtime_activation"] });
      qc.invalidateQueries({ queryKey: ["business_runtime_activation_log"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Active" value={summary.active} accent="emerald" icon={<Power className="w-4 h-4" />} />
        <MetricCard label="Isolated" value={summary.isolated} accent="slate" icon={<PowerOff className="w-4 h-4" />} />
        <MetricCard label="Quarantined" value={summary.quarantined} accent="rose" icon={<ShieldAlert className="w-4 h-4" />} />
        <MetricCard label="Allowlisted" value={summary.allowlisted} accent="primary" icon={<ShieldCheck className="w-4 h-4" />} />
      </div>

      <Card className="tech-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Monday-Safe Activation
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Only NeonCandy, ServiceOpsDemo and InternalOps may go live.
              Every other business is forcibly isolated from queues, outbound and AI orchestration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => baselineMut.mutate()}
              disabled={baselineMut.isPending}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Enforce baseline
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "allowed", "active", "isolated"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading businesses…</div>
          ) : visible.length === 0 ? (
            <div className="text-sm text-muted-foreground">No businesses match this filter.</div>
          ) : (
            <div className="space-y-2">
              {visible.map((c) => (
                <BusinessRow
                  key={c.business.id}
                  c={c}
                  onActivate={() => activateMut.mutate(c)}
                  onDeactivate={() => deactivateMut.mutate(c)}
                  busy={activateMut.isPending || deactivateMut.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Activation Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <div className="text-sm text-muted-foreground">No activation events yet.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {log.map((l) => (
                <li key={l.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{l.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{fmtTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessRow({
  c, onActivate, onDeactivate, busy,
}: {
  c: CombinedBusiness;
  onActivate: () => void;
  onDeactivate: () => void;
  busy: boolean;
}) {
  const live = c.effectiveState === "live";
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{c.business.name}</span>
          <Badge variant="outline" className={STATE_CLS[c.effectiveState]}>{c.effectiveState}</Badge>
          <Badge variant="outline" className={RISK_CLS[c.riskLevel]}>risk · {c.riskLevel}</Badge>
          {c.allowed ? (
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">allowlisted</Badge>
          ) : (
            <Badge variant="outline" className="bg-slate-500/15 text-slate-300 border-slate-400/30">blocked</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>queue: {c.queueAllowed ? "✓" : "—"}</span>
          <span>outbound: {c.outboundAllowed ? "✓" : "—"}</span>
          <span>AI: {c.aiAllowed ? "✓" : "—"}</span>
          {c.activation?.activated_at && <span>since {new Date(c.activation.activated_at).toLocaleString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {live ? (
          <Button size="sm" variant="outline" onClick={onDeactivate} disabled={busy}>
            <PowerOff className="w-3.5 h-3.5 mr-1.5" />Deactivate
          </Button>
        ) : (
          <Button size="sm" onClick={onActivate} disabled={busy || !c.allowed} title={c.allowed ? "" : "Not on Monday allowlist"}>
            <Power className="w-3.5 h-3.5 mr-1.5" />Activate
          </Button>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label, value, accent, icon,
}: {
  label: string; value: number;
  accent: "emerald" | "slate" | "rose" | "primary";
  icon: React.ReactNode;
}) {
  const cls =
    accent === "emerald" ? "text-emerald-300" :
    accent === "slate" ? "text-slate-300" :
    accent === "rose" ? "text-rose-300" :
    "text-primary";
  return (
    <Card className="tech-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className={cls}>{icon}</span>
        </div>
        <div className={`text-2xl font-semibold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}