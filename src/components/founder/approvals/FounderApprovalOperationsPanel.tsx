import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, PauseCircle, AlertOctagon, Filter } from "lucide-react";
import {
  fetchApprovalOps, applyFilters, computeMetrics, submitDecision, pauseApproval,
  type ApprovalRow, type EscalationRow, type ApprovalFilters,
} from "@/lib/approvalOpsEngine";

const PRIORITIES = ["urgent", "high", "normal", "low"];
const STATUSES = ["pending", "paused", "blocked", "failed", "approved", "rejected"];

export default function FounderApprovalOperationsPanel() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ApprovalFilters>({ status: "pending" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchApprovalOps();
      setApprovals(d.approvals);
      setEscalations(d.escalations);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => applyFilters(approvals, filters), [approvals, filters]);
  const metrics = useMemo(() => computeMetrics(approvals, escalations), [approvals, escalations]);

  const businesses = useMemo(() => Array.from(new Set(approvals.map((r) => r.business_id).filter(Boolean))) as string[], [approvals]);
  const types = useMemo(() => Array.from(new Set(approvals.map((r) => r.approval_type))), [approvals]);
  const agents = useMemo(() => Array.from(new Set(approvals.map((r) => r.agent_key).filter(Boolean))) as string[], [approvals]);

  const toggle = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const batchApprove = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      const r = await submitDecision(id, "approve", "Batch approve via Operations Centre");
      if (r.ok) ok++; else fail++;
    }
    setBusy(false);
    setSelected(new Set());
    toast.success(`Batch: ${ok} approved, ${fail} blocked/failed`);
    load();
  };

  const act = async (id: string, kind: "approve" | "reject" | "escalate") => {
    setBusy(true);
    const r = await submitDecision(id, kind);
    setBusy(false);
    if (r.ok) { toast.success(`${kind} recorded`); load(); }
    else toast.error(r.reason ?? `${kind} failed`);
  };

  const pause = async (id: string) => {
    setBusy(true);
    const r = await pauseApproval(id);
    setBusy(false);
    if (r.ok) { toast.success("Paused"); load(); }
    else toast.error(r.error ?? "Pause failed");
  };

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Founder Approval Operations Centre
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <Metric label="Pending" value={metrics.pending} />
            <Metric label="Blocked" value={metrics.blocked} tone={metrics.blocked > 0 ? "warn" : undefined} />
            <Metric label="Failed" value={metrics.failed} tone={metrics.failed > 0 ? "danger" : undefined} />
            <Metric label="Paused" value={metrics.paused} />
            <Metric label="Approvals today" value={metrics.approvals_today} />
            <Metric label="Avg delay (min)" value={metrics.avg_decision_delay_minutes} />
            <Metric label="Open escalations" value={metrics.escalations_open} tone={metrics.escalations_open > 0 ? "warn" : undefined} />
            <Metric label="Founder load" value={`${metrics.founder_load_score}`}
              tone={metrics.founder_load_score > 60 ? "danger" : metrics.founder_load_score > 30 ? "warn" : "ok"} />
          </div>

          <div className="flex flex-wrap items-center gap-2 border border-border/60 rounded-md p-2 bg-card/30">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <FilterSel label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={STATUSES} />
            <FilterSel label="Severity" value={filters.severity} onChange={(v) => setFilters((f) => ({ ...f, severity: v }))} options={PRIORITIES} />
            <FilterSel label="Type" value={filters.approval_type} onChange={(v) => setFilters((f) => ({ ...f, approval_type: v }))} options={types} />
            <FilterSel label="Agent" value={filters.agent_key} onChange={(v) => setFilters((f) => ({ ...f, agent_key: v }))} options={agents} />
            <FilterSel label="Business" value={filters.business_id} onChange={(v) => setFilters((f) => ({ ...f, business_id: v }))} options={businesses} renderOpt={(o) => o.slice(0,8)} />
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => setFilters({})}>Clear</Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">{filtered.length} items · {selected.size} selected</div>
            <Button size="sm" disabled={busy || selected.size === 0} onClick={batchApprove}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Batch approve ({selected.size})
            </Button>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 && <p className="text-xs text-muted-foreground">No approval items match filters.</p>}
            {filtered.map((r) => (
              <div key={r.id} className="rounded-md border border-border/50 p-2.5 bg-card/40">
                <div className="flex items-start gap-2">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <Badge variant="outline">{r.priority_level}</Badge>
                      <Badge variant="outline">{r.approval_type}</Badge>
                      <Badge variant="outline">{r.status}</Badge>
                      {r.agent_key && <Badge variant="outline">{r.agent_key}</Badge>}
                      {r.business_id && <span className="text-muted-foreground font-mono">biz {r.business_id.slice(0,8)}</span>}
                      <span className="text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-medium mt-1">{r.title}</p>
                    {r.summary && <p className="text-xs text-muted-foreground line-clamp-2">{r.summary}</p>}
                    {(r.risk_flags.length > 0 || r.compliance_flags.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.risk_flags.map((f) => <Badge key={`r-${f}`} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300">risk · {f}</Badge>)}
                        {r.compliance_flags.map((f) => <Badge key={`c-${f}`} variant="outline" className="text-[10px] bg-orange-500/10 text-orange-300">comp · {f}</Badge>)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Button size="sm" disabled={busy || r.status !== "pending"} onClick={() => act(r.id, "approve")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy || r.status !== "pending"} onClick={() => act(r.id, "reject")}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy || r.status !== "pending"} onClick={() => pause(r.id)}>
                        <PauseCircle className="h-3 w-3 mr-1" /> Pause
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(r.id, "escalate")}>
                        <AlertOctagon className="h-3 w-3 mr-1" /> Escalate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border/40 p-2 text-[11px] text-muted-foreground">
            Every decision routes through the policy-checked <code>founder-approval-apply</code> edge function. No external send fires
            without explicit approval; audit logs are immutable (decided_at + founder_decision pinned per row).
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Open escalations</CardTitle></CardHeader>
        <CardContent>
          {escalations.filter((e) => !e.resolved_at).length === 0 ? (
            <p className="text-xs text-muted-foreground">No open escalations.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {escalations.filter((e) => !e.resolved_at).slice(0, 20).map((e) => (
                <li key={e.id} className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{e.severity}</Badge>
                  <span className="text-muted-foreground">{e.source_module}</span>
                  <span>{e.escalation_type}</span>
                  {e.escalation_reason && <span className="text-muted-foreground">— {e.escalation_reason}</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval history (recent decisions)</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-xs divide-y divide-border max-h-72 overflow-y-auto">
            {approvals.filter((r) => r.founder_decision && r.decided_at).slice(0, 50).map((r) => (
              <li key={r.id} className="py-1.5 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{r.founder_decision}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.approval_type}</Badge>
                <span className="truncate flex-1">{r.title}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(r.decided_at!).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
    : tone === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
    : tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-border";
  return (
    <div className={`rounded-md border p-2 ${cls}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

function FilterSel({ label, value, onChange, options, renderOpt }: {
  label: string;
  value?: string | null;
  onChange: (v: string | null) => void;
  options: string[];
  renderOpt?: (o: string) => string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-7 text-xs rounded border bg-background px-1.5"
    >
      <option value="">{label}: any</option>
      {options.map((o) => <option key={o} value={o}>{renderOpt ? renderOpt(o) : o}</option>)}
    </select>
  );
}