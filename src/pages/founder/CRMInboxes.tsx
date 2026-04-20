import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Inbox = {
  id: string;
  email_address: string;
  business_name: string;
  daily_send_limit: number;
  current_send_count: number;
  warmup_status: "new" | "warming" | "active";
  active: boolean;
};

const CRMInboxes = () => {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email_address: "", business_name: "", daily_send_limit: 50, warmup_status: "new" as Inbox["warmup_status"] });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("inboxes").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setInboxes((data as Inbox[]) ?? []);
    setLoading(false);
  }

  async function create() {
    if (!form.email_address.trim()) return toast.error("Email required");
    const { error } = await supabase.from("inboxes").insert({
      email_address: form.email_address.trim().toLowerCase(),
      business_name: form.business_name,
      daily_send_limit: Number(form.daily_send_limit) || 50,
      warmup_status: form.warmup_status,
    });
    if (error) return toast.error(error.message);
    toast.success("Inbox added");
    setOpen(false);
    setForm({ email_address: "", business_name: "", daily_send_limit: 50, warmup_status: "new" });
    void load();
  }

  async function update(id: string, patch: Partial<Inbox>) {
    const { error } = await supabase.from("inboxes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  }

  return (
    <FounderLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inboxes</h1>
            <p className="text-muted-foreground text-sm mt-1">Each business inbox routes outbound communications through the sanity engine.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add inbox</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New inbox</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Email address *</Label><Input value={form.email_address} onChange={(e) => setForm({ ...form, email_address: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Daily send limit</Label><Input type="number" value={form.daily_send_limit} onChange={(e) => setForm({ ...form, daily_send_limit: Number(e.target.value) })} /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Warmup status</Label>
                  <Select value={form.warmup_status} onValueChange={(v) => setForm({ ...form, warmup_status: v as Inbox["warmup_status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="warming">Warming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : inboxes.length === 0 ? (
          <Card className="tech-card"><CardContent className="p-8 text-center text-muted-foreground text-sm">No inboxes yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {inboxes.map((i) => {
              const pct = i.daily_send_limit > 0 ? Math.min(100, (i.current_send_count / i.daily_send_limit) * 100) : 0;
              return (
                <Card key={i.id} className="tech-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-base">{i.email_address}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{i.business_name || "Unassigned business"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select value={i.warmup_status} onValueChange={(v) => update(i.id, { warmup_status: v as Inbox["warmup_status"] })}>
                          <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="warming">Warming</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch checked={i.active} onCheckedChange={(v) => update(i.id, { active: v })} />
                          <Badge variant={i.active ? "default" : "secondary"}>{i.active ? "Active" : "Paused"}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-1.5 w-full rounded bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">{i.current_send_count} / {i.daily_send_limit} sent today</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default CRMInboxes;