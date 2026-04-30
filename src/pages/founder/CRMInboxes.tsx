import { useEffect, useState } from "react";
import { Plus, Copy } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import SimulatedSendingBanner from "@/components/outreach/SimulatedSendingBanner";
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
  sending_domain_id: string | null;
  inbound_webhook_url: string;
};

type SendingDomain = { id: string; domain_name: string; reputation_score: number };

const DEFAULT_INBOUND_WEBHOOK = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outreach-inbound-webhook`;

const CRMInboxes = () => {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [domains, setDomains] = useState<SendingDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email_address: "",
    business_name: "",
    daily_send_limit: 50,
    warmup_status: "new" as Inbox["warmup_status"],
    sending_domain_id: "",
    new_domain_name: "",
    inbound_webhook_url: DEFAULT_INBOUND_WEBHOOK,
  });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: ix, error: ixErr }, { data: dom }] = await Promise.all([
      supabase.from("inboxes").select("*").order("created_at", { ascending: false }),
      supabase.from("sending_domains").select("id,domain_name,reputation_score").order("domain_name"),
    ]);
    if (ixErr) toast.error(ixErr.message);
    setInboxes((ix as Inbox[]) ?? []);
    setDomains((dom as SendingDomain[]) ?? []);
    setLoading(false);
  }

  async function create() {
    if (!form.email_address.trim()) return toast.error("Email required");
    let sendingDomainId: string | null = form.sending_domain_id || null;
    if (!sendingDomainId && form.new_domain_name.trim()) {
      const name = form.new_domain_name.trim().toLowerCase();
      const { data: dom, error: domErr } = await supabase
        .from("sending_domains")
        .insert({ domain_name: name })
        .select("id")
        .single();
      if (domErr) return toast.error(`Domain: ${domErr.message}`);
      sendingDomainId = dom.id;
    }
    if (!sendingDomainId) return toast.error("Select or add a sending domain");
    if (!form.inbound_webhook_url.trim()) return toast.error("Inbound webhook URL required");
    const { error } = await supabase.from("inboxes").insert({
      email_address: form.email_address.trim().toLowerCase(),
      business_name: form.business_name,
      daily_send_limit: Number(form.daily_send_limit) || 50,
      warmup_status: form.warmup_status,
      sending_domain_id: sendingDomainId,
      inbound_webhook_url: form.inbound_webhook_url.trim(),
    });
    if (error) return toast.error(error.message);
    toast.success("Inbox added");
    setOpen(false);
    setForm({
      email_address: "",
      business_name: "",
      daily_send_limit: 50,
      warmup_status: "new",
      sending_domain_id: "",
      new_domain_name: "",
      inbound_webhook_url: DEFAULT_INBOUND_WEBHOOK,
    });
    void load();
  }

  async function update(id: string, patch: Partial<Inbox>) {
    const { error } = await supabase.from("inboxes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  }

  function copyWebhook() {
    void navigator.clipboard.writeText(DEFAULT_INBOUND_WEBHOOK);
    toast.success("Webhook URL copied");
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
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New inbox</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-1.5"><Label className="text-xs">Email address *</Label><Input value={form.email_address} onChange={(e) => setForm({ ...form, email_address: e.target.value })} placeholder="hello@neoncandy.com" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Business name *</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="NeonCandy" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sending domain *</Label>
                  <Select value={form.sending_domain_id || "__new__"} onValueChange={(v) => setForm({ ...form, sending_domain_id: v === "__new__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select or add new" /></SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (<SelectItem key={d.id} value={d.id}>{d.domain_name} · rep {d.reputation_score}</SelectItem>))}
                      <SelectItem value="__new__">+ Add new domain</SelectItem>
                    </SelectContent>
                  </Select>
                  {!form.sending_domain_id && (
                    <Input className="mt-2" value={form.new_domain_name} onChange={(e) => setForm({ ...form, new_domain_name: e.target.value })} placeholder="neoncandy.com" />
                  )}
                  <p className="text-[11px] text-muted-foreground">Configure SPF / DKIM / DMARC at your mail provider (IONOS, etc). Liftor only tracks the domain for reputation pooling.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Inbound webhook URL *</Label>
                  <div className="flex gap-1">
                    <Input value={form.inbound_webhook_url} onChange={(e) => setForm({ ...form, inbound_webhook_url: e.target.value })} className="font-mono text-xs" />
                    <Button type="button" size="icon" variant="outline" onClick={copyWebhook} title="Copy default URL"><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Point your mail provider's reply/bounce webhook here so replies route back to this inbox.</p>
                </div>
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

        <SimulatedSendingBanner />

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