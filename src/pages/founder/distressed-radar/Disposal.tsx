import { useEffect, useState } from "react";
import { DRLayout } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchDisposals, upsertDisposal, deleteDisposal, disposalReadiness,
  type DisposalAsset,
} from "@/lib/distressedRadarEngine";
import { Trash2 } from "lucide-react";

const ROUTES = ["flippa","acquire","private_sale","broker","strategic_buyer","do_not_sell"];
const STATUSES = ["missing","partial","ready","verified"];

export default function DRDisposal() {
  const [items, setItems] = useState<DisposalAsset[]>([]);
  const [draft, setDraft] = useState<Partial<DisposalAsset>>({ asset_name: "", category: "saas", sale_route: "do_not_sell", evidence_pack_status: "missing", handover_docs_status: "missing", recommended_action: "hold" });

  const load = () => fetchDisposals().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.asset_name?.trim()) return;
    await upsertDisposal(draft as DisposalAsset);
    setDraft({ asset_name: "", category: "saas", sale_route: "do_not_sell", evidence_pack_status: "missing", handover_docs_status: "missing", recommended_action: "hold" });
    load();
  }
  async function update(d: DisposalAsset, patch: Partial<DisposalAsset>) {
    await upsertDisposal({ ...d, ...patch });
    load();
  }

  return (
    <DRLayout title="Disposal Shelf"
      subtitle="Liftor-owned or built assets that are non-core. Marketplace routes such as Flippa or Acquire. Founder approval required before listing or contacting buyers.">
      <Card className="tech-card">
        <CardContent className="p-3 grid md:grid-cols-4 gap-2 text-xs">
          <Field label="Asset name"><Input value={draft.asset_name ?? ""} onChange={e => setDraft({ ...draft, asset_name: e.target.value })} /></Field>
          <Field label="Category"><Input value={draft.category ?? ""} onChange={e => setDraft({ ...draft, category: e.target.value as DisposalAsset["category"] })} /></Field>
          <Field label="Reason"><Input value={draft.reason_for_disposal ?? ""} onChange={e => setDraft({ ...draft, reason_for_disposal: e.target.value })} /></Field>
          <div className="flex items-end"><Button size="sm" onClick={add}>Add asset</Button></div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Asset</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Route</th>
                <th className="text-right p-2">Ask</th>
                <th className="text-left p-2">Evidence</th>
                <th className="text-left p-2">Handover</th>
                <th className="text-left p-2">Readiness</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No disposal candidates.</td></tr>}
              {items.map(d => {
                const r = disposalReadiness(d);
                return (
                  <tr key={d.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{d.asset_name}<div className="text-[10px] text-muted-foreground truncate max-w-[28ch]">{d.reason_for_disposal}</div></td>
                    <td className="p-2 capitalize">{d.category}</td>
                    <td className="p-2">
                      <select className="bg-background border border-input rounded px-1 text-xs" value={d.sale_route} onChange={e => update(d, { sale_route: e.target.value as DisposalAsset["sale_route"] })}>
                        {ROUTES.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      <Input className="h-7 text-xs w-24 ml-auto" type="number" value={d.asking_price_estimate ?? ""} onChange={e => update(d, { asking_price_estimate: e.target.value === "" ? null : Number(e.target.value) })} />
                    </td>
                    <td className="p-2">
                      <select className="bg-background border border-input rounded px-1 text-xs" value={d.evidence_pack_status} onChange={e => update(d, { evidence_pack_status: e.target.value as DisposalAsset["evidence_pack_status"] })}>
                        {STATUSES.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select className="bg-background border border-input rounded px-1 text-xs" value={d.handover_docs_status} onChange={e => update(d, { handover_docs_status: e.target.value as DisposalAsset["handover_docs_status"] })}>
                        {STATUSES.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      {r.ready
                        ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Ready</Badge>
                        : <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-400 border-rose-500/30" title={r.reasons.join("; ")}>Blocked</Badge>}
                    </td>
                    <td className="p-2"><button onClick={async () => { if (confirm("Delete?")) { await deleteDisposal(d.id); load(); } }} className="text-muted-foreground hover:text-rose-400"><Trash2 size={12} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </DRLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>{children}</div>;
}