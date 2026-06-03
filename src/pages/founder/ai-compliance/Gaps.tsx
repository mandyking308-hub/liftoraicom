import { useEffect, useMemo, useState } from "react";
import { AICLayout, AICSection, SeverityBadge, EmptyState } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchGapActions, upsertGapAction, materialiseGaps, synthesizeGaps,
  fetchSystems, fetchFlows, fetchOversight,
  createDraftBaselineFlows,
  type AIComplianceGapAction, type AIComplianceSystem,
  type AIDataFlowRecord, type AIHumanOversightRecord,
} from "@/lib/aiComplianceEngine";
import { fetchProfiles, fetchTriggers, type ComplianceProfile, type ApprovalTrigger } from "@/lib/businessComplianceEngine";

const STATUSES = ["open","in_progress","blocked","done","parked"] as const;

type Filter = "all" | "critical_high" | "external_action" | "sensitive" | "missing_flow" | "missing_oversight" | "not_confirmed" | "needs_adviser";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All systems" },
  { value: "critical_high", label: "High / critical" },
  { value: "external_action", label: "External-action" },
  { value: "sensitive", label: "Sensitive-data" },
  { value: "missing_flow", label: "Missing data-flow" },
  { value: "missing_oversight", label: "Missing oversight" },
  { value: "not_confirmed", label: "Not founder-confirmed" },
  { value: "needs_adviser", label: "Needs adviser" },
];

