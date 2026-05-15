import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CalendarClock, RefreshCw, AlertTriangle, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const fmt = (d: any) => d ? new Date(d).toLocaleString() : '—';

export default function MeetingCallIntelligencePanel() {
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);

  const { data: meetings, refetch: refMeetings } = useQuery({
    queryKey: ["meeting_call_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meeting_call_records").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: actions, refetch: refActions } = useQuery({
    queryKey: ["meeting_action_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meeting_action_items").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const m = meetings ?? [];
    const a = actions ?? [];
    const now = Date.now();
    return {
      total_meetings: m.length,
      drafts: m.filter((x: any) => x.meeting_status === 'draft').length,
      needs_followup: m.filter((x: any) => Array.isArray(x.followups) && x.followups.length > 0).length,
      with_complaints: m.filter((x: any) => Array.isArray(x.risk_flags) && x.risk_flags.includes('complaint_detected')).length,
      with_upsell: m.filter((x: any) => Array.isArray(x.commitments) && x.commitments.length > 0).length,
      open_actions: a.filter((x: any) => !['done', 'completed', 'dismissed'].includes(String(x.status))).length,
      overdue_actions: a.filter((x: any) => x.due_at && new Date(x.due_at).getTime() < now && !['done','completed','dismissed'].includes(String(x.status))).length,
      founder_review: m.filter((x: any) => x.founder_review_required && x.meeting_status !== 'completed').length,
    };
  }, [meetings, actions]);

  const dryRun = async () => {
    if (!title.trim()) { toast.error("Meeting title required"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("meeting-summary-ingest", { body: { meeting_title: title, summary: notes } });
      if (error) throw error;
      setExtracted(data);
      toast.success("Dry-run complete · no record created");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!title.trim()) { toast.error("Meeting title required"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("meeting-summary-ingest", { body: { meeting_title: title, summary: notes, confirm: "CREATE MEETING RECORD" } });
      if (error) throw error;
      setExtracted(data);
      toast.success(`Meeting captured · ${data?.action_items_created ?? 0} action items`);
      setTitle(""); setNotes("");
      await Promise.all([refMeetings(), refActions()]);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const draftFollowup = async (id: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("meeting-followup-draft", { body: { meeting_id: id } });
      if (error) throw error;
      setDraft(data);
      toast.success("Follow-up draft created · awaiting founder approval");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? 0}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-meeting-call-intelligence">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><CalendarClock size={14} className="text-primary" /> Meetings · Calls · Commitment Intelligence</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-join · No auto-record · No auto-calendar · No auto-email · Founder approval required</Badge>
            <Button size="sm" variant="outline" onClick={() => { refMeetings(); refActions(); }}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Meetings captured" value={summary.total_meetings} />
          <Tile label="Drafts" value={summary.drafts} />
          <Tile label="Needing follow-up" value={summary.needs_followup} tone={summary.needs_followup ? 'text-yellow-300' : ''} />
          <Tile label="Complaint signals" value={summary.with_complaints} tone={summary.with_complaints ? 'text-destructive' : ''} />
          <Tile label="Open actions" value={summary.open_actions} />
          <Tile label="Overdue actions" value={summary.overdue_actions} tone={summary.overdue_actions ? 'text-destructive' : ''} />
          <Tile label="Founder review" value={summary.founder_review} tone={summary.founder_review ? 'text-yellow-300' : ''} />
          <Tile label="Commitment-rich" value={summary.with_upsell} />
        </div>

        <div className="text-[11px] text-muted-foreground italic flex items-start gap-1">
          <AlertTriangle size={11} className="mt-0.5" />
          Capture only. Liftor never joins, records, or sends calendar invites or follow-up emails. Every external action requires founder approval.
        </div>

        <div className="rounded-lg border border-border/50 bg-secondary/10 p-3 space-y-2">
          <div className="text-xs font-medium">Capture meeting / call</div>
          <Input placeholder="Meeting title (e.g. Acme Q3 review)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
          <Textarea placeholder="Paste notes, transcript, or summary…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="text-xs" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={dryRun} disabled={busy}><Sparkles size={12} className="mr-1" />Dry-run extract</Button>
            <Button size="sm" variant="outline" onClick={create} disabled={busy}><FileText size={12} className="mr-1" />Create record</Button>
          </div>
        </div>

        {extracted && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2 flex items-center justify-between">
              <span>Extracted signals · {extracted.mode}</span>
              <Button size="sm" variant="ghost" onClick={() => setExtracted(null)}>Close</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              {Object.entries(extracted.extracted ?? {}).map(([k, v]: any) => (
                <div key={k} className="rounded border border-border/30 p-2">
                  <div className="font-medium">{k} · {v.length}</div>
                  <ul className="text-muted-foreground mt-1 space-y-0.5 max-h-24 overflow-auto">
                    {v.slice(0, 4).map((s: string, i: number) => <li key={i} className="truncate">• {s}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            {(extracted.risk_flags ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">{extracted.risk_flags.map((f: string) => <Badge key={f} variant="outline" className="text-[9px] border-destructive/40 text-destructive">{f}</Badge>)}</div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Recent meetings</div>
            {(meetings ?? []).length === 0 ? (
              <div className="text-[11px] text-muted-foreground">No meetings captured yet.</div>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-auto text-[11px]">
                {(meetings ?? []).map((m: any) => (
                  <li key={m.id} className="flex items-center justify-between border-b border-border/20 py-1 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-medium truncate">{m.meeting_title}</span>
                      {m.meeting_type && <Badge variant="outline" className="text-[9px]">{m.meeting_type}</Badge>}
                      <Badge variant="outline" className="text-[9px]">{m.meeting_status}</Badge>
                      {(m.risk_flags ?? []).map((f: string) => <Badge key={f} variant="outline" className="text-[9px] border-destructive/40 text-destructive">{f}</Badge>)}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{fmt(m.meeting_at ?? m.created_at)}</span>
                      <Button size="sm" variant="ghost" onClick={() => draftFollowup(m.id)} disabled={busy}>Draft follow-up</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Open / overdue action items</div>
            {(actions ?? []).length === 0 ? (
              <div className="text-[11px] text-muted-foreground">No action items yet.</div>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-auto text-[11px]">
                {(actions ?? []).map((a: any) => {
                  const overdue = a.due_at && new Date(a.due_at).getTime() < Date.now() && !['done','completed','dismissed'].includes(String(a.status));
                  return (
                    <li key={a.id} className="flex items-center justify-between border-b border-border/20 py-1">
                      <span className="truncate">{a.action_title}</span>
                      <span className={`shrink-0 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{a.due_at ? fmt(a.due_at) : a.status}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {draft && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2 flex items-center justify-between">
              <span>Follow-up draft · awaiting founder approval</span>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Close</Button>
            </div>
            <div className="text-[11px] text-muted-foreground italic mb-2">{draft.disclaimer}</div>
            {!draft.context_ok && draft.context_guard?.reason && (
              <div className="text-[11px] text-destructive mb-2">{draft.context_guard.reason}</div>
            )}
            <div className="text-[11px] mb-1"><span className="font-medium">Subject:</span> {draft.draft?.subject}</div>
            <pre className="text-[11px] whitespace-pre-wrap bg-background/40 border border-border/30 rounded p-2 max-h-56 overflow-auto">{draft.draft?.body}</pre>
            <div className="text-[11px] mt-2"><span className="font-medium">Internal note:</span> {draft.draft?.internal_note}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}