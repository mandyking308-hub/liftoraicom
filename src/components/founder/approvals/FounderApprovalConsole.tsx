import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck, Lock, RefreshCw, CheckCircle2, XCircle, Pencil,
  AlertOctagon, Inbox, PauseCircle, Send, Plug, FileText, Hammer,
} from "lucide-react";

type Item = {
  id: string;
  approval_type: string;
  source_system?: string;
  agent_key?: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  title: string;
  summary?: string;
  recommended_action?: string;
  draft_subject?: string | null;
  draft_body?: string | null;
  priority_level: string;
  risk_flags: string[];
  compliance_flags: string[];
  status: string;
  origin: string;
};

type ApprovedAction = {
  id: string;
  action_type: string;
  action_label: string;
  agent_key?: string | null;
  contact_id?: string | null;
  conversation_id?: string | null;
  execution_status: string;
  execution_allowed: boolean;
  external_send_required: boolean;
  provider_mutation_required: boolean;
  blocked_reason?: string | null;
  approved_at: string;
  approval_item_id?: string | null;
};

type Decision = {
  id: string;
  title: string;
  founder_decision: string;
  status: string;
  decided_at: string;
  approval_type: string;
  agent_key?: string | null;
};

type Resp = {
  ok: boolean;
  apply_enabled: boolean;
  apply_disabled_reason: string | null;
  decision_recording_enabled: boolean;
  approved_action_queue_enabled: boolean;
  decision_confirmation_phrase: string;
  send_enabled: boolean;
  auto_execute_enabled: boolean;
  total_pending: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_agent: Record<string, number>;
  items: Item[];
  approved_actions: {
    total: number;
    by_status: Record<string, number>;
    external_send_waiting: number;
    provider_waiting: number;
    recent: ApprovedAction[];
  };
  decisions_recent: Decision[];
};

const priorityClass: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  normal: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground",
};

const decisionLabel: Record<string, string> = {
  approve: "Approve",
  reject: "Reject",
  edit_required: "Edit required",
  escalate: "Escalate",
  park: "Park",
};

