import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canGoLive, createExpansionRun, fetchExpansionRuns, READINESS_KEYS, READINESS_STATUSES, readinessScore, updateExpansionRun, type ExpansionRun } from "@/lib/operatingLoops/internationalExpansionEngine";
import { toast } from "sonner";

export default function InternationalExpansionPage() {
  const [rows, setRows] = useState<ExpansionRun[]>([]);
  const [jur, setJur] = useState(""); const [purpose, setPurpose] = useState("");
  const reload = () => fetchExpansionRuns().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { reload(); }, []);

  const add = async () => { if (!jur.trim()) return; try { await createExpansionRun({ target_jurisdiction: jur.trim(), launch_purpose: purpose }); setJur(""); setPurpose(""); reload(); } catch (e: any) { toast.error(e.message); } };
  const setField = async (id: string, k: string, v: string) => { try { await updateExpansionRun(id, { [k]: v } as any); reload(); } catch (e: any) { toast.error(e.message); } };
  const decide = async (id: string, d: string) => { try { await updateExpansionRun(id, { founder_decision: d, founder_decided_at: new Date().toISOString(), go_no_go_status: d === "approved" ? "go" : "blocked" } as any); reload(); } catch (e: any) { toast.error(e.message); } };

  return (
    <OLLayout title="International expansion runbook"
      subtitle="Per-jurisdiction launch readiness with adviser-led tax, legal, payments, banking, privacy and substance checks."
      disclaimer="No relocation, tax or legal advice. No automatic jurisdiction approval. Adviser-led readiness tracking only.">
      <OLSection title="Add target jurisdiction">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Target jurisdiction (e.g. Germany)" value={jur} onChange={e => setJur(e.target.value)} />
          <Input placeholder="Launch purpose" value={purpose} onChange={e => setPurpose(e.target.value)} />
          <Button onClick={add}>Add</Button>
        </div>
      </OLSection>
      {rows.map(r => {
        const score = readinessScore(r); const live = canGoLive(r);
        return (
          <OLSection key={r.id} title={`${r.target_jurisdiction} — ${score.ready}/${score.total} ready${score.blocked ? ` · ${score.blocked} blocked` : ""}`} action={<StatusBadge status={r.go_no_go_status} />}>
            <p className="text-muted-foreground text-[11px]">{r.launch_purpose ?? "—"}</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {READINESS_KEYS.map(k => (
                <div key={k} className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/_status$/,"").replace(/_/g," ")}</p>
                  <Select value={(r as any)[k]} onValueChange={(v) => setField(r.id, k, v)}>
                    <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{READINESS_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground">Founder decision: {r.founder_decision ?? "pending"}</span>
              <Button size="sm" variant="outline" disabled={!score.complete} onClick={() => decide(r.id, "approved")}>Approve go-live</Button>
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>Reject</Button>
              {live && <StatusBadge status="ready" />}
            </div>
          </OLSection>
        );
      })}
      {rows.length === 0 && <p className="text-xs text-muted-foreground">No expansion runs yet.</p>}
    </OLLayout>
  );
}
