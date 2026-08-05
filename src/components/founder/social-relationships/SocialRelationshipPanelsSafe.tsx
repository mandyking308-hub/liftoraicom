import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Lock, RefreshCw, ShieldAlert } from "lucide-react";

export async function callRelationshipFn<T = any>(fn: string, body: Record<string, unknown>): Promise<T & { ok?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (!error) return data as T & { ok?: boolean; error?: string };
  let detail = error.message;
  try {
    const context = (error as any)?.context;
    if (context?.text) detail = await context.text();
  } catch { /* response already consumed */ }
  return { ok: false, error: detail } as T & { ok?: boolean; error?: string };
}

const MODES = ["test_only", "draft_actions", "approval_required", "approved_batch_autopilot", "paused"] as const;
const CONFIRM = {
  realAccount: "CONFIRM REAL SOCIAL ACCOUNT",
  webhook: "REGISTER SOCIAL RELATIONSHIP WEBHOOK",
  search: "RUN APPROVED SOCIAL SEARCH",
  list: "APPROVE SOCIAL TARGET LIST",
  targets: "APPROVE SOCIAL TARGETS",
  batch: "APPROVE SOCIAL ACTION BATCH",
  send: "SEND APPROVED SOCIAL ACTIONS",
  reply: "APPROVE SOCIAL REPLY",
  enable: "ENABLE SOCIAL RELATIONSHIP ACTIONS",
  releasePause: "RELEASE SOCIAL RELATIONSHIP PAUSE",
  crm: "PROMOTE SOCIAL CONTACT TO CRM",
} as const;

function ask(message: string) {
  return typeof window !== "undefined" && window.confirm(message);
}
function resultDescription(result: any) {
  if (!result) return "No response";
  if (result.ok) return [result.created && `created ${result.created}`, result.approved && `approved ${result.approved}`, result.sent && `sent ${result.sent}`, result.blocked && `blocked ${result.blocked}`].filter(Boolean).join(" · ") || "Completed";
  return String(result.error ?? result.message ?? result.blockers?.join(", ") ?? "Request failed");
}
function statusTone(status: string) {
  if (["sent","accepted","replied","completed","connected","approved"].includes(status)) return "default" as const;
  if (["failed","dead_letter","submission_unknown","blocked","challenge","rate_limited"].includes(status)) return "destructive" as const;
  return "secondary" as const;
}

