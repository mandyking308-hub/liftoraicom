import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import CommercialHandoffPanel from "@/components/founder/commercial/CommercialHandoffPanel";
import LiveCommercialAgentsPanel from "@/components/founder/commercial/LiveCommercialAgentsPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileInput, Sparkles, Monitor, CheckCircle2, Clock } from "lucide-react";

type Proposal = {
  id: string; title: string; status: string; business_name: string;
  contact_id: string; created_at: string; sent_at: string | null;
  include_demo: boolean; estimated_cost_range: string;
};
type Contact = { id: string; name: string; company: string; email: string; status: string };

const statusVariant: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/15 text-primary",
  viewed: "bg-blue-500/15 text-blue-400",
  accepted: "bg-green-500/15 text-green-400",
  rejected: "bg-destructive/15 text-destructive",
  expired: "bg-orange-500/15 text-orange-400",
};

export default function InternalProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [contactId, setContactId] = useState("");
  const [includeDemo, setIncludeDemo] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, accepted: 0, demos: 0 });

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: cs }, { data: demos }] = await Promise.all([
      supabase.from("internal_proposals").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("id,name,company,email,status").eq("status", "QUALIFIED").order("name"),
      supabase.from("demo_access").select("id,status"),
    ]);
    const list = (ps || []) as Proposal[];
    setProposals(list);
    setContacts((cs || []) as Contact[]);
    setStats({
      total: list.length,
      sent: list.filter(p => ["sent","viewed"].includes(p.status)).length,
      accepted: list.filter(p => p.status === "accepted").length,
      demos: (demos || []).filter((d: any) => d.status === "active").length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!contactId) { toast({ title: "Pick a QUALIFIED contact", variant: "destructive" }); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("internal-proposal-generate", {
      body: { contact_id: contactId, include_demo: includeDemo },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({ title: "Generation failed", description: (error?.message || (data as any)?.error), variant: "destructive" });
      return;
    }
    toast({ title: "Proposal generated" });
    setOpen(false); setContactId("");
    load();
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileInput size={24} /> Internal Proposals</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-generated proposals tied to QUALIFIED contacts. Send, accept, optionally provision demo access.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Sparkles size={16} className="mr-2" /> Generate Proposal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate New Proposal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Contact (QUALIFIED only)</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger><SelectValue placeholder="Select contact…" /></SelectTrigger>
                    <SelectContent>
                      {contacts.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">No QUALIFIED contacts yet.</div>}
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name || c.email} {c.company && `· ${c.company}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <div className="text-sm font-medium">Include demo access</div>
                    <div className="text-xs text-muted-foreground">Creates a 7-day sandbox demo link.</div>
                  </div>
                  <Switch checked={includeDemo} onCheckedChange={setIncludeDemo} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={creating || !contactId}>{creating ? "Generating…" : "Generate"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<FileInput size={18} />} label="Total Proposals" value={stats.total} />
          <StatCard icon={<Clock size={18} />} label="Sent / Viewed" value={stats.sent} />
          <StatCard icon={<CheckCircle2 size={18} />} label="Accepted" value={stats.accepted} />
          <StatCard icon={<Monitor size={18} />} label="Active Demos" value={stats.demos} />
        </div>

        <Card className="tech-card divide-y divide-border/50">
          {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {!loading && proposals.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No proposals yet. Generate your first one above.</div>
          )}
          {proposals.map(p => (
            <Link key={p.id} to={`/founder/internal-proposals/${p.id}`} className="block p-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{p.title || "Untitled proposal"}</h3>
                    <Badge className={statusVariant[p.status] || "bg-muted"}>{p.status}</Badge>
                    {p.include_demo && <Badge variant="outline">demo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {p.business_name || "—"} · {p.estimated_cost_range || "—"} · created {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </Card>
        <CommercialHandoffPanel />
        <LiveCommercialAgentsPanel />
      </div>
    </FounderLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="tech-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon} {label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}