import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLAIM_STATUSES, createClaim, fetchClaims, summariseClaims, updateClaim, type InsuranceClaim } from "@/lib/operatingLoops/insuranceClaimLoopEngine";
import { toast } from "sonner";

export default function InsuranceClaimsPage() {
  const [rows, setRows] = useState<InsuranceClaim[]>([]);
  const [title, setTitle] = useState("");
  const reload = () => fetchClaims().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { reload(); }, []);
  const s = summariseClaims(rows);

  const add = async () => {
    if (!title.trim()) return;
    try { await createClaim({ claim_type: title.trim() }); setTitle(""); reload(); toast.success("Draft claim added."); }
    catch (e: any) { toast.error(e.message); }
  };

  const setStatus = async (id: string, status: string) => {
    try { await updateClaim(id, { status }); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <OLLayout title="Insurance claim loop"
      subtitle="Incident → policy match → claim draft → evidence → founder approval → broker/insurer handoff tracked → recovery/closure."
      disclaimer="No automatic broker or insurer emails. No claim is submitted by Liftor. This is internal tracking and evidence only.">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(s).map(([k,v]) => (
          <div key={k} className="border border-border/50 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/([A-Z])/g," $1")}</p>
            <p className="text-sm font-bold">{typeof v === "number" ? v : String(v)}</p>
          </div>
        ))}
      </div>
      <OLSection title="Add draft claim">
        <div className="flex gap-2">
          <Input placeholder="Claim type (e.g. property damage)" value={title} onChange={e => setTitle(e.target.value)} />
          <Button size="sm" onClick={add}>Create draft</Button>
        </div>
      </OLSection>
      <OLSection title={`Claims (${rows.length})`}>
        {rows.length === 0 ? <p className="text-muted-foreground">No claims yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr><th className="text-left p-2">Type</th><th className="text-left p-2">Insurer</th><th className="text-left p-2">Status</th><th className="text-left p-2">Next action</th><th className="text-left p-2">Approval</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="p-2">{r.claim_type}</td>
                    <td className="p-2 text-muted-foreground">{r.insurer ?? "—"}</td>
                    <td className="p-2"><StatusBadge status={r.status} /></td>
                    <td className="p-2 text-muted-foreground">{r.next_action ?? "—"} {r.next_action_due ? `· ${r.next_action_due}` : ""}</td>
                    <td className="p-2 text-muted-foreground">{r.founder_approval_status}</td>
                    <td className="p-2">
                      <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                        <SelectTrigger className="h-7 w-[180px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{CLAIM_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OLSection>
    </OLLayout>
  );
}
