import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import CommercialHandoffPanel from "@/components/founder/commercial/CommercialHandoffPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Deal = {
  id: string; deal_name: string; business_name: string; status: string;
  estimated_value_min: number; estimated_value_max: number; probability: number;
  contact_id: string | null; currency: string; updated_at: string;
};
type Contact = { id: string; name: string; email: string };

const STATUSES = ["NEW", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"] as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const FinanceDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    deal_name: "", business_name: "", contact_id: "",
    estimated_value_min: "0", estimated_value_max: "0", probability: "30",
  });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [d, c] = await Promise.all([
      supabase.from("deals").select("*").order("updated_at", { ascending: false }),
      supabase.from("contacts").select("id, name, email").order("name").limit(500),
    ]);
    setDeals((d.data as Deal[]) ?? []);
    setContacts((c.data as Contact[]) ?? []);
    setLoading(false);
  }

  async function createDeal() {
    if (!form.deal_name) { toast.error("Deal name required"); return; }
    const { error } = await supabase.from("deals").insert({
      deal_name: form.deal_name,
      business_name: form.business_name,
      contact_id: form.contact_id || null,
      estimated_value_min: Number(form.estimated_value_min) || 0,
      estimated_value_max: Number(form.estimated_value_max) || 0,
      probability: Math.max(0, Math.min(100, Number(form.probability) || 0)),
      status: "NEW",
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    setForm({ deal_name: "", business_name: "", contact_id: "", estimated_value_min: "0", estimated_value_max: "0", probability: "30" });
    toast.success("Deal created");
    void load();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("deals").update({ status: status as "NEW" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "WON" ? "Deal won — draft invoice created" : `Status updated to ${status}`);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this deal?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  const visible = filter === "ALL" ? deals : deals.filter((d) => d.status === filter);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Deals Pipeline</h1>
            <p className="text-muted-foreground mt-1 text-sm">All open and closed deals. Moving to WON auto-creates a draft invoice.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New Deal</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Deal name</Label><Input value={form.deal_name} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} /></div>
                  <div><Label>Business</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Liftor AI" /></div>
                  <div>
                    <Label>Contact (optional)</Label>
                    <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                      <SelectContent>
                        {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Min value</Label><Input type="number" value={form.estimated_value_min} onChange={(e) => setForm({ ...form, estimated_value_min: e.target.value })} /></div>
                    <div><Label>Max value</Label><Input type="number" value={form.estimated_value_max} onChange={(e) => setForm({ ...form, estimated_value_max: e.target.value })} /></div>
                    <div><Label>Probability %</Label><Input type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={createDeal}>Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="tech-card">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No deals yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {visible.map((d) => {
                  const mid = (Number(d.estimated_value_min) + Number(d.estimated_value_max)) / 2;
                  return (
                    <div key={d.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{d.deal_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.business_name || "Unassigned"} · {fmt(Number(d.estimated_value_min))}–{fmt(Number(d.estimated_value_max))} · {d.probability}%
                        </p>
                      </div>
                      <div className="text-sm tabular-nums text-muted-foreground hidden md:block">est. {fmt(mid)}</div>
                      <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Badge variant={d.status === "WON" ? "default" : d.status === "LOST" ? "secondary" : "outline"}>{d.status}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <CommercialHandoffPanel />
      </div>
    </FounderLayout>
  );
};

export default FinanceDeals;
