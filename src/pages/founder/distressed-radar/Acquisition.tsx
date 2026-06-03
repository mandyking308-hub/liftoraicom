import { useEffect, useState } from "react";
import { DRLayout } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, upsertOpportunity, deleteOpportunity,
  ACTION_LABEL, STRUCTURE_LABEL, fmtMoney,
  type AcquisitionOpportunity,
} from "@/lib/distressedRadarEngine";
import { Plus, Trash2 } from "lucide-react";

export default function DRAcquisition() {
  const [opps, setOpps] = useState<AcquisitionOpportunity[]>([]);
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");

  const load = () => fetchOpportunities().then(setOpps).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addOpp() {
    if (!newName.trim()) return;
    await upsertOpportunity({ opportunity_name: newName.trim(), category: "other", distress_type: "unknown" });
    setNewName("");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this opportunity?")) return;
    await deleteOpportunity(id);
    load();
  }

  const rows = opps.filter(o => !filter || (o.opportunity_name + " " + (o.source ?? "") + " " + o.category).toLowerCase().includes(filter.toLowerCase()));

  return (
    <DRLayout title="Acquisition Radar"
      subtitle="External assets, SaaS, brands, IP, domains and distressed businesses Liftor is researching. No external outreach or bids happen automatically.">
      <Card className="tech-card">
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <Input placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-xs h-8 text-xs" />
          <div className="flex-1" />
          <Input placeholder="New opportunity name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-xs h-8 text-xs" />
          <Button size="sm" onClick={addOpp}><Plus size={14} className="mr-1" />Add</Button>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Opportunity</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Distress</th>
                <th className="text-right p-2">Ask</th>
                <th className="text-right p-2">MRR</th>
                <th className="text-right p-2">Fit</th>
                <th className="text-right p-2">Legal risk</th>
                <th className="text-right p-2">Priority</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Structure</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">No opportunities tracked.</td></tr>}
              {rows.map(o => (
                <tr key={o.id} className="border-b border-border/20 hover:bg-secondary/30">
                  <td className="p-2">
                    <Link to={`/founder/distressed-radar/acquisition/${o.id}`} className="font-medium hover:text-primary">{o.opportunity_name}</Link>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[28ch]">{o.source ?? "—"}</div>
                  </td>
                  <td className="p-2 capitalize">{o.category.replace(/_/g, " ")}</td>
                  <td className="p-2 capitalize">{o.distress_type.replace(/_/g, " ")}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(o.asking_price)}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(o.monthly_recurring_revenue)}</td>
                  <td className="p-2 text-right tabular-nums">{o.liftor_fit_score ?? "—"}</td>
                  <td className={`p-2 text-right tabular-nums ${(o.legal_risk_score ?? 0) >= 50 ? "text-rose-400" : ""}`}>{o.legal_risk_score ?? "—"}</td>
                  <td className={`p-2 text-right tabular-nums font-semibold ${(o.overall_priority_score ?? 0) >= 65 ? "text-emerald-400" : (o.overall_priority_score ?? 0) >= 45 ? "text-amber-300" : "text-muted-foreground"}`}>{o.overall_priority_score ?? "—"}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{ACTION_LABEL[o.recommended_action]}</Badge></td>
                  <td className="p-2 text-[11px]">{STRUCTURE_LABEL[o.recommended_structure]}</td>
                  <td className="p-2"><button onClick={() => remove(o.id)} className="text-muted-foreground hover:text-rose-400"><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </DRLayout>
  );
}