export function SafetyBanner({ mode, state }: { mode: string; state?: string }) {
  const live = mode === "approved_batch_autopilot" && state === "LIVE";
  return (
    <div className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${live ? "border-emerald-500/30 bg-emerald-500/10" : "border-yellow-500/30 bg-yellow-500/10"}`}>
      {live ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-400" /> : <Lock size={14} className="mt-0.5 text-yellow-400" />}
      <div>
        <p className="font-semibold">{live ? "Relationship autopilot active" : `Safe mode — ${String(mode || "test_only").replaceAll("_", " ")}`}</p>
        <p className="text-muted-foreground mt-0.5">{live ? "Only explicitly approved, policy-compliant actions may execute." : "Provider calls remain blocked or draft-only until the founder deliberately approves them."}</p>
      </div>
    </div>
  );
}

export function RelationshipOverviewPanel({ businessId, onRefresh }: { businessId: string; onRefresh?: () => void }) {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-relationship-health?business_id=${encodeURIComponent(businessId)}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? `Health check failed (${response.status})`);
      setHealth(payload);
    } catch (error) {
      toast({ title: "Health check failed", description: String(error), variant: "destructive" });
    } finally {
      setLoading(false); onRefresh?.();
    }
  }, [businessId, onRefresh, toast]);
  useEffect(() => { void load(); }, [load]);
  const state = health?.health?.state ?? "UNKNOWN";
  return (
    <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Relationship engine status</CardTitle><Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></Button></CardHeader>
      <CardContent className="space-y-3"><SafetyBanner mode={health?.mode ?? "test_only"} state={state} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <span>State</span><span>{state}{health?.health?.reason ? ` — ${health.health.reason}` : ""}</span>
          <span>Mode</span><span>{health?.mode ?? "test_only"}</span>
          <span>Unipile</span><span>{health?.providers?.unipile?.configured ? "configured" : "not configured"}</span>
          <span>Connection test</span><span>{health?.connection?.last_test_ok ? "passed" : "not passed"}</span>
          <span>Webhook</span><span>{health?.connection?.webhook_registered ? "registered" : "not registered"}</span>
          <span>Accounts</span><span>{health?.accounts?.length ?? 0}</span>
          <span>Conversations</span><span>{health?.conversations_count ?? 0}</span>
          <span>Open escalations</span><span>{health?.escalations_open ?? 0}</span>
          <span>Failures (24h)</span><span>{health?.recent_failures_24h ?? 0}</span>
        </div>
        <div className="flex flex-wrap gap-1">{Object.entries(health?.queue_counts ?? {}).map(([status, count]) => <Badge key={status} variant={statusTone(status)}>{status}: {String(count)}</Badge>)}</div>
      </CardContent></Card>
  );
}

export function RelationshipConnectionsPanel({ businessId }: { businessId: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [last, setLast] = useState<any>(null);
  const { toast } = useToast();
  const load = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_relationship_accounts").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setAccounts(data ?? []);
  }, [businessId]);
  useEffect(() => { void load(); }, [load]);
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    const result = await callRelationshipFn("social-relationship-provider", { business_id: businessId, provider: "unipile", action, ...extra });
    setLast(result); setBusy("");
    toast({ title: result.ok ? action.replaceAll("_", " ") : `${action.replaceAll("_", " ")} failed`, description: resultDescription(result), variant: result.ok ? undefined : "destructive" });
    await load();
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Provider connections</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-xs text-muted-foreground">Secrets remain server-side. Account sync never enables execution automatically.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!businessId || !!busy} onClick={() => run("test_connection")}>Test connection</Button>
        <Button size="sm" variant="outline" disabled={!businessId || !!busy} onClick={() => run("sync_accounts")}>Sync accounts</Button>
        <Button size="sm" variant="outline" disabled={!businessId || !!busy} onClick={() => ask("Register the verified webhook endpoint for this provider?") && run("register_webhook", { confirmation_phrase: CONFIRM.webhook })}>Register webhook</Button>
      </div>
      <div className="space-y-1">{accounts.map((account) => <div key={account.id} className="p-2 rounded bg-secondary/40 text-xs flex items-center justify-between gap-2"><div><p className="font-medium">{account.account_name ?? account.provider_account_id}</p><p className="text-muted-foreground">{account.network} · {account.account_status}</p></div><div className="flex items-center gap-2"><Label className="text-[10px]">Real account</Label><Switch checked={account.real_account_declared === true} onCheckedChange={(declared) => ask(`${declared ? "Confirm" : "Remove"} the real-account declaration for ${account.account_name ?? account.account_handle ?? "this account"}?`) && run("declare_real_account", { account_id: account.id, declared, confirmation_phrase: CONFIRM.realAccount })} /></div></div>)}</div>
      {!accounts.length && <p className="text-xs text-muted-foreground">No accounts synced.</p>}
      {last && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto max-h-40">{JSON.stringify(last, null, 2)}</pre>}
    </CardContent></Card>
  );
}

export function RelationshipDiscoveryPanel({ businessId }: { businessId: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [criteria, setCriteria] = useState({ keywords: "", job_title: "", industry: "", location: "" });
  const [results, setResults] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [listId, setListId] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    if (!businessId) return;
    void supabase.from("social_relationship_accounts").select("*").eq("business_id", businessId).then(({ data }) => { setAccounts(data ?? []); setAccountId((current) => current || data?.[0]?.id || ""); });
    void callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list" }).then((result) => setLists(result?.lists ?? []));
  }, [businessId]);
  const search = async (live: boolean) => {
    setBusy(true);
    const result = await callRelationshipFn("social-relationship-discovery", { business_id: businessId, action: live ? "run_search" : "preview_search", account_id: accountId, criteria, ...(live ? { confirmation_phrase: CONFIRM.search } : {}) });
    setBusy(false); setPreview(result.preview ?? null); setResults(result.results ?? []);
    toast({ title: result.ok ? (live ? "Search completed" : "Search preview ready") : "Search blocked", description: resultDescription(result), variant: result.ok ? undefined : "destructive" });
  };
  const addToList = async () => {
    const result = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "add_profiles", target_list_id: listId, profile_ids: results.map((item) => item.id).filter(Boolean), criteria });
    toast({ title: result.ok ? "Targets added" : "Add failed", description: resultDescription(result), variant: result.ok ? undefined : "destructive" });
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Discovery & research</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-xs text-muted-foreground">Preview never calls the provider. Live search requires an approved policy and founder confirmation.</p>
      <div className="grid md:grid-cols-2 gap-2"><select className="h-9 rounded-md border bg-background px-2 text-xs" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Select account…</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name ?? account.provider_account_id} ({account.network})</option>)}</select><Input placeholder="Keywords" value={criteria.keywords} onChange={(event) => setCriteria({ ...criteria, keywords: event.target.value })} /><Input placeholder="Job title" value={criteria.job_title} onChange={(event) => setCriteria({ ...criteria, job_title: event.target.value })} /><Input placeholder="Industry" value={criteria.industry} onChange={(event) => setCriteria({ ...criteria, industry: event.target.value })} /><Input placeholder="Location" value={criteria.location} onChange={(event) => setCriteria({ ...criteria, location: event.target.value })} /></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!accountId || busy} onClick={() => search(false)}>Preview search</Button><Button size="sm" disabled={!accountId || busy} onClick={() => ask("Run this approved search against the connected social account?") && search(true)}>Run approved search</Button><select className="h-9 rounded-md border bg-background px-2 text-xs" value={listId} onChange={(event) => setListId(event.target.value)}><option value="">Add results to list…</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><Button size="sm" variant="outline" disabled={!listId || !results.length} onClick={addToList}>Add {results.length}</Button></div>
      {preview && <div className="rounded bg-secondary/40 p-2 text-xs"><p>Mode: {preview.mode}</p><p>Ready: {String(preview.ready)}</p>{preview.blockers?.length > 0 && <p className="text-orange-400">{preview.blockers.join(", ")}</p>}</div>}
      <div className="space-y-1 max-h-72 overflow-y-auto">{results.map((result) => <div key={result.id} className="p-2 rounded bg-secondary/40 text-xs flex justify-between"><div><p className="font-medium">{result.full_name ?? result.provider_profile_id}</p><p className="text-muted-foreground">{result.job_title} · {result.company_name} · {result.location}</p></div><Badge variant="secondary">{result.score ?? 0}</Badge></div>)}{!results.length && <p className="text-xs text-muted-foreground">No live results.</p>}</div>
    </CardContent></Card>
  );
}

export function RelationshipTargetListsPanel({ businessId }: { businessId: string }) {
  const [lists, setLists] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const { toast } = useToast();
  const load = useCallback(async () => {
    if (!businessId) return;
    const [listResult, accountResult] = await Promise.all([callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list" }), supabase.from("social_relationship_accounts").select("*").eq("business_id", businessId)]);
    setLists(listResult?.lists ?? []); setAccounts(accountResult.data ?? []);
  }, [businessId]);
  useEffect(() => { void load(); }, [load]);
  const open = async (id: string) => { setSelected(id); const result = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list_targets", target_list_id: id }); setTargets(result?.targets ?? []); };
  const act = async (action: string, extra: Record<string, unknown>) => {
    const result = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action, ...extra });
    toast({ title: result.ok ? action.replaceAll("_", " ") : `${action.replaceAll("_", " ")} failed`, description: resultDescription(result), variant: result.ok ? undefined : "destructive" });
    await load(); if (selected) await open(selected);
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Target lists & approvals</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2"><Input className="max-w-56" placeholder="New list name" value={name} onChange={(event) => setName(event.target.value)} /><select className="h-9 rounded-md border bg-background px-2 text-xs" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Account…</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name ?? account.provider_account_id}</option>)}</select><Button size="sm" disabled={!name || !accountId} onClick={() => { void act("create_list", { name, account_id: accountId }); setName(""); }}>Create list</Button></div>
      <div className="space-y-1">{lists.map((list) => <div key={list.id} className="p-2 rounded bg-secondary/40 text-xs flex items-center justify-between"><button className="text-left" onClick={() => open(list.id)}><p className="font-medium">{list.name}</p><p className="text-muted-foreground">{list.network} · {list.targets_count} targets</p></button><div className="flex gap-1"><Badge variant={statusTone(list.status)}>{list.status}</Badge>{list.status !== "approved" && <Button size="sm" variant="outline" onClick={() => ask(`Approve target list “${list.name}”?`) && act("approve_list", { target_list_id: list.id, confirmation_phrase: CONFIRM.list })}>Approve list</Button>}</div></div>)}</div>
      {selected && <div className="space-y-1 max-h-72 overflow-y-auto">{targets.map((target) => <div key={target.id} className="p-2 rounded bg-secondary/30 text-xs flex items-center justify-between"><div><p className="font-medium">{target.profile?.full_name ?? target.profile_id}</p><p className="text-muted-foreground">{target.profile?.job_title} · {target.profile?.company_name} · score {target.score}</p></div><div className="flex gap-1"><Badge variant={statusTone(target.target_status)}>{target.target_status}</Badge>{target.target_status !== "approved" && <Button size="sm" variant="outline" onClick={() => ask("Approve this person for the selected relationship campaign?") && act("approve_targets", { target_ids: [target.id], confirmation_phrase: CONFIRM.targets })}>Approve</Button>}<Button size="sm" variant="ghost" onClick={() => act("reject_targets", { target_ids: [target.id] })}>Reject</Button></div></div>)}</div>}
    </CardContent></Card>
  );
}

export function RelationshipActionQueuePanel({ businessId }: { businessId: string }) {
  const [actions, setActions] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [listId, setListId] = useState("");
  const [actionType, setActionType] = useState("send_invitation");
  const [message, setMessage] = useState("Hi {{first_name}} — enjoyed what {{company}} is doing. Worth connecting?");
  const [mode, setMode] = useState("test_only");
  const { toast } = useToast();
  const load = useCallback(async () => {
    if (!businessId) return;
    const [queueResult, listResult] = await Promise.all([callRelationshipFn("social-relationship-actions", { business_id: businessId, action: "list" }), callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list" })]);
    setActions(queueResult?.actions ?? []); setMode(queueResult?.mode ?? "test_only"); setLists(listResult?.lists ?? []);
  }, [businessId]);
  useEffect(() => { void load(); }, [load]);
  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const result = await callRelationshipFn("social-relationship-actions", { business_id: businessId, action, ...extra });
    toast({ title: result.ok ? action.replaceAll("_", " ") : `${action.replaceAll("_", " ")} failed`, description: resultDescription(result), variant: result.ok ? undefined : "destructive" });
    await load();
  };
  const pending = useMemo(() => actions.filter((item) => ["pending_approval","draft","blocked"].includes(item.action_status)), [actions]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Action queue</CardTitle></CardHeader><CardContent className="space-y-3"><SafetyBanner mode={mode} />
      <div className="grid md:grid-cols-3 gap-2"><select className="h-9 rounded-md border bg-background px-2 text-xs" value={listId} onChange={(event) => setListId(event.target.value)}><option value="">Approved target list…</option>{lists.filter((list) => list.status === "approved").map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><select className="h-9 rounded-md border bg-background px-2 text-xs" value={actionType} onChange={(event) => setActionType(event.target.value)}><option value="send_invitation">Send invitation</option><option value="start_chat">Start chat</option></select><Button size="sm" disabled={!listId} onClick={() => call("enqueue_from_list", { target_list_id: listId, action_type: actionType, message })}>Queue actions</Button></div>
      <Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!pending.length} onClick={() => ask(`Approve ${pending.length} exact queued action(s)?`) && call("approve_batch", { action_ids: pending.map((item) => item.id), confirmation_phrase: CONFIRM.batch })}>Approve {pending.length}</Button><Button size="sm" variant="outline" onClick={() => ask("Send due, approved actions now? Liftor will re-run every safety gate first.") && call("run_due", { limit: 5, confirmation_phrase: CONFIRM.send })}>Run due actions</Button><Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} /></Button></div>
      <div className="space-y-1 max-h-80 overflow-y-auto">{actions.map((item) => <div key={item.id} className="p-2 rounded bg-secondary/40 text-xs"><div className="flex items-center justify-between gap-2"><div><p className="font-medium">{item.action_type} → {item.profile?.full_name ?? item.profile_id ?? "—"}</p><p className="text-muted-foreground">{item.rendered_preview?.slice(0, 120)}</p></div><div className="flex items-center gap-1"><Badge variant={statusTone(item.action_status)}>{item.action_status}</Badge>{item.action_status === "submission_unknown" && <><Button size="sm" variant="outline" onClick={() => { const providerId = window.prompt("Enter the real provider action/message ID proving this was sent:"); if (providerId) void call("resolve_unknown", { action_id: item.id, outcome: "sent", provider_action_id: providerId }); }}>Mark sent</Button><Button size="sm" variant="ghost" onClick={() => call("resolve_unknown", { action_id: item.id, outcome: "not_sent" })}>Not sent</Button></>}</div></div>{item.blocked_reason && <p className="text-orange-400 mt-1 flex gap-1"><AlertTriangle size={11} />{item.blocked_reason}</p>}{item.last_error && <p className="text-red-400 mt-1">{String(item.last_error).slice(0, 160)}</p>}</div>)}{!actions.length && <p className="text-xs text-muted-foreground">Queue empty.</p>}</div>
    </CardContent></Card>
  );
}

export function RelationshipInboxPanel({ businessId }: { businessId: string }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => { if (!businessId) return; const result = await callRelationshipFn("social-relationship-inbox", { business_id: businessId, action: "list_threads" }); setThreads(result?.conversations ?? []); setEscalations(result?.escalations ?? []); }, [businessId]);
  useEffect(() => { void load(); }, [load]);
  const open = async (id: string) => { const result = await callRelationshipFn("social-relationship-inbox", { business_id: businessId, action: "get_thread", conversation_id: id }); setActive(result?.conversation ?? null); setMessages(result?.messages ?? []); setDraft(""); setAiGenerated(false); };
  const call = async (action: string, extra: Record<string, unknown> = {}) => { const result = await callRelationshipFn("social-relationship-inbox", { business_id: businessId, action, ...extra }); if (!result.ok) toast({ title: `${action.replaceAll("_", " ")} failed`, description: resultDescription(result), variant: "destructive" }); return result; };
  return (
    <div className="grid lg:grid-cols-2 gap-4"><Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Unified social inbox</CardTitle><Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} /></Button></CardHeader><CardContent className="space-y-2">{escalations.length > 0 && <div className="rounded border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-400 flex gap-2"><ShieldAlert size={14} />{escalations.length} open escalation(s)</div>}<div className="space-y-1 max-h-96 overflow-y-auto">{threads.map((thread) => <button key={thread.id} className="w-full text-left p-2 rounded bg-secondary/40 text-xs" onClick={() => open(thread.id)}><div className="flex justify-between"><span className="font-medium">{thread.profile?.full_name ?? thread.provider_chat_id}</span><Badge variant={thread.escalation_pending ? "destructive" : "secondary"}>{thread.last_intent ?? thread.conversation_status}</Badge></div><p className="text-muted-foreground">{thread.network} · {thread.last_message_at?.slice(0, 16)?.replace("T", " ") ?? "no messages"}</p></button>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">{active?.profile?.full_name ?? "Thread"}</CardTitle></CardHeader><CardContent className="space-y-2">{!active && <p className="text-xs text-muted-foreground">Select a conversation.</p>}{active && <>{active.escalation_pending && <div className="rounded border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-400">Escalated: {active.escalation_reason}. Sending remains blocked until resolved.</div>}<div className="space-y-1 max-h-64 overflow-y-auto">{messages.map((message) => <div key={message.id} className={`p-2 rounded text-xs ${message.direction === "inbound" ? "bg-secondary/50" : "bg-primary/10"}`}><p className="text-[10px] text-muted-foreground">{message.direction}{message.ai_generated ? " · AI" : ""}</p><p>{message.content}</p></div>)}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={async () => { const result = await call("sync_thread", { conversation_id: active.id }); if (result.ok) await open(active.id); }}>Sync</Button><Button size="sm" variant="outline" onClick={async () => { const result = await call("draft_reply", { conversation_id: active.id }); if (result.suppressed) toast({ title: "Reply suppressed", description: String(result.reason) }); if (result.draft) { setDraft(result.draft); setAiGenerated(true); } }}>Draft AI reply</Button><Button size="sm" variant="ghost" onClick={() => ask("Promote this social contact and source attribution to CRM review?") && call("promote_to_crm", { conversation_id: active.id, confirmation_phrase: CONFIRM.crm }).then(() => toast({ title: "CRM handoff created" }))}>Promote to CRM</Button>{active.escalation_pending && <Button size="sm" variant="ghost" onClick={async () => { const escalation = escalations.find((item) => item.conversation_id === active.id); if (escalation) await call("resolve_escalation", { escalation_id: escalation.id }); await load(); await open(active.id); }}>Resolve escalation</Button>}</div><Textarea rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply — this queues through every safety gate." /><div className="flex gap-2"><Button size="sm" disabled={!draft.trim()} onClick={async () => { const result = await call("queue_reply", { conversation_id: active.id, message: draft, ai_generated: aiGenerated }); if (result.ok) toast({ title: `Reply queued (${result.queued_status})` }); setDraft(""); await open(active.id); }}>Queue draft</Button><Button size="sm" variant="outline" disabled={!draft.trim() || active.escalation_pending} onClick={async () => { if (!ask("Approve this exact reply for the queue? It will still be rate-limited and re-gated before sending.")) return; const result = await call("queue_reply", { conversation_id: active.id, message: draft, ai_generated: aiGenerated, confirmation_phrase: CONFIRM.reply }); if (result.ok) toast({ title: `Reply approved (${result.queued_status})` }); setDraft(""); await open(active.id); }}>Approve reply</Button></div></>}</CardContent></Card></div>
  );
}

export function RelationshipPoliciesPanel({ businessId }: { businessId: string }) {
  const [policy, setPolicy] = useState<any>({ mode: "test_only" });
  const [paused, setPaused] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => {
    if (!businessId) return;
    const [{ data: current }, { data: pauseRows }] = await Promise.all([supabase.from("social_relationship_policies").select("*").eq("business_id", businessId).is("account_id", null).maybeSingle(), supabase.from("social_relationship_pauses").select("*").eq("business_id", businessId).eq("scope", "business").eq("is_paused", true).limit(1)]);
    setPolicy(current ?? { mode: "test_only" }); setPaused(Boolean(pauseRows?.length));
  }, [businessId]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    const risky = !["test_only","draft_actions","paused"].includes(policy.mode);
    if (risky && !ask(`Enable ${policy.mode.replaceAll("_", " ")} for this business? No unapproved action will be allowed.`)) return;
    const result = await callRelationshipFn("social-relationship-provider", { business_id: businessId, provider: "unipile", action: "save_policy", policy, ...(risky ? { confirmation_phrase: CONFIRM.enable } : {}) });
    toast({ title: result.ok ? "Policy saved" : "Save failed", description: resultDescription(result), variant: result.ok ? undefined : "destructive" }); await load();
  };
  const togglePause = async (next: boolean) => {
    if (!next && !ask("Release the emergency pause for this business? Existing actions will still require approval and all other gates.")) return;
    const result = await callRelationshipFn("social-relationship-provider", { business_id: businessId, provider: "unipile", action: "set_pause", scope: "business", is_paused: next, reason: "founder_toggle", ...(!next ? { confirmation_phrase: CONFIRM.releasePause } : {}) });
    toast({ title: result.ok ? (next ? "Emergency pause active" : "Pause released") : "Pause update failed", description: resultDescription(result), variant: result.ok ? undefined : "destructive" }); await load();
  };
  const numeric = (key: string, label: string) => <div key={key}><Label className="text-[11px]">{label}</Label><Input type="number" value={policy[key] ?? ""} onChange={(event) => setPolicy({ ...policy, [key]: Number(event.target.value) })} /></div>;
  return (
    <Card><CardHeader><CardTitle className="text-base">Policies & safety</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded border border-red-500/30 bg-red-500/10 p-2"><div className="text-xs"><p className="font-semibold text-red-400">Emergency pause</p><p className="text-muted-foreground">Stops due relationship actions for this business.</p></div><Switch checked={paused} onCheckedChange={togglePause} /></div><div><Label className="text-[11px]">Mode</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-xs" value={policy.mode ?? "test_only"} onChange={(event) => setPolicy({ ...policy, mode: event.target.value })}>{MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></div><div className="grid md:grid-cols-3 gap-2">{numeric("daily_invite_limit", "Daily invites")}{numeric("weekly_invite_limit", "Weekly invites")}{numeric("daily_message_limit", "Daily messages")}{numeric("weekly_message_limit", "Weekly messages")}{numeric("max_ai_replies_per_conversation_per_day", "AI replies/thread/day")}{numeric("min_delay_seconds", "Min delay (s)")}{numeric("max_delay_seconds", "Max delay (s)")}{numeric("working_hours_start", "Working hours start")}{numeric("working_hours_end", "Working hours end")}{numeric("cooldown_minutes_after_warning", "Cooldown after warning (min)")}</div><div><Label className="text-[11px]">Timezone</Label><Input value={policy.timezone ?? "Europe/London"} onChange={(event) => setPolicy({ ...policy, timezone: event.target.value })} /></div><div className="space-y-2">{[["allow_connect_then_dm","Allow DM immediately after connection"],["allow_ai_autosend","Allow low-risk AI replies in autopilot"],["require_real_account_declaration","Require real-account declaration"]].map(([key, label]) => <div key={key} className="flex justify-between text-xs"><span>{label}</span><Switch checked={policy[key] === true} onCheckedChange={(checked) => setPolicy({ ...policy, [key]: checked })} /></div>)}</div><Button size="sm" onClick={save} disabled={!businessId}>Save policy</Button></CardContent></Card>
  );
}
