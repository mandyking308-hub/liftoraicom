import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Phone, MessageSquare, Calendar, UserPlus, CheckCircle2, XCircle, Lock, Inbox, ShieldAlert } from "lucide-react";

const CHANNELS = ["email", "call", "sms", "whatsapp", "manual", "none"] as const;
const NEXT_ACTIONS = [
  "follow_up_email", "schedule_callback", "prepare_proposal", "prepare_payment_link",
  "answer_question", "ask_missing_info", "escalate_to_human", "closed_lost", "nurture_later",
] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const STATUSES = ["open", "in_progress", "waiting_on_customer", "done", "cancelled"] as const;

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  urgent: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
const CHANNEL_ICON: Record<string, any> = {
  email: Mail, call: Phone, sms: MessageSquare, whatsapp: MessageSquare, manual: Calendar, none: XCircle,
};

export default function FollowUp() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"queue" | "handoff" | "templates">("queue");

  const { data, isLoading } = useQuery({
    queryKey: ["cs-followup-engine"],
    queryFn: async () => {
      const sb: any = supabase;
      const [tasks, handoffs, templates, conversations] = await Promise.all([
        sb.from("customer_sales_follow_up_tasks").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("customer_sales_human_handoff_tasks").select("*").order("created_at", { ascending: false }).limit(100),
        sb.from("customer_sales_follow_up_templates").select("*").eq("active", true).order("template_label"),
        sb.from("customer_sales_conversations").select("id,customer_name,customer_email,customer_phone,recommended_next_action,customer_need,close_probability,conversation_status").order("updated_at", { ascending: false }).limit(50),
      ].map(p => p.catch(() => ({ data: [] }))));
      return {
        tasks: (tasks.data ?? []) as any[],
        handoffs: (handoffs.data ?? []) as any[],
        templates: (templates.data ?? []) as any[],
        conversations: (conversations.data ?? []) as any[],
      };
    },
  });

  const stats = useMemo(() => {
    const t = data?.tasks ?? [];
    return {
      open: t.filter(x => x.task_status === "open").length,
      urgent: t.filter(x => x.follow_up_priority === "urgent" && x.task_status !== "done" && x.task_status !== "cancelled").length,
      awaitingApproval: t.filter(x => x.approval_required && x.approval_status === "pending").length,
      escalations: (data?.handoffs ?? []).filter(x => x.task_status === "open").length,
    };
  }, [data]);

  const updateTask = useMutation({
    mutationFn: async (vars: { id: string; patch: any }) => {
      const sb: any = supabase;
      const { error } = await sb.from("customer_sales_follow_up_tasks").update(vars.patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task updated — nothing sent externally");
      qc.invalidateQueries({ queryKey: ["cs-followup-engine"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const createDraft = useMutation({
    mutationFn: async (vars: { conversationId?: string; templateKey: string; nextAction: string }) => {
      const sb: any = supabase;
      const tpl = (data?.templates ?? []).find(t => t.template_key === vars.templateKey);
      const conv = (data?.conversations ?? []).find(c => c.id === vars.conversationId);
      const { error } = await sb.from("customer_sales_follow_up_tasks").insert({
        conversation_id: vars.conversationId ?? null,
        next_best_action: vars.nextAction,
        follow_up_priority: tpl?.default_priority ?? "normal",
        follow_up_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        channel: tpl?.channel ?? "email",
        template_key: vars.templateKey,
        draft_subject: tpl?.default_subject ?? null,
        draft_message: tpl?.body_template ?? null,
        approval_required: tpl?.requires_approval !== false,
        approval_status: "pending",
        task_status: "open",
        reason: conv ? `Drafted from conversation with ${conv.customer_name ?? conv.customer_email ?? "—"}` : "Manual draft",
        test_label: "LIVE_INTERNAL_TEST",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draft follow-up created — approval-gated");
      qc.invalidateQueries({ queryKey: ["cs-followup-engine"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create draft"),
  });

  const createHandoff = useMutation({
    mutationFn: async (vars: { conversationId: string }) => {
      const sb: any = supabase;
      const conv = (data?.conversations ?? []).find(c => c.id === vars.conversationId);
      const { error } = await sb.from("customer_sales_human_handoff_tasks").insert({
        conversation_id: vars.conversationId,
        reason_key: "customer_asks_for_human",
        priority: "high",
        customer_need: conv?.customer_need ?? null,
        recommended_response: conv?.recommended_next_action ?? null,
        suggested_next_step: "Call customer back within 4 working hours.",
        task_status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Human callback task created");
      qc.invalidateQueries({ queryKey: ["cs-followup-engine"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create handoff"),
  });

  return (
    <CSLayout
      title="Follow-up Engine"
      subtitle="After each conversation, Liftor drafts the next best action: email, callback, proposal, payment link, question answer, missing-info request, escalation, closed-lost or nurture. Drafting runs live — sending stays approval-gated."
    >
      <div className="grid md:grid-cols-4 gap-3">
        <Stat icon={Inbox} label="Open tasks" value={stats.open} />
        <Stat icon={ShieldAlert} label="Urgent" value={stats.urgent} tone="rose" />
        <Stat icon={Lock} label="Awaiting approval" value={stats.awaitingApproval} tone="yellow" />
        <Stat icon={UserPlus} label="Open handoffs" value={stats.escalations} tone="amber" />
      </div>

      <Card className="tech-card p-1 inline-flex gap-1 text-xs">
        {(["queue", "handoff", "templates"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${tab === t ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "queue" ? "Follow-up queue" : t === "handoff" ? "Human handoff" : "Templates"}
          </button>
        ))}
      </Card>

      {tab === "queue" && (
        <>
          <CSSection title="Draft from conversation" description="Pick a conversation and a template. Liftor creates a draft task in the approval queue — nothing is sent.">
            <DraftFromConversationForm
              conversations={data?.conversations ?? []}
              templates={data?.templates ?? []}
              onSubmit={(v) => createDraft.mutate(v)}
              disabled={createDraft.isPending}
            />
          </CSSection>

          <CSSection title="Follow-up tasks" description="Approve, reject, reassign or mark outcome. Sending stays approval-gated.">
            {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p>
              : (data?.tasks ?? []).length === 0 ? (
                <CSEmptyState title="No follow-up tasks yet" hint="Tasks appear here from conversation analysis and from the draft form above." />
              ) : (
                <div className="space-y-2">
                  {(data?.tasks ?? []).map(task => (
                    <TaskCard key={task.id} task={task} onPatch={(patch) => updateTask.mutate({ id: task.id, patch })} pending={updateTask.isPending} />
                  ))}
                </div>
              )}
          </CSSection>
        </>
      )}

      {tab === "handoff" && (
        <>
          <CSSection title="Escalate a conversation" description="Create a human callback task with transcript summary, customer need, objections, risk flags and a suggested next step.">
            <EscalateForm
              conversations={data?.conversations ?? []}
              onSubmit={(conversationId) => createHandoff.mutate({ conversationId })}
              disabled={createHandoff.isPending}
            />
          </CSSection>

          <CSSection title="Human handoff queue">
            {(data?.handoffs ?? []).length === 0 ? (
              <CSEmptyState title="No handoffs open" hint="Escalations from the safety layer and the brain show up here." />
            ) : (
              <ul className="space-y-2 text-xs">
                {(data?.handoffs ?? []).map((h: any) => (
                  <li key={h.id} className="rounded border border-border/40 bg-background/40 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY_TONE[h.priority] ?? ""}`}>{h.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{h.task_status}</Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">reason: {h.reason_key}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    {h.customer_need && <p><span className="text-muted-foreground">Need: </span>{h.customer_need}</p>}
                    {h.recommended_response && <p><span className="text-muted-foreground">Recommended: </span>{h.recommended_response}</p>}
                    {h.suggested_next_step && <p><span className="text-muted-foreground">Next step: </span>{h.suggested_next_step}</p>}
                    {Array.isArray(h.risk_flags) && h.risk_flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {h.risk_flags.map((r: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">{String(r)}</Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CSSection>
        </>
      )}

      {tab === "templates" && (
        <CSSection title="Follow-up templates" description="Founder-approved templates used as a starting point for drafts. Variables in {{double_braces}} are filled at draft time.">
          {(data?.templates ?? []).length === 0 ? (
            <CSEmptyState title="No templates seeded" />
          ) : (
            <ul className="grid md:grid-cols-2 gap-2 text-xs">
              {(data?.templates ?? []).map(t => (
                <li key={t.id} className="rounded border border-border/40 bg-background/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{t.template_label}</span>
                    <Badge variant="outline" className="text-[10px]">{t.channel}</Badge>
                  </div>
                  {t.default_subject && <p className="text-muted-foreground">Subject: {t.default_subject}</p>}
                  <pre className="text-[10px] whitespace-pre-wrap text-muted-foreground bg-background/60 rounded p-2 max-h-40 overflow-auto">{t.body_template}</pre>
                  <p className="text-[10px] text-muted-foreground">Approval required: {t.requires_approval ? "yes" : "no"}</p>
                </li>
              ))}
            </ul>
          )}
        </CSSection>
      )}

      <Card className="tech-card p-3 text-[11px] text-muted-foreground flex gap-2">
        <Lock size={14} className="text-yellow-400 shrink-0 mt-0.5" />
        <span>Drafting and CRM task creation run live. No follow-up email, SMS, WhatsApp or call is dispatched from this screen — sending requires the provider activation step and an approved task.</span>
      </Card>
    </CSLayout>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "yellow" | "rose" | "amber" }) {
  const cls = tone === "rose" ? "text-rose-300" : tone === "yellow" ? "text-yellow-300" : tone === "amber" ? "text-amber-300" : "text-foreground";
  return (
    <Card className="tech-card p-3 space-y-1">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon size={12} /> {label}
      </div>
      <p className={`text-xl font-semibold ${cls}`}>{value}</p>
    </Card>
  );
}

function DraftFromConversationForm({ conversations, templates, onSubmit, disabled }: {
  conversations: any[]; templates: any[];
  onSubmit: (v: { conversationId?: string; templateKey: string; nextAction: string }) => void;
  disabled: boolean;
}) {
  const [conv, setConv] = useState("");
  const [tpl, setTpl] = useState("thanks_for_speaking");
  const [action, setAction] = useState<typeof NEXT_ACTIONS[number]>("follow_up_email");
  return (
    <div className="grid md:grid-cols-4 gap-2 items-end">
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Conversation</label>
        <Select value={conv} onValueChange={setConv}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="(none)" /></SelectTrigger>
          <SelectContent>
            {conversations.length === 0 && <SelectItem value="__none__" disabled className="text-xs">No conversations</SelectItem>}
            {conversations.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.customer_name ?? c.customer_email ?? c.customer_phone ?? c.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Template</label>
        <Select value={tpl} onValueChange={setTpl}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {templates.map(t => <SelectItem key={t.template_key} value={t.template_key} className="text-xs">{t.template_label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Next best action</label>
        <Select value={action} onValueChange={(v) => setAction(v as any)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NEXT_ACTIONS.map(a => <SelectItem key={a} value={a} className="text-xs">{a.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" disabled={disabled}
        onClick={() => onSubmit({ conversationId: conv && conv !== "__none__" ? conv : undefined, templateKey: tpl, nextAction: action })}>
        Create draft
      </Button>
    </div>
  );
}

function EscalateForm({ conversations, onSubmit, disabled }: { conversations: any[]; onSubmit: (id: string) => void; disabled: boolean }) {
  const [conv, setConv] = useState("");
  return (
    <div className="grid md:grid-cols-4 gap-2 items-end">
      <div className="md:col-span-3 space-y-1">
        <label className="text-[11px] text-muted-foreground">Conversation</label>
        <Select value={conv} onValueChange={setConv}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select conversation" /></SelectTrigger>
          <SelectContent>
            {conversations.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.customer_name ?? c.customer_email ?? c.customer_phone ?? c.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" disabled={disabled || !conv} onClick={() => onSubmit(conv)}>Create human handoff</Button>
    </div>
  );
}

function TaskCard({ task, onPatch, pending }: { task: any; onPatch: (patch: any) => void; pending: boolean }) {
  const Icon = CHANNEL_ICON[task.channel] ?? Mail;
  const [editingMsg, setEditingMsg] = useState(false);
  const [draft, setDraft] = useState(task.draft_message ?? "");
  const [subject, setSubject] = useState(task.draft_subject ?? "");

  return (
    <Card className="tech-card p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon size={16} className="mt-0.5 text-primary" />
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              {task.next_best_action.replace(/_/g, " ")}
              {task.test_label && <Badge variant="outline" className="text-[10px]">{task.test_label}</Badge>}
            </p>
            <p className="text-[11px] text-muted-foreground">
              channel: {task.channel} · template: {task.template_key ?? "—"} · due: {task.follow_up_due_at ? new Date(task.follow_up_due_at).toLocaleString() : "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={`text-[10px] ${PRIORITY_TONE[task.follow_up_priority] ?? ""}`}>{task.follow_up_priority}</Badge>
          <Badge variant="outline" className="text-[10px]">{task.task_status}</Badge>
          <Badge variant="outline" className={`text-[10px] ${task.approval_status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : task.approval_status === "rejected" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
            {task.approval_status}
          </Badge>
        </div>
      </div>

      {task.reason && <p className="text-[11px] text-muted-foreground">{task.reason}</p>}

      {editingMsg ? (
        <div className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-8 text-xs" />
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="text-xs min-h-[120px]" />
          <div className="flex gap-2">
            <Button size="sm" variant="default" disabled={pending}
              onClick={() => { onPatch({ draft_subject: subject, draft_message: draft }); setEditingMsg(false); }}>
              Save draft
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingMsg(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {task.draft_subject && <p className="text-xs"><span className="text-muted-foreground">Subject: </span>{task.draft_subject}</p>}
          {task.draft_message && <pre className="text-[11px] whitespace-pre-wrap bg-background/60 rounded p-2 max-h-40 overflow-auto">{task.draft_message}</pre>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditingMsg(v => !v)}>
          {editingMsg ? "Close editor" : "Edit draft"}
        </Button>
        <Button size="sm" variant="default" disabled={pending || task.approval_status === "approved"}
          onClick={() => onPatch({ approval_status: "approved" })}>
          <CheckCircle2 size={12} className="mr-1" /> Approve
        </Button>
        <Button size="sm" variant="outline" disabled={pending}
          onClick={() => onPatch({ approval_status: "rejected", task_status: "cancelled" })}>
          <XCircle size={12} className="mr-1" /> Reject
        </Button>
        <Select defaultValue={task.task_status} onValueChange={(v) => onPatch({ task_status: v })}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select defaultValue={task.follow_up_priority} onValueChange={(v) => onPatch({ follow_up_priority: v })}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select defaultValue={task.channel} onValueChange={(v) => onPatch({ channel: v })}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CHANNELS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}