export default function FounderApprovalConsole() {
  const qc = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["founder-approval-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("founder-approval-preview", { body: {} });
      if (error) throw error;
      return data as Resp;
    },
  });

  const decide = useMutation({
    mutationFn: async (vars: { item_id: string; decision: string; founder_notes?: string }) => {
      const { data: res, error } = await supabase.functions.invoke("founder-approval-apply", {
        body: {
          item_id: vars.item_id,
          decision: vars.decision,
          founder_notes: vars.founder_notes ?? null,
          confirmation_phrase: phrase,
          dry_run: false,
        },
      });
      if (error) throw error;
      return res;
    },
    onSuccess: (res: any, vars) => {
      if (res?.blocked) {
        toast.error(`Blocked: ${res.reason}${res.required_phrase ? ` (need "${res.required_phrase}")` : ""}`);
      } else {
        toast.success(`${decisionLabel[vars.decision] ?? vars.decision} recorded${res?.approved_action_queued ? " · queued for execution" : ""}`);
        qc.invalidateQueries({ queryKey: ["founder-approval-preview"] });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Decision failed"),
    onSettled: () => setBusyId(null),
  });

  const liveOnly = (data?.items ?? []).filter((it) => !it.id.includes(":")); // only persisted founder_approval_items
  const decisionEnabled = !!data?.decision_recording_enabled;
  const phraseOk = phrase === (data?.decision_confirmation_phrase ?? "RECORD FOUNDER DECISION");

  const submit = (item: Item, decision: string) => {
    if (!decisionEnabled) return toast.error("Decision recording is disabled in Business-Live settings.");
    if (!phraseOk) return toast.error(`Type confirmation phrase: ${data?.decision_confirmation_phrase}`);
    setBusyId(`${item.id}:${decision}`);
    decide.mutate({ item_id: item.id, decision, founder_notes: notesById[item.id] });
  };

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={18} className="text-primary" /> Founder Approval Console
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
              <ShieldCheck size={10} className="mr-1" /> No-External-Send
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
              <Lock size={10} className="mr-1" /> No-Auto-Execute
            </Badge>
            <Badge variant="outline" className={`text-[10px] uppercase ${decisionEnabled ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
              decision-record {decisionEnabled ? "live" : "off"}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading approval queue…</p>}

          {data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Pending" value={data.total_pending} />
                <Stat label="Types" value={Object.keys(data.by_type).length} />
                <Stat label="Agents" value={Object.keys(data.by_agent).length} />
                <Stat label="Urgent / High" value={(data.by_priority?.urgent ?? 0) + (data.by_priority?.high ?? 0)} />
              </div>

              <div className="rounded-md border border-border/50 p-2 bg-card/30 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Confirmation phrase:</span>
                <Input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={data.decision_confirmation_phrase}
                  className="h-7 text-xs max-w-xs"
                />
                <Badge variant="outline" className={`text-[10px] ${phraseOk ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-muted"}`}>
                  {phraseOk ? "phrase ok" : "phrase required"}
                </Badge>
              </div>

              <div className="space-y-2">
                {liveOnly.slice(0, 20).map((it) => {
                  const notes = notesById[it.id] ?? "";
                  const busyKey = (d: string) => busyId === `${it.id}:${d}`;
                  const disabled = !decisionEnabled || !phraseOk;
                  return (
                    <div key={it.id} className="rounded-md border border-border/50 p-2.5 bg-card/40 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] uppercase ${priorityClass[it.priority_level] ?? priorityClass.normal}`}>{it.priority_level}</Badge>
                            <Badge variant="outline" className="text-[10px]">{it.approval_type}</Badge>
                            {it.agent_key && <Badge variant="outline" className="text-[10px]">{it.agent_key}</Badge>}
                            {it.contact_id && <Badge variant="outline" className="text-[10px]">contact</Badge>}
                            {it.conversation_id && <Badge variant="outline" className="text-[10px]">conv</Badge>}
                            {it.draft_body && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">AI draft</Badge>}
                          </div>
                          <p className="text-sm font-medium mt-1">{it.title}</p>
                          {it.summary && <p className="text-xs text-muted-foreground line-clamp-2">{it.summary}</p>}
                        </div>
                      </div>
                      {it.draft_subject && (
                        <div className="text-xs"><span className="text-muted-foreground">Subject: </span>{it.draft_subject}</div>
                      )}
                      {it.draft_body && (
                        <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground bg-background/40 p-2 rounded border border-border/40 max-h-32 overflow-y-auto">{it.draft_body}</pre>
                      )}
                      {(it.risk_flags?.length > 0 || it.compliance_flags?.length > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {(it.risk_flags ?? []).map((f) => (
                            <Badge key={`r-${f}`} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">risk · {f}</Badge>
                          ))}
                          {(it.compliance_flags ?? []).map((f) => (
                            <Badge key={`c-${f}`} variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30">comp · {f}</Badge>
                          ))}
                        </div>
                      )}
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotesById((s) => ({ ...s, [it.id]: e.target.value }))}
                        placeholder="Founder notes (optional)…"
                        className="text-xs min-h-[44px]"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="default" disabled={disabled || busyKey("approve")} onClick={() => submit(it, "approve")}>
                          <CheckCircle2 size={12} className="mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={disabled || busyKey("edit_required")} onClick={() => submit(it, "edit_required")}>
                          <Pencil size={12} className="mr-1" /> Edit required
                        </Button>
                        <Button size="sm" variant="outline" disabled={disabled || busyKey("reject")} onClick={() => submit(it, "reject")}>
                          <XCircle size={12} className="mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" disabled={disabled || busyKey("escalate")} onClick={() => submit(it, "escalate")}>
                          <AlertOctagon size={12} className="mr-1" /> Escalate
                        </Button>
                        <Button size="sm" variant="outline" disabled={disabled || busyKey("park")} onClick={() => submit(it, "park")}>
                          <PauseCircle size={12} className="mr-1" /> Park
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {liveOnly.length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Inbox size={12} /> No persisted approval items pending.</p>
                )}
              </div>

              <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground">
                Decisions are recorded internally. Approving creates an <code>approved_action_queue</code> entry that stays
                <code> execution_allowed=false</code> — no email, Apollo or Smartlead POST is made until a separate send/apply function is enabled.
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer size={18} className="text-primary" /> Approved Actions Waiting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Total queued" value={data.approved_actions.total} />
                <Stat label="External send waiting" value={data.approved_actions.external_send_waiting} icon={<Send size={12} />} />
                <Stat label="Provider waiting" value={data.approved_actions.provider_waiting} icon={<Plug size={12} />} />
                <Stat label="Approved (recent)" value={(data.decisions_recent ?? []).filter(d => d.founder_decision === "approve").length} icon={<CheckCircle2 size={12} />} />
              </div>

              <div className="space-y-1.5">
                {(data.approved_actions.recent ?? []).slice(0, 12).map((a) => (
                  <div key={a.id} className="rounded-md border border-border/40 p-2 bg-card/30 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{a.action_type}</Badge>
                        {a.agent_key && <Badge variant="outline" className="text-[10px]">{a.agent_key}</Badge>}
                        {a.external_send_required && (
                          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30"><Send size={10} className="mr-1" />send waiting</Badge>
                        )}
                        {a.provider_mutation_required && (
                          <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30"><Plug size={10} className="mr-1" />provider waiting</Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${a.execution_allowed ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-muted"}`}>
                          {a.execution_allowed ? "ready" : "execution locked"}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium mt-1 truncate">{a.action_label}</p>
                      {a.blocked_reason && <p className="text-[10px] text-muted-foreground">blocked: {a.blocked_reason}</p>}
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{new Date(a.approved_at).toLocaleString()}</div>
                  </div>
                ))}
                {(data.approved_actions.recent ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText size={12} /> Nothing in the approved queue yet.</p>
                )}
              </div>

              <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground">
                Categories waiting on a separate explicit enable: AI replies (no send function), proposal draft generation,
                commercial handoff apply, compliance status changes, Smartlead provider POST. Nothing here triggers automatically.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/50 p-2 bg-card/40">
      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">{icon}{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