export default function AICGaps() {
  const [rows, setRows] = useState<AIComplianceGapAction[]>([]);
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [triggers, setTriggers] = useState<ApprovalTrigger[]>([]);
  const [systems, setSystems] = useState<AIComplianceSystem[]>([]);
  const [flows, setFlows] = useState<AIDataFlowRecord[]>([]);
  const [oversight, setOversight] = useState<AIHumanOversightRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = () => {
    fetchGapActions().then(setRows).catch(e => toast.error(e.message ?? "Failed"));
    fetchProfiles().then(setProfiles).catch(() => {});
    fetchTriggers().then(setTriggers).catch(() => {});
    fetchSystems().then(setSystems).catch(() => {});
    fetchFlows().then(setFlows).catch(() => {});
    fetchOversight().then(setOversight).catch(() => {});
  };
  useEffect(load, []);

  const synth = useMemo(() => synthesizeGaps({ profiles, systems, flows, oversight, triggers }),
    [profiles, systems, flows, oversight, triggers]);

  const flowSet = useMemo(() => new Set(flows.map(f => f.system_id).filter(Boolean) as string[]), [flows]);
  const overSet = useMemo(() => new Set(oversight.map(o => o.system_id).filter(Boolean) as string[]), [oversight]);
  const filteredSystems = useMemo(() => systems.filter(s => {
    switch (filter) {
      case "critical_high": return s.risk_level === "critical" || s.risk_level === "high";
      case "external_action": return s.external_action_capable;
      case "sensitive": return s.uses_sensitive_data || s.handles_children_data || s.handles_health_data || s.handles_financial_data || s.handles_legal_data;
      case "missing_flow": return !flowSet.has(s.id);
      case "missing_oversight": return !overSet.has(s.id);
      case "not_confirmed": return !s.founder_confirmed;
      case "needs_adviser": return s.risk_level === "critical" || s.risk_level === "high" || s.external_action_capable;
      default: return true;
    }
  }), [systems, filter, flowSet, overSet]);

  const grouped = useMemo(() => {
    const m = new Map<string, AIComplianceGapAction[]>();
    for (const r of rows) {
      const key = r.system_id ?? "__unscoped";
      const arr = m.get(key) ?? []; arr.push(r); m.set(key, arr);
    }
    return m;
  }, [rows]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const bulkCreateDrafts = async () => {
    const names = filteredSystems.filter(s => selectedIds.includes(s.id)).map(s => s.system_name);
    if (names.length === 0) return toast.error("Select systems first");
    try {
      const r = await createDraftBaselineFlows({ systemNames: names });
      toast.success(`Drafts — ${r.inserted} created, ${r.skipped} existed, ${r.protected} founder-confirmed (untouched).`);
      setSelected({}); load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const materialise = async () => {
    try { const n = await materialiseGaps(synth); toast.success(`Materialised ${n}`); load(); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const setStatus = async (g: AIComplianceGapAction, status: AIComplianceGapAction["status"]) => {
    try { await upsertGapAction({ ...g, status }); load(); }
    catch (e: any) { toast.error(e.message ?? "Update failed"); }
  };

  return (
    <AICLayout title="Gaps & Actions" subtitle="Persisted compliance gaps and remediation actions. Synthesised gaps are computed live and can be materialised.">
      <AICSection
        title="Filter & bulk actions"
        description="Bulk-create draft data-flow records for selected systems. No bulk approval for high/critical systems."
        actions={
          <div className="flex gap-2 items-center">
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="h-8 w-48 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>{FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={bulkCreateDrafts} disabled={selectedIds.length === 0}>
              Create draft data-flows for selected ({selectedIds.length})
            </Button>
          </div>
        }
      >
        {filteredSystems.length === 0 ? <EmptyState title="No systems match this filter." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2 w-6"></th>
                  <th className="text-left p-2">System</th>
                  <th className="text-left p-2">Risk</th>
                  <th className="text-left p-2">Ext-action</th>
                  <th className="text-left p-2">Data-flow</th>
                  <th className="text-left p-2">Oversight</th>
                  <th className="text-left p-2">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {filteredSystems.map(s => (
                  <tr key={s.id} className="border-b border-border/20">
                    <td className="p-2">
                      <Checkbox checked={!!selected[s.id]} onCheckedChange={v => setSelected(prev => ({ ...prev, [s.id]: !!v }))} />
                    </td>
                    <td className="p-2 font-medium">{s.system_name}</td>
                    <td className="p-2 text-muted-foreground">{s.risk_level}</td>
                    <td className="p-2">{s.external_action_capable ? "yes" : "no"}</td>
                    <td className="p-2">{flowSet.has(s.id) ? "ok" : "missing"}</td>
                    <td className="p-2">{overSet.has(s.id) ? "ok" : "missing"}</td>
                    <td className="p-2">{s.founder_confirmed ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AICSection>

      <AICSection title="Live-synthesised gaps" description={`${synth.length} candidate gaps`} actions={
        <Button size="sm" variant="outline" onClick={materialise} disabled={synth.length === 0}>Materialise all</Button>
      }>
        {synth.length === 0 ? <EmptyState title="No new gaps detected." /> : (
          <ul className="text-xs space-y-1">
            {synth.slice(0, 30).map((g, i) => (
              <li key={i} className="flex items-start gap-2 border-b border-border/20 pb-1">
                <SeverityBadge level={g.severity} />
                <div className="flex-1"><p className="font-medium">{g.gap_title}</p><p className="text-muted-foreground">{g.gap_description}</p></div>
              </li>
            ))}
          </ul>
        )}
      </AICSection>

      <AICSection title="Tracked actions" description={`${rows.length} actions`}>
        {rows.length === 0 ? <EmptyState title="No tracked actions yet." hint="Materialise synthesised gaps to start tracking owners and due dates." /> : (
          <div className="space-y-3">
            {[...grouped.entries()].map(([sysId, items]) => {
              const sys = systems.find(s => s.id === sysId);
              const label = sys ? `${sys.system_name} · ${sys.risk_level}` : "Unscoped";
              return (
                <div key={sysId} className="border border-border/40 rounded p-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                  <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Owner</th>
                  <th className="text-left p-2">Founder?</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="p-2"><SeverityBadge level={r.severity} /></td>
                    <td className="p-2 font-medium">{r.gap_title}<div className="text-[10px] text-muted-foreground">{r.gap_description}</div></td>
                    <td className="p-2 text-muted-foreground">{r.source ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{r.action_owner ?? "—"}</td>
                    <td className="p-2">{r.founder_decision_required ? <Badge variant="outline" className="text-[10px]">founder</Badge> : "—"}</td>
                    <td className="p-2">
                      <Select value={r.status} onValueChange={(v) => setStatus(r, v as any)}>
                        <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AICSection>
    </AICLayout>
  );
}