import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as RLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Brain, Plus, Lock, AlertTriangle, ArrowRight, FileText, User } from "lucide-react";
import { CSLayout, CSEmptyState, CSSection } from "./_shared";

const STAGES = [
  "greeting","consent_notice","discovery","qualification","product_match",
  "objection_handling","close_attempt","close_action_prepared","follow_up_needed",
  "closed_won","closed_lost","escalated",
];

export default function Conversations() {
  const qc = useQueryClient();
  const sb: any = supabase;
  const [selected, setSelected] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["cs-conversations"],
    queryFn: async () => {
      const { data } = await sb.from("customer_sales_conversations").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const { data: playbooks = [] } = useQuery({
    queryKey: ["cs-playbooks-min"],
    queryFn: async () => {
      const { data } = await sb.from("customer_sales_playbooks").select("id, playbook_name, use_case, product_id").eq("active", true);
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["cs-products-min2"],
    queryFn: async () => (await sb.from("customer_sales_products").select("id, product_name")).data ?? [],
  });

  return (
    <CSLayout
      title="Conversations"
      subtitle="Internal sales conversation intelligence. The Brain analyses every message; external customer replies stay approval-gated."
      actions={<Button size="sm" onClick={() => setCreating(true)}><Plus size={14} className="mr-1" />New conversation</Button>}
    >
      <CSSection title={`${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : conversations.length === 0 ? (
          <CSEmptyState title="No conversations yet" hint="Create an internal conversation to run the Sales Conversation Brain." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 px-2">Customer</th>
                  <th className="py-2 px-2">Channel</th>
                  <th className="py-2 px-2">Dir</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Qual</th>
                  <th className="py-2 px-2">Close</th>
                  <th className="py-2 px-2">Next action</th>
                  <th className="py-2 px-2">Flags</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {conversations.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-background/40">
                    <td className="py-2 px-2">
                      {r.customer_name ?? r.customer_email ?? r.customer_phone ?? "—"}
                      {r.test_label === "LIVE_INTERNAL_TEST" && <Badge variant="outline" className="ml-1 text-[9px] bg-blue-500/10 text-blue-300 border-blue-500/30">TEST</Badge>}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{r.channel}</td>
                    <td className="py-2 px-2 text-muted-foreground">{r.direction}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{r.conversation_status}</Badge></td>
                    <td className="py-2 px-2">{r.qualification_score == null ? "—" : Number(r.qualification_score).toFixed(0)}</td>
                    <td className="py-2 px-2">{r.close_probability == null ? "—" : `${Math.round(Number(r.close_probability) * 100)}%`}</td>
                    <td className="py-2 px-2 truncate max-w-[260px]">{r.recommended_next_action ?? "—"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        {r.founder_approval_required && <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">approval</Badge>}
                        {r.external_action_locked && <Badge variant="outline" className="text-[9px]"><Lock size={8} className="mr-0.5" />locked</Badge>}
                        {(r.buying_signals?.length ?? 0) > 0 && <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">{r.buying_signals.length} signals</Badge>}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Brain size={12} className="mr-1" />Brain</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CSSection>

      {creating && (
        <NewConversationCard
          playbooks={playbooks}
          products={products}
          onCancel={() => setCreating(false)}
          onCreated={(row) => { setCreating(false); setSelected(row); qc.invalidateQueries({ queryKey: ["cs-conversations"] }); }}
        />
      )}

      {selected && (
        <BrainPanel
          conversation={selected}
          playbooks={playbooks}
          onClose={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["cs-conversations"] }); }}
        />
      )}
    </CSLayout>
  );
}

function NewConversationCard({ playbooks, products, onCancel, onCreated }: any) {
  const sb: any = supabase;
  const [form, setForm] = useState<any>({
    customer_name: "", customer_email: "", channel: "manual", direction: "inbound",
    product_id: null, playbook_id: null,
  });
  async function create() {
    const payload = { ...form };
    if (!payload.product_id) delete payload.product_id;
    if (!payload.playbook_id) delete payload.playbook_id;
    const { data, error } = await sb.from("customer_sales_conversations").insert(payload).select("*").maybeSingle();
    if (error) { toast.error(error.message); return; }
    toast.success("Conversation created");
    onCreated(data);
  }
  return (
    <Card className="tech-card border-primary/40 mt-4">
      <CardHeader className="pb-2"><CardTitle className="text-sm">New internal conversation</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 text-xs">
        <LabeledInput label="Customer name" value={form.customer_name} onChange={(v: string) => setForm({ ...form, customer_name: v })} />
        <LabeledInput label="Customer email" value={form.customer_email} onChange={(v: string) => setForm({ ...form, customer_email: v })} />
        <div className="space-y-1">
          <Label className="text-[10px] uppercase">Channel</Label>
          <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["manual","voice","chat","email","sms","whatsapp"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase">Direction</Label>
          <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["inbound","outbound"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase">Product</Label>
          <Select value={form.product_id || "_none"} onValueChange={v => setForm({ ...form, product_id: v === "_none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase">Playbook</Label>
          <Select value={form.playbook_id || "_none"} onValueChange={v => setForm({ ...form, playbook_id: v === "_none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {playbooks.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.playbook_name} ({p.use_case})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={create}>Create</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase">{label}</Label>
      <Input value={value || ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function BrainPanel({ conversation, playbooks, onClose }: { conversation: any; playbooks: any[]; onClose: () => void }) {
  const sb: any = supabase;
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [playbookId, setPlaybookId] = useState<string | null>(conversation.playbook_id || null);

  const { data: state } = useQuery({
    queryKey: ["cs-state", conversation.id],
    queryFn: async () => (await sb.from("customer_sales_conversation_states").select("*").eq("conversation_id", conversation.id).maybeSingle()).data,
    refetchInterval: 4000,
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["cs-brain-runs", conversation.id],
    queryFn: async () => (await sb.from("customer_sales_brain_runs").select("*").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(10)).data ?? [],
    refetchInterval: 4000,
  });

  async function runBrain() {
    if (!message.trim()) { toast.error("Paste a customer message first"); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-conversation-brain", {
        body: { conversation_id: conversation.id, customer_message: message, playbook_id: playbookId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Brain run failed");
      toast.success("Brain analysis complete");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["cs-state", conversation.id] });
      qc.invalidateQueries({ queryKey: ["cs-brain-runs", conversation.id] });
      qc.invalidateQueries({ queryKey: ["cs-conversations"] });
    } catch (e: any) {
      toast.error(e.message || "Brain run failed");
    } finally {
      setRunning(false);
    }
  }

  const brain: any = state?.brain_output || {};
  const currentStage: string = state?.stage || "greeting";

  const { data: callLogs = [] } = useQuery({
    queryKey: ["cs-calllogs-conv", conversation.id],
    queryFn: async () => (await sb.from("customer_sales_call_logs").select("*").eq("conversation_id", conversation.id).order("started_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: 6000,
  });

  return (
    <Card className="tech-card border-primary/50 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Brain size={14} />Sales Conversation Brain — {conversation.customer_name || conversation.customer_email || "conversation"}</span>
          <div className="flex gap-2 items-center">
            {conversation.contact_id && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30"><User size={9} className="mr-0.5" />CRM linked</Badge>}
            {conversation.test_label === "LIVE_INTERNAL_TEST" && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">LIVE_INTERNAL_TEST</Badge>}
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]"><Lock size={9} className="mr-1" />Internal only</Badge>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(conversation.transcript_summary || conversation.customer_memory_summary || conversation.call_outcome) && (
          <Card className="tech-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><FileText size={12} />Customer memory & call outcome</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3 text-xs">
              <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Transcript summary</div><p>{conversation.transcript_summary ?? "—"}</p></div>
              <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Customer memory</div><p>{conversation.customer_memory_summary ?? "—"}</p></div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Call outcome</div>
                <p><Badge variant="outline" className="text-[10px]">{conversation.call_outcome ?? "—"}</Badge></p>
                {conversation.linked_contact_email && <p className="mt-1 text-[10px] text-muted-foreground">CRM: {conversation.linked_contact_email}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-3">
          <StageMachine current={currentStage} />
          <Card className="tech-card md:col-span-2">
            <CardContent className="p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <Label className="text-[10px] uppercase">Playbook</Label>
                <Select value={playbookId || "_none"} onValueChange={v => setPlaybookId(v === "_none" ? null : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {playbooks.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.playbook_name} ({p.use_case})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea rows={4} placeholder="Paste the customer message or transcript chunk…" value={message} onChange={e => setMessage(e.target.value)} />
              <div className="flex justify-end">
                <Button size="sm" onClick={runBrain} disabled={running}><Brain size={14} className="mr-1" />{running ? "Analysing…" : "Run brain (internal)"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <Card className="tech-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs">Brain output</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Row k="Customer need" v={brain.customer_need} />
              <Row k="Qualification score" v={brain.qualification_score != null ? `${brain.qualification_score}/100` : null} />
              <Row k="Close probability" v={brain.close_probability != null ? `${Math.round(brain.close_probability * 100)}%` : null} />
              <Row k="Recommended action" v={brain.recommended_next_action} />
              <Row k="Next best question" v={brain.next_best_question} />
              <Row k="Suggested follow-up" v={brain.suggested_follow_up} />
              <Row k="Founder approval required" v={brain.founder_approval_required ? "yes" : (brain.founder_approval_required === false ? "no" : null)} />
              {brain.escalation_reason && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-[11px]">
                  <AlertTriangle size={12} className="mt-0.5" />
                  <div><div className="font-medium">Escalation</div>{brain.escalation_reason}</div>
                </div>
              )}
              {(brain.claim_violations || []).length > 0 && (
                <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-200 text-[11px]">
                  <div className="font-medium">Claim violations</div>
                  <ul className="list-disc pl-4">{brain.claim_violations.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="tech-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs">Signals & objections</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Buying signals</div>
                <div className="flex flex-wrap gap-1">
                  {(brain.buying_signals || []).length === 0 ? <span className="text-muted-foreground">none</span>
                    : brain.buying_signals.map((s: string) => <Badge key={s} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">{s}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Objections</div>
                <div className="flex flex-wrap gap-1">
                  {(brain.objections || []).length === 0 ? <span className="text-muted-foreground">none</span>
                    : brain.objections.map((s: string) => <Badge key={s} variant="outline" className="bg-orange-500/10 text-orange-300 border-orange-500/30 text-[10px]">{s}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Sensitive signals</div>
                <div className="flex flex-wrap gap-1">
                  {(brain.sensitive_signals || []).length === 0 ? <span className="text-muted-foreground">none</span>
                    : brain.sensitive_signals.map((s: string) => <Badge key={s} variant="outline" className="bg-red-500/10 text-red-300 border-red-500/30 text-[10px]">{s}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <CSSection title="Recent brain runs" description="Logged via AI Gateway → AI Usage Ledger">
          {runs.length === 0 ? <p className="text-xs text-muted-foreground">No runs yet.</p> : (
            <div className="space-y-1 text-[11px]">
              {runs.map((r: any) => (
                <div key={r.id} className="flex justify-between border-b border-border/30 py-1">
                  <span>{new Date(r.created_at).toLocaleTimeString()} · {r.model || "—"}</span>
                  <span className="text-muted-foreground">{r.status} · in {r.tokens_in ?? "—"} / out {r.tokens_out ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </CSSection>

        <CSSection title={`Call logs (${callLogs.length})`} description="Voice/web-call records linked to this conversation">
          {callLogs.length === 0 ? <p className="text-xs text-muted-foreground">No calls logged for this conversation yet.</p> : (
            <div className="space-y-1 text-[11px]">
              {callLogs.map((c: any) => (
                <RLink key={c.id} to="/founder/customer-sales/call-logs" className="flex justify-between border-b border-border/30 py-1 hover:bg-background/40">
                  <span>{c.started_at ? new Date(c.started_at).toLocaleString() : "—"} · {c.provider_name ?? "—"} · {c.call_direction ?? "—"}</span>
                  <span className="text-muted-foreground">{c.outcome ?? "no outcome"} · {c.duration_seconds ?? 0}s</span>
                </RLink>
              ))}
            </div>
          )}
        </CSSection>
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex gap-2 justify-between border-b border-border/20 py-1">
      <span className="text-[10px] uppercase text-muted-foreground">{k}</span>
      <span className="text-right">{v ?? "—"}</span>
    </div>
  );
}

function StageMachine({ current }: { current: string }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-xs">Conversation state machine</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-1 text-[11px]">
          {STAGES.map(s => (
            <div key={s} className={`flex items-center gap-2 px-2 py-1 rounded ${current === s ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground"}`}>
              <ArrowRight size={10} />{s}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}