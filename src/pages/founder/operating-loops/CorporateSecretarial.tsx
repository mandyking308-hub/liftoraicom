import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSecRecord, dueSoon, fetchSecRecords, summariseSec, type SecRecord } from "@/lib/operatingLoops/corporateSecretarialEngine";
import { toast } from "sonner";

export default function CorporateSecretarialPage() {
  const [rows, setRows] = useState<SecRecord[]>([]);
  const [name, setName] = useState(""); const [jur, setJur] = useState("");
  const reload = () => fetchSecRecords().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { reload(); }, []);
  const s = summariseSec(rows);

  const add = async () => {
    if (!name.trim()) return;
    try { await createSecRecord({ entity_name: name.trim(), jurisdiction: jur || null }); setName(""); setJur(""); reload(); toast.success("Entity record added."); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <OLLayout title="Corporate secretarial register"
      subtitle="Directors, shareholders, PSC, annual confirmations, accounts, licences."
      disclaimer="No external filings or notifications. Founder/admin tracking only. Adviser executes external steps.">
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Entities</p><p className="text-sm font-bold">{s.total}</p></div>
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Due soon (60d)</p><p className="text-sm font-bold">{s.dueCount}</p></div>
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Review required</p><p className="text-sm font-bold">{s.reviewCount}</p></div>
      </div>
      <OLSection title="Add entity">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Entity name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Jurisdiction (e.g. UK)" value={jur} onChange={e => setJur(e.target.value)} />
          <Button onClick={add}>Add</Button>
        </div>
      </OLSection>
      <OLSection title={`Entities (${rows.length})`}>
        {rows.length === 0 ? <p className="text-muted-foreground">No entities yet.</p> : (
          <div className="space-y-2">{rows.map(r => {
            const dues = dueSoon(r);
            return (
              <div key={r.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div><span className="font-medium">{r.entity_name}</span> <span className="text-muted-foreground">· {r.jurisdiction ?? "—"}</span></div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                  <span>Office: {r.registered_office ?? "—"}</span>
                  <span>Agent: {r.registered_agent ?? "—"}</span>
                  <span>Confirmation: {r.annual_confirmation_due ?? "—"}</span>
                  <span>Accounts: {r.accounts_due ?? "—"}</span>
                  <span>Licence: {r.licence_renewal_due ?? "—"}</span>
                </div>
                {dues.length > 0 && <p className="text-[11px] text-yellow-300">Due soon: {dues.map(d => `${d.kind.replace(/_/g," ")} (${d.date})`).join(", ")}</p>}
              </div>
            );
          })}</div>
        )}
      </OLSection>
    </OLLayout>
  );
}
