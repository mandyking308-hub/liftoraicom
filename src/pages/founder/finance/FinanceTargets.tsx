import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Target = {
  id: string; business_name: string; monthly_target: number;
  pipeline_target: number; conversion_assumption: number; month: string; currency: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const FinanceTargets = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const today = new Date();
  const monthDefault = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [form, setForm] = useState({
    business_name: "", monthly_target: "0", pipeline_target: "0", conversion_assumption: "20", month: monthDefault,
  });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("revenue_targets").select("*").order("month", { ascending: false });
    setTargets((data as Target[]) ?? []);
    setLoading(false);
  }

  async function save() {
    if (!form.business_name) { toast.error("Business name required"); return; }
    const { error } = await supabase.from("revenue_targets").upsert(
      {
        business_name: form.business_name,
        monthly_target: Number(form.monthly_target) || 0,
        pipeline_target: Number(form.pipeline_target) || 0,
        conversion_assumption: Number(form.conversion_assumption) || 0,
        month: form.month,
      },
      { onConflict: "business_name,month" },
    );
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    toast.success("Target saved");
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this target?")) return;
    const { error } = await supabase.from("revenue_targets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenue Targets</h1>
            <p className="text-muted-foreground mt-1 text-sm">Monthly targets per business. Used by the target-vs-actual engine on the dashboard.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New Target</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Monthly Target</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Business</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Liftor AI" /></div>
                <div><Label>Month (1st of month)</Label><Input type="date" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Monthly target</Label><Input type="number" value={form.monthly_target} onChange={(e) => setForm({ ...form, monthly_target: e.target.value })} /></div>
                  <div><Label>Pipeline target</Label><Input type="number" value={form.pipeline_target} onChange={(e) => setForm({ ...form, pipeline_target: e.target.value })} /></div>
                  <div><Label>Conversion %</Label><Input type="number" value={form.conversion_assumption} onChange={(e) => setForm({ ...form, conversion_assumption: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="tech-card">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : targets.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No targets configured yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {targets.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.business_name}</p>
                      <p className="text-xs text-muted-foreground">{t.month} · {t.conversion_assumption}% conversion</p>
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      Pipeline {fmt(Number(t.pipeline_target))}
                    </div>
                    <div className="text-base font-semibold tabular-nums">{fmt(Number(t.monthly_target))}</div>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default FinanceTargets;
