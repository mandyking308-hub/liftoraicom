import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Phone, Lock, AlertTriangle, FileText, Brain, Plus, ShieldAlert } from "lucide-react";
import { CSLayout, CSEmptyState, CSSection } from "./_shared";

function redact(num?: string | null) {
  if (!num) return "—";
  const s = String(num);
  if (s.length <= 4) return "***" + s;
  return s.slice(0, 3) + "•••" + s.slice(-2);
}

export default function CallLogs() {
  const sb: any = supabase;
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [hideTest, setHideTest] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["cs-call-logs", hideTest],
    queryFn: async () => {
      let q = sb.from("customer_sales_call_logs").select("*").order("started_at", { ascending: false }).limit(200);
      if (hideTest) q = q.is("test_label", null);
      return (await q).data ?? [];
    },
  });

  const stats = useMemo(() => {
    const total = logs.length;
    const tests = logs.filter((l: any) => l.test_label === "LIVE_INTERNAL_TEST").length;
    const noConsent = logs.filter((l: any) => !l.consent_recorded).length;
    const escalated = logs.filter((l: any) => !!l.escalation_reason).length;
    return { total, tests, noConsent, escalated };
  }, [logs]);

  return (
    <CSLayout
      title="Call Logs"
      subtitle="Voice/phone/web-call records with consent, transcript memory and post-call analysis. External calls remain provider-gated."
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px]"><Switch checked={hideTest} onCheckedChange={setHideTest} /><span>Hide TEST</span></div>
          <Button size="sm" onClick={() => setCreating(true)}><Plus size={14} className="mr-1" />Upload transcript (internal)</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="LIVE_INTERNAL_TEST" value={stats.tests} tone="blue" />
        <Stat label="Missing consent" value={stats.noConsent} tone="yellow" />
        <Stat label="Escalated" value={stats.escalated} tone="red" />
      </div>

      <CSSection title={`${logs.length} call${logs.length === 1 ? "" : "s"}`}>
        {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : logs.length === 0 ? (
            <CSEmptyState
              title="No calls logged yet"
              hint="Once a provider is connected and webhooks fire, calls appear here. You can also upload a LIVE_INTERNAL_TEST transcript to validate analysis."
            />
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 px-2">Started</th>
                  <th className="py-2 px-2">Provider</th>
                  <th className="py-2 px-2">Dir</th>
                  <th className="py-2 px-2">From</th>
                  <th className="py-2 px-2">To</th>
                  <th className="py-2 px-2">Dur</th>
                  <th className="py-2 px-2">Consent</th>
                  <th className="py-2 px-2">Outcome</th>
                  <th className="py-2 px-2">Flags</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {logs.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-background/40">
                    <td className="py-2 px-2">{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</td>
                    <td className="py-2 px-2">{c.provider_name ?? "—"}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{c.call_direction ?? "—"}</Badge></td>
                    <td className="py-2 px-2 font-mono">{redact(c.from_number)}</td>
                    <td className="py-2 px-2 font-mono">{redact(c.to_number)}</td>
                    <td className="py-2 px-2">{c.duration_seconds ?? 0}s</td>
                    <td className="py-2 px-2">{c.consent_recorded ? "yes" : (c.recording_notice_given ? "notice" : "no")}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{c.outcome ?? "—"}</Badge></td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {c.test_label === "LIVE_INTERNAL_TEST" && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-300 border-blue-500/30">TEST</Badge>}
                        {!c.consent_recorded && c.transcript_text && <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><ShieldAlert size={9} className="mr-0.5" />consent</Badge>}
                        {!c.transcript_text && <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-300 border-orange-500/30">no transcript</Badge>}
                        {c.escalation_reason && <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-300 border-red-500/30">escalate</Badge>}
                        <Badge variant="outline" className="text-[9px]"><Lock size={9} className="mr-0.5" />no external send</Badge>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(c)}><FileText size={12} className="mr-1" />Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CSSection>

      {creating && <UploadTranscriptCard onCancel={() => setCreating(false)} onCreated={(row) => { setCreating(false); setSelected(row); qc.invalidateQueries({ queryKey: ["cs-call-logs"] }); }} />}
      {selected && <CallDetail call={selected} onClose={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["cs-call-logs"] }); }} />}
    </CSLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "blue" | "yellow" | "red" }) {
  const toneCls = tone === "blue" ? "border-blue-500/30 bg-blue-500/5"
    : tone === "yellow" ? "border-yellow-500/30 bg-yellow-500/5"
    : tone === "red" ? "border-red-500/30 bg-red-500/5"
    : "border-border/60 bg-background/40";
  return (
    <div className={`rounded-md border ${toneCls} p-2`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function UploadTranscriptCard({ onCancel, onCreated }: { onCancel: () => void; onCreated: (row: any) => void }) {
  const sb: any = supabase;
  const [form, setForm] = useState<any>({
    provider_name: "internal_test",
    call_direction: "inbound",
    from_number: "",
    to_number: "",
    customer_email: "",
    transcript_text: "",
    consent_recorded: true,
    recording_notice_given: true,
    conversation_id: "",
    test_label: "LIVE_INTERNAL_TEST",
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["cs-conv-min-for-call"],
    queryFn: async () => (await sb.from("customer_sales_conversations").select("id,customer_name,customer_email").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  async function create() {
    if (!form.transcript_text.trim()) { toast.error("Paste a transcript first"); return; }
    const startedAt = new Date().toISOString();
    const payload: any = {
      provider_name: form.provider_name,
      call_direction: form.call_direction,
      from_number: form.from_number || null,
      to_number: form.to_number || null,
      started_at: startedAt,
      ended_at: startedAt,
      duration_seconds: 0,
      transcript_text: form.transcript_text,
      consent_recorded: form.consent_recorded,
      recording_notice_given: form.recording_notice_given,
      conversation_id: form.conversation_id || null,
      test_label: form.test_label || null,
    };
    const { data, error } = await sb.from("customer_sales_call_logs").insert(payload).select("*").maybeSingle();
    if (error) { toast.error(error.message); return; }
    toast.success("Call log created — opening analyser");
    onCreated(data);
  }

  return (
    <Card className="tech-card border-primary/40 mt-4">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Upload transcript (internal LIVE_INTERNAL_TEST)</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 text-xs">
        <Field label="Provider"><Input value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} /></Field>
        <Field label="Direction">
          <Select value={form.call_direction} onValueChange={v => setForm({ ...form, call_direction: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["inbound","outbound"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="From"><Input value={form.from_number} onChange={e => setForm({ ...form, from_number: e.target.value })} /></Field>
        <Field label="To"><Input value={form.to_number} onChange={e => setForm({ ...form, to_number: e.target.value })} /></Field>
        <Field label="Link to conversation (optional)">
          <Select value={form.conversation_id || "_none"} onValueChange={v => setForm({ ...form, conversation_id: v === "_none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {conversations.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.customer_name ?? c.customer_email ?? c.id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Test label"><Input value={form.test_label} onChange={e => setForm({ ...form, test_label: e.target.value })} placeholder="LIVE_INTERNAL_TEST" /></Field>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-[10px] uppercase">Transcript</Label>
          <Textarea rows={8} value={form.transcript_text} onChange={e => setForm({ ...form, transcript_text: e.target.value })} placeholder="Paste call transcript here…" />
        </div>
        <div className="md:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={form.consent_recorded} onChange={e => setForm({ ...form, consent_recorded: e.target.checked })} />Consent recorded</label>
          <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={form.recording_notice_given} onChange={e => setForm({ ...form, recording_notice_given: e.target.checked })} />Recording notice given</label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={create}>Save call log</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div className="space-y-1"><Label className="text-[10px] uppercase">{label}</Label>{children}</div>;
}

function CallDetail({ call, onClose }: { call: any; onClose: () => void }) {
  const sb: any = supabase;
  const qc = useQueryClient();
  const [analysing, setAnalysing] = useState(false);

  const { data: fresh } = useQuery({
    queryKey: ["cs-call-log", call.id],
    queryFn: async () => (await sb.from("customer_sales_call_logs").select("*").eq("id", call.id).maybeSingle()).data,
    initialData: call,
    refetchInterval: 4000,
  });
  const c = fresh || call;
  const analysis = (c?.analysis_output && typeof c.analysis_output === "object") ? c.analysis_output : {};

  async function runAnalysis() {
    if (!c.transcript_text) { toast.error("No transcript on this call"); return; }
    setAnalysing(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-voice-post-call-analysis", {
        body: { call_log_id: c.id, conversation_id: c.conversation_id, test_label: c.test_label, live_internal_test: c.test_label === "LIVE_INTERNAL_TEST" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Analysis failed");
      toast.success(`Analysed · outcome: ${data.call_outcome ?? "—"}${data.approval_id ? " · approval queued" : ""}${data.close_action_id ? " · close action drafted" : ""}`);
      qc.invalidateQueries({ queryKey: ["cs-call-log", c.id] });
      qc.invalidateQueries({ queryKey: ["cs-call-logs"] });
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally { setAnalysing(false); }
  }

  return (
    <Card className="tech-card border-primary/50 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Phone size={14} />Call · {c.provider_name ?? "unknown"} · {c.call_direction ?? "—"}</span>
          <div className="flex gap-2 items-center">
            {c.test_label === "LIVE_INTERNAL_TEST" && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">TEST · excluded from revenue</Badge>}
            <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" />External sends gated</Badge>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="grid md:grid-cols-4 gap-3">
          <Meta k="Provider call ID" v={c.provider_call_id ?? "—"} />
          <Meta k="Started" v={c.started_at ? new Date(c.started_at).toLocaleString() : "—"} />
          <Meta k="Ended" v={c.ended_at ? new Date(c.ended_at).toLocaleString() : "—"} />
          <Meta k="Duration" v={`${c.duration_seconds ?? 0}s`} />
          <Meta k="From" v={redact(c.from_number)} />
          <Meta k="To" v={redact(c.to_number)} />
          <Meta k="Consent recorded" v={c.consent_recorded ? "yes" : "no"} />
          <Meta k="Recording notice" v={c.recording_notice_given ? "yes" : "no"} />
          <Meta k="Outcome" v={c.outcome ?? "—"} />
          <Meta k="Next step" v={c.next_step ?? "—"} />
          <Meta k="Recording URL" v={c.recording_url ?? "—"} />
          <Meta k="Contact linked" v={c.contact_id ?? "—"} />
        </div>

        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs">Transcript</CardTitle></CardHeader>
          <CardContent>
            {c.transcript_text ? (
              <pre className="whitespace-pre-wrap text-[11px] max-h-64 overflow-auto">{c.transcript_text}</pre>
            ) : <p className="text-muted-foreground">No transcript captured.</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="sm" onClick={runAnalysis} disabled={analysing || !c.transcript_text}><Brain size={12} className="mr-1" />{analysing ? "Analysing…" : "Run post-call analysis"}</Button>
        </div>

        {c.analysed_at && (
          <Card className="tech-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Brain size={12} />Post-call analysis
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.analysed_at).toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Meta k="Customer need" v={c.customer_need ?? "—"} />
                <Meta k="Customer pain" v={c.customer_pain ?? "—"} />
                <Meta k="Product match" v={analysis.product_match ?? "—"} />
                <Meta k="Qualification" v={c.qualification_score != null ? `${Number(c.qualification_score).toFixed(0)}/100` : "—"} />
                <Meta k="Close probability" v={c.close_probability != null ? `${Math.round(Number(c.close_probability) * 100)}%` : "—"} />
                <Meta k="Sentiment" v={c.sentiment_score != null ? Number(c.sentiment_score).toFixed(2) : "—"} />
              </div>
              <div className="space-y-2">
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Transcript summary</div><p>{c.transcript_summary ?? "—"}</p></div>
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Recommended next step</div><p>{c.recommended_next_step ?? "—"}</p></div>
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Follow-up draft (internal)</div><p className="whitespace-pre-wrap">{c.follow_up_draft ?? "—"}</p></div>
                <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Close action suggestion</div><p>{c.close_action_suggestion ?? "—"}</p></div>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-1">
                {(c.buying_signals || []).map((s: string) => <Badge key={s} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">{s}</Badge>)}
                {(c.objections || []).map((s: string) => <Badge key={s} variant="outline" className="bg-orange-500/10 text-orange-300 border-orange-500/30 text-[10px]">{s}</Badge>)}
              </div>
              {c.escalation_reason && (
                <div className="md:col-span-2 flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-200">
                  <AlertTriangle size={12} className="mt-0.5" />
                  <div><div className="font-medium">Escalation needed</div>{c.escalation_reason}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function Meta({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/20 py-1">
      <span className="text-[10px] uppercase text-muted-foreground">{k}</span>
      <span className="text-right truncate max-w-[60%]">{v ?? "—"}</span>
    </div>
  );
}