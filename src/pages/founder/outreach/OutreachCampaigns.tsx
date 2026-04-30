import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Play, Pause, Send, Megaphone } from "lucide-react";

type Campaign = { id: string; business_name: string; campaign_name: string; status: "active" | "paused"; created_at: string };
type Sequence = { id: string; campaign_id: string; step_number: number; subject: string; body: string; delay_days: number };

const STEP_DELAYS: Record<number, number> = { 1: 0, 2: 3, 3: 7, 4: 14 };

const OutreachCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sequences, setSequences] = useState<Record<string, Sequence[]>>({});
  const [newName, setNewName] = useState("");
  const [newBiz, setNewBiz] = useState("");
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [steps, setSteps] = useState<Sequence[]>([]);

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: c } = await supabase.from("outreach_campaigns").select("*").order("created_at", { ascending: false });
    const list = (c as Campaign[]) ?? [];
    setCampaigns(list);
    if (list.length) {
      const { data: s } = await supabase.from("outreach_sequences").select("*").in("campaign_id", list.map((x) => x.id));
      const map: Record<string, Sequence[]> = {};
      (s as Sequence[] | null)?.forEach((row) => { (map[row.campaign_id] ||= []).push(row); });
      Object.values(map).forEach((arr) => arr.sort((a, b) => a.step_number - b.step_number));
      setSequences(map);
    } else setSequences({});
  }

  async function createCampaign() {
    if (!newName.trim() || !newBiz.trim()) { toast.error("Name and business required"); return; }
    const { error } = await supabase.from("outreach_campaigns").insert({ campaign_name: newName.trim(), business_name: newBiz.trim(), status: "paused" });
    if (error) { toast.error(error.message); return; }
    setNewName(""); setNewBiz("");
    toast.success("Campaign created (paused). Add sequences & inboxes, then activate.");
    void load();
  }

  async function setStatus(c: Campaign, status: "active" | "paused") {
    const { error } = await supabase.from("outreach_campaigns").update({ status }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  function openEditor(c: Campaign) {
    setEditing(c);
    const existing = sequences[c.id] ?? [];
    const filled: Sequence[] = [1, 2, 3, 4].map((n) => existing.find((s) => s.step_number === n) ?? {
      id: "", campaign_id: c.id, step_number: n, subject: "", body: "", delay_days: STEP_DELAYS[n],
    });
    setSteps(filled);
  }

  async function saveSequences() {
    if (!editing) return;
    for (const s of steps) {
      if (!s.subject.trim() && !s.body.trim()) continue;
      const payload = {
        campaign_id: editing.id, step_number: s.step_number, subject: s.subject,
        body: s.body, delay_days: STEP_DELAYS[s.step_number] ?? s.delay_days,
      };
      const { error } = await supabase.from("outreach_sequences").upsert(payload, { onConflict: "campaign_id,step_number" });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Sequence saved");
    setEditing(null);
    void load();
  }

  async function scheduleBatch(c: Campaign) {
    const { data, error } = await supabase.functions.invoke("outreach-schedule-batch", {
      body: { campaign_id: c.id, max_contacts: 50 },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Scheduled ${data?.scheduled ?? 0} sends across ${data?.contacts ?? 0} contacts`);
  }

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Outreach Campaigns</h1>
          <p className="text-sm text-muted-foreground">Define 4-step sequences and schedule sends. Sanity layer enforces blocks automatically.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />New Campaign</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1"><Label>Business</Label><Input value={newBiz} onChange={(e) => setNewBiz(e.target.value)} placeholder="Liftor AI" /></div>
            <div className="space-y-1"><Label>Campaign name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Q2 Enterprise Outreach" /></div>
            <Button onClick={createCampaign}>Create</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" />All Campaigns</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {campaigns.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No campaigns yet.</p> :
                campaigns.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.campaign_name}</p>
                      <p className="text-xs text-muted-foreground">{c.business_name} · {(sequences[c.id] ?? []).length}/4 steps</p>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Badge variant={c.status === "active" ? "default" : "outline"}>{c.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => openEditor(c)}>Edit sequence</Button>
                      <Button size="sm" variant="outline" onClick={() => scheduleBatch(c)} disabled={c.status !== "active" || (sequences[c.id] ?? []).length === 0}>
                        <Send className="h-3 w-3 mr-1" />Schedule
                      </Button>
                      {c.status === "active" ? (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(c, "paused")}><Pause className="h-3 w-3" /></Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(c, "active")}><Play className="h-3 w-3" /></Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Sequence: {editing?.campaign_name}</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {steps.map((s, idx) => (
                <div key={s.step_number} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Step {s.step_number}</p>
                    <Badge variant="outline">Day {STEP_DELAYS[s.step_number]}</Badge>
                  </div>
                  <Input placeholder="Subject" value={s.subject} onChange={(e) => {
                    const next = [...steps]; next[idx] = { ...s, subject: e.target.value }; setSteps(next);
                  }} />
                  <Textarea placeholder="Body (plain text)" rows={4} value={s.body} onChange={(e) => {
                    const next = [...steps]; next[idx] = { ...s, body: e.target.value }; setSteps(next);
                  }} />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveSequences}>Save sequence</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
};

export default OutreachCampaigns;
