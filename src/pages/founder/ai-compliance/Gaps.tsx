import { useEffect, useMemo, useState } from "react";
import { AICLayout, AICSection, SeverityBadge, EmptyState } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchGapActions, upsertGapAction, materialiseGaps, synthesizeGaps,
  fetchSystems, fetchFlows, fetchOversight,
  type AIComplianceGapAction,
} from "@/lib/aiComplianceEngine";
import { fetchProfiles, fetchTriggers, type ComplianceProfile, type ApprovalTrigger } from "@/lib/businessComplianceEngine";

const STATUSES = ["open","in_progress","blocked","done","parked"] as const;

export default function AICGaps() {
  const [rows, setRows] = useState<AIComplianceGapAction[]>([]);
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [triggers, setTriggers] = useState<ApprovalTrigger[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [oversight, setOversight] = useState<any[]>([]);

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
                {rows.map(r => (
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
        )}
      </AICSection>
    </AICLayout>
  );
}