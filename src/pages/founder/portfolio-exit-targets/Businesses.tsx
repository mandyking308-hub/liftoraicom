import { useEffect, useState } from "react";
import { PETLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchTargets, fetchSettings, upsertTarget, deleteTarget, syncAlertsForTarget, compute, fmtMoney,
  type PortfolioExitTarget, type Settings,
} from "@/lib/portfolioExitTargetEngine";
import { Link } from "react-router-dom";

const REVENUE_MODELS = ["recurring_subscription","retainer","transaction","marketplace","licence","hybrid","one_off"] as const;
const STATUSES = ["idea","built","activated","live","paused","parked","sold"] as const;

export default function PETBusinesses() {
  const [targets, setTargets] = useState<PortfolioExitTarget[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    business_name: "", business_status: "live", revenue_model: "recurring_subscription",
    monthly_price_per_customer: "0", current_active_customers: "0",
  });

  async function load() {
    setTargets(await fetchTargets());
    setSettings(await fetchSettings());
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!form.business_name.trim()) return toast.error("Business name required");
    try {
      const t = await upsertTarget({
        business_name: form.business_name.trim(),
        business_status: form.business_status as any,
        revenue_model: form.revenue_model as any,
        monthly_price_per_customer: Number(form.monthly_price_per_customer) || 0,
        current_active_customers: Number(form.current_active_customers) || 0,
      });
      if (settings) await syncAlertsForTarget(t, settings);
      toast.success("Business tracked");
      setOpen(false);
      setForm({ business_name: "", business_status: "live", revenue_model: "recurring_subscription", monthly_price_per_customer: "0", current_active_customers: "0" });
      void load();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }
  async function remove(id: string) {
    if (!confirm("Remove this business from exit targets?")) return;
    try { await deleteTarget(id); toast.success("Removed"); void load(); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  return (
    <PETLayout title="Tracked businesses"
      subtitle="Manage which businesses Liftor monitors for exit-readiness. Open a row for the full detail view and editor."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add business</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add business to exit tracking</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div><Label>Business name</Label><Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <select className="w-full h-10 border border-input bg-background rounded-md px-2" value={form.business_status} onChange={e => setForm({ ...form, business_status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Revenue model</Label>
                  <select className="w-full h-10 border border-input bg-background rounded-md px-2" value={form.revenue_model} onChange={e => setForm({ ...form, revenue_model: e.target.value })}>
                    {REVENUE_MODELS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price / customer / month</Label><Input type="number" value={form.monthly_price_per_customer} onChange={e => setForm({ ...form, monthly_price_per_customer: e.target.value })} /></div>
                <div><Label>Active customers</Label><Input type="number" value={form.current_active_customers} onChange={e => setForm({ ...form, current_active_customers: e.target.value })} /></div>
              </div>
              <p className="text-[11px] text-muted-foreground">More fields (margin, churn, AI-op score, evidence pack…) are editable from the business detail page.</p>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tracked ({targets.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Model</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2">Customers</th>
                <th className="text-right p-2">MRR</th>
                <th className="text-right p-2">ARR</th>
                <th className="text-right p-2"></th>
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No businesses yet. Add one above.</td></tr>}
              {targets.map(t => {
                const c = settings ? compute(t, settings) : null;
                return (
                  <tr key={t.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2"><Link to={`/founder/portfolio-exit-targets/${t.id}`} className="font-medium hover:text-primary">{t.business_name}</Link></td>
                    <td className="p-2 capitalize">{t.business_status}</td>
                    <td className="p-2 capitalize">{t.revenue_model.replace(/_/g, " ")}</td>
                    <td className="p-2 text-right tabular-nums">{fmtMoney(t.monthly_price_per_customer)}</td>
                    <td className="p-2 text-right tabular-nums">{t.current_active_customers}</td>
                    <td className="p-2 text-right tabular-nums">{c ? fmtMoney(c.mrr) : "—"}</td>
                    <td className="p-2 text-right tabular-nums">{c ? fmtMoney(c.arr) : "—"}</td>
                    <td className="p-2 text-right"><Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PETLayout>
  );
}