import { useCallback, useEffect, useState } from "react";
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

/* ------------------------------------------------------------------ utils */

export async function callRelationshipFn<T = any>(
  fn: string,
  body: Record<string, unknown>,
): Promise<T & { ok?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let detail = error.message;
    try {
      const ctx = (error as any)?.context;
      if (ctx?.text) detail = await ctx.text();
    } catch { /* ignore */ }
    return { ok: false, error: detail } as any;
  }
  return data as any;
}

const MODES = ["test_only", "draft_actions", "approval_required", "approved_batch_autopilot", "paused"] as const;

/** Must match SEND_CONFIRMATION_PHRASE on the server. */
export const SEND_CONFIRMATION_PHRASE = "SEND FOR REAL";

/** Modes in which the engine may make real provider calls. */
const EXTERNAL_MODES = ["approval_required", "approved_batch_autopilot"];

function ConfirmPhraseField({
  value,
  onChange,
  label = "Type the confirmation phrase to allow real provider actions",
}: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={SEND_CONFIRMATION_PHRASE}
        aria-label="confirmation phrase"
      />
    </div>
  );
}

const confirmOk = (v: string) => v.trim().toUpperCase() === SEND_CONFIRMATION_PHRASE;

const STATE_TONE: Record<string, string> = {
  LIVE: "text-emerald-400",
  ARMED: "text-yellow-400",
  DEGRADED: "text-orange-400",
  BLOCKED: "text-red-400",
};

export function SafetyBanner({ mode, state }: { mode: string; state?: string }) {
  const live = mode === "approved_batch_autopilot" && state === "LIVE";
  return (
    <div
      className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
        live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
      }`}
    >
      {live ? <CheckCircle2 size={14} className="mt-0.5" /> : <Lock size={14} className="mt-0.5" />}
      <div>
        <p className="font-semibold">
          {live ? "Relationship autopilot active" : `Safe mode — ${mode.split("_").join(" ")}`}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {live
            ? "Approved batches execute on real accounts within policy limits. Every action is gated, rate limited and audited."
            : "No invitations, messages or provider actions leave Liftor. Everything is drafted, gated and queued for founder approval."}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- overview */

export function RelationshipOverviewPanel({ businessId, onRefresh }: { businessId: string; onRefresh?: () => void }) {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-relationship-health?business_id=${encodeURIComponent(businessId)}`,
        { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } },
      );
      setHealth(await res.json());
    } catch (e) {
      toast({ title: "Health check failed", description: String(e), variant: "destructive" });
    }
    setLoading(false);
    onRefresh?.();
  }, [businessId, onRefresh, toast]);

  useEffect(() => { load(); }, [load]);

  const state = health?.health?.state ?? "UNKNOWN";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Relationship engine status</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <SafetyBanner mode={health?.mode ?? "test_only"} state={state} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <span>State</span>
          <span className={STATE_TONE[state] ?? "text-muted-foreground"}>
            {state}{health?.health?.reason ? ` — ${health.health.reason}` : ""}
          </span>
          <span>Mode</span><span>{health?.mode ?? "—"}</span>
          <span>Provider (Unipile)</span>
          <span>{health?.providers?.unipile?.configured ? "configured" : `not configured${health?.providers?.unipile?.error ? ` — ${health.providers.unipile.error}` : ""}`}</span>
          <span>ManyChat</span><span>{health?.providers?.manychat?.configured ? "configured (triggers only)" : "not configured"}</span>
          <span>Connection test</span><span>{health?.connection?.last_test_ok ? "passed" : "not passed"}</span>
          <span>Webhook</span><span>{health?.connection?.webhook_registered ? "registered" : "not registered"}</span>
          <span>Accounts</span><span>{health?.accounts?.length ?? 0}</span>
          <span>Conversations</span><span>{health?.conversations_count ?? 0}</span>
          <span>Open escalations</span>
          <span className={(health?.escalations_open ?? 0) > 0 ? "text-orange-400" : ""}>{health?.escalations_open ?? 0}</span>
          <span>Failures (24h)</span><span>{health?.recent_failures_24h ?? 0}</span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Queue</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(health?.queue_counts ?? {}).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px]">{k}: {String(v)}</Badge>
            ))}
            {!Object.keys(health?.queue_counts ?? {}).length && <span className="text-xs text-muted-foreground">Empty</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ connections */

export function RelationshipConnectionsPanel({ businessId }: { businessId: string }) {
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { toast } = useToast();

  const loadAccounts = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("social_relationship_accounts").select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setAccounts(data ?? []);
  }, [businessId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    const res = await callRelationshipFn("social-relationship-provider", { business_id: businessId, provider: "unipile", action, ...extra });
    setResult(res);
    setBusy(null);
    toast({
      title: res?.ok ? `${action} ok` : `${action} failed`,
      description: res?.ok ? undefined : String(res?.error ?? "unknown error"),
      variant: res?.ok ? undefined : "destructive",
    });
    await loadAccounts();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Provider connections</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Credentials live only in server secrets (<code>UNIPILE_API_KEY</code>, <code>UNIPILE_DSN</code>,
          <code> SOCIAL_RELATIONSHIP_WEBHOOK_SECRET</code>). They are never sent to the browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => run("test_connection")} disabled={!businessId || busy !== null}>Test connection</Button>
          <Button size="sm" variant="outline" onClick={() => run("sync_accounts")} disabled={!businessId || busy !== null}>Sync accounts</Button>
          <Button size="sm" variant="outline" onClick={() => run("register_webhook")} disabled={!businessId || busy !== null}>Register webhook</Button>
        </div>
        <ConfirmPhraseField
          value={confirmPhrase}
          onChange={setConfirmPhrase}
          label="Declaring a real account arms it for live use — type the confirmation phrase"
        />
        <div className="space-y-1">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between p-2 rounded bg-secondary/40 text-xs">
              <div>
                <p className="font-medium">{acc.account_name ?? acc.provider_account_id}</p>
                <p className="text-muted-foreground">{acc.network} · {acc.account_status}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[10px]">Real account declared</Label>
                <Switch
                  checked={acc.real_account_declared === true}
                  disabled={acc.real_account_declared !== true && !confirmOk(confirmPhrase)}
                  onCheckedChange={(v) =>
                    run("declare_real_account", { account_id: acc.id, declared: v, confirmation: confirmPhrase })
                  }
                />
              </div>
            </div>
          ))}
          {!accounts.length && <p className="text-xs text-muted-foreground">No accounts synced yet.</p>}
        </div>
        {result && (
          <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto max-h-40">{JSON.stringify(result, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- discovery */

export function RelationshipDiscoveryPanel({ businessId }: { businessId: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [criteria, setCriteria] = useState({ keywords: "", job_title: "", industry: "", location: "" });
  const [results, setResults] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [listId, setListId] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_relationship_accounts").select("*").eq("business_id", businessId).then(({ data }) => {
      setAccounts(data ?? []);
      if (data?.[0]) setAccountId(data[0].id);
    });
    callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list" }).then((r) => setLists(r?.lists ?? []));
  }, [businessId]);

  const search = async () => {
    setBusy(true);
    const res = await callRelationshipFn("social-relationship-discovery", {
      business_id: businessId, action: "run_search", account_id: accountId, criteria,
      confirmation: confirmPhrase,
    });
    setBusy(false);
    setResults(res?.results ?? []);
    if (!res?.ok) toast({ title: "Search blocked", description: String(res?.blockers?.join(", ") ?? res?.error ?? ""), variant: "destructive" });
  };

  const addToList = async () => {
    if (!listId) return;
    const res = await callRelationshipFn("social-relationship-targets", {
      business_id: businessId, action: "add_profiles", target_list_id: listId,
      profile_ids: results.map((r) => r.id).filter(Boolean), criteria,
    });
    toast({ title: res?.ok ? `Added ${res.added} targets` : "Failed", description: res?.ok ? `${res.skipped} duplicates skipped` : String(res?.error) });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Discovery & research</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Search runs read-only. No invitation or message is sent from this screen.</p>
        <div className="grid md:grid-cols-2 gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-xs" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name ?? a.provider_account_id} ({a.network})</option>)}
          </select>
          <Input placeholder="Keywords" value={criteria.keywords} onChange={(e) => setCriteria({ ...criteria, keywords: e.target.value })} />
          <Input placeholder="Job title" value={criteria.job_title} onChange={(e) => setCriteria({ ...criteria, job_title: e.target.value })} />
          <Input placeholder="Industry" value={criteria.industry} onChange={(e) => setCriteria({ ...criteria, industry: e.target.value })} />
          <Input placeholder="Location" value={criteria.location} onChange={(e) => setCriteria({ ...criteria, location: e.target.value })} />
        </div>
        <ConfirmPhraseField
          value={confirmPhrase}
          onChange={setConfirmPhrase}
          label="A live search is a real provider call — type the confirmation phrase"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={search} disabled={!accountId || busy || !confirmOk(confirmPhrase)}>Run search</Button>
          <select className="h-9 rounded-md border bg-background px-2 text-xs" value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">Add results to list…</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={addToList} disabled={!listId || !results.length}>Add {results.length}</Button>
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <div key={r.id ?? i} className="p-2 rounded bg-secondary/40 text-xs flex items-center justify-between">
              <div>
                <p className="font-medium">{r.full_name ?? r.provider_profile_id}</p>
                <p className="text-muted-foreground">{r.job_title} · {r.company_name} · {r.location}</p>
              </div>
              <Badge variant="secondary">{r.score ?? 0}</Badge>
            </div>
          ))}
          {!results.length && <p className="text-xs text-muted-foreground">No results yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------- target lists */

export function RelationshipTargetListsPanel({ businessId }: { businessId: string }) {
  const [lists, setLists] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!businessId) return;
    const r = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list" });
    setLists(r?.lists ?? []);
    const { data } = await supabase.from("social_relationship_accounts").select("*").eq("business_id", businessId);
    setAccounts(data ?? []);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const openList = async (id: string) => {
    setSelected(id);
    const r = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list_targets", target_list_id: id });
    setTargets(r?.targets ?? []);
  };

  const act = async (action: string, extra: Record<string, unknown>) => {
    const r = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action, ...extra });
    toast({ title: r?.ok ? action : `${action} failed`, description: r?.ok ? undefined : String(r?.error), variant: r?.ok ? undefined : "destructive" });
    await load();
    if (selected) await openList(selected);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Target lists & approvals</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-56" placeholder="New list name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="h-9 rounded-md border bg-background px-2 text-xs" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Account…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name ?? a.provider_account_id}</option>)}
          </select>
          <Button size="sm" disabled={!name} onClick={() => { act("create_list", { name, account_id: accountId || null, network: accounts.find((a) => a.id === accountId)?.network ?? "linkedin" }); setName(""); }}>
            Create list
          </Button>
        </div>
        <div className="space-y-1">
          {lists.map((l) => (
            <div key={l.id} className="p-2 rounded bg-secondary/40 text-xs">
              <div className="flex items-center justify-between">
                <button className="text-left" onClick={() => openList(l.id)}>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-muted-foreground">{l.network} · {l.targets_count} targets</p>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={l.status === "approved" ? "default" : "secondary"}>{l.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => act("approve_list", { target_list_id: l.id })}>Approve list</Button>
                </div>
              </div>
            </div>
          ))}
          {!lists.length && <p className="text-xs text-muted-foreground">No lists yet.</p>}
        </div>
        {selected && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            <p className="text-xs text-muted-foreground">Targets — approve individually before any action can run.</p>
            {targets.map((t) => (
              <div key={t.id} className="p-2 rounded bg-secondary/30 text-xs flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.profile?.full_name ?? t.profile_id}</p>
                  <p className="text-muted-foreground">{t.profile?.job_title} · {t.profile?.company_name} · score {t.score}</p>
                </div>
                <div className="flex gap-1">
                  <Badge variant="secondary">{t.target_status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => act("approve_targets", { target_ids: [t.id] })}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => act("reject_targets", { target_ids: [t.id] })}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ action queue */

export function RelationshipActionQueuePanel({ businessId }: { businessId: string }) {
  const [actions, setActions] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [listId, setListId] = useState("");
  const [actionType, setActionType] = useState("send_invitation");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [message, setMessage] = useState("Hi {{first_name}} — enjoyed what {{company}} is doing. Worth connecting?");
  const [mode, setMode] = useState("test_only");
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!businessId) return;
    const r = await callRelationshipFn("social-relationship-actions", { business_id: businessId, action: "list" });
    setActions(r?.actions ?? []);
    setMode(r?.mode ?? "test_only");
    const l = await callRelationshipFn("social-relationship-targets", { business_id: businessId, action: "list" });
    setLists(l?.lists ?? []);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const r = await callRelationshipFn("social-relationship-actions", { business_id: businessId, action, ...extra });
    toast({
      title: r?.ok ? action.split("_").join(" ") : `${action} failed`,
      description: r?.ok
        ? JSON.stringify({ created: r.created, approved: r.approved, sent: r.sent, blocked: r.blocked })
        : String(r?.hint ?? r?.error ?? ""),
      variant: r?.ok ? undefined : "destructive",
    });
    await load();
  };

  const pending = actions.filter((a) => ["pending_approval", "draft"].includes(a.action_status));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Action queue</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <SafetyBanner mode={mode} />
        <div className="grid md:grid-cols-3 gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-xs" value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">Approved target list…</option>
            {lists.filter((l) => l.status === "approved").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-xs" value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="send_invitation">Send invitation</option>
            <option value="start_chat">Start chat</option>
          </select>
          <Button size="sm" disabled={!listId} onClick={() => call("enqueue_from_list", { target_list_id: listId, action_type: actionType, message })}>
            Queue actions
          </Button>
        </div>
        <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message template — {{first_name}}, {{company}}, {{job_title}}" />
        <ConfirmPhraseField
          value={confirmPhrase}
          onChange={setConfirmPhrase}
          label={`Running due actions sends on real accounts — type "${SEND_CONFIRMATION_PHRASE}"`}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            disabled={!pending.length || !EXTERNAL_MODES.includes(mode)}
            title={EXTERNAL_MODES.includes(mode) ? undefined : `Blocked: mode is ${mode}`}
            onClick={() => call("approve_batch", { action_ids: pending.map((a) => a.id) })}
          >
            Approve {pending.length} pending
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!confirmOk(confirmPhrase) || !EXTERNAL_MODES.includes(mode)}
            title={
              !EXTERNAL_MODES.includes(mode)
                ? `Blocked: mode is ${mode}`
                : !confirmOk(confirmPhrase)
                  ? "Blocked: confirmation phrase required"
                  : undefined
            }
            onClick={() => call("run_due", { limit: 5, confirmation: confirmPhrase })}
          >
            Run due actions
          </Button>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} /></Button>
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {actions.map((a) => (
            <div key={a.id} className="p-2 rounded bg-secondary/40 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.action_type} → {a.profile?.full_name ?? a.profile_id ?? "—"}</p>
                  <p className="text-muted-foreground">{a.rendered_preview?.slice(0, 120)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={["sent", "accepted", "replied"].includes(a.action_status) ? "default" : "secondary"}>
                    {a.action_status}
                  </Badge>
                  {a.action_status === "submission_unknown" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => call("resolve_unknown", { action_id: a.id, outcome: "sent" })}>Was sent</Button>
                      <Button size="sm" variant="ghost" onClick={() => call("resolve_unknown", { action_id: a.id, outcome: "not_sent" })}>Not sent</Button>
                    </>
                  )}
                </div>
              </div>
              {a.blocked_reason && <p className="text-orange-400 mt-1 flex items-center gap-1"><AlertTriangle size={11} />{a.blocked_reason}</p>}
              {a.last_error && <p className="text-red-400 mt-1">{String(a.last_error).slice(0, 160)}</p>}
            </div>
          ))}
          {!actions.length && <p className="text-xs text-muted-foreground">Queue empty.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- inbox */

export function RelationshipInboxPanel({ businessId }: { businessId: string }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!businessId) return;
    const r = await callRelationshipFn("social-relationship-inbox", { business_id: businessId, action: "list_threads" });
    setThreads(r?.conversations ?? []);
    setEscalations(r?.escalations ?? []);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const open = async (id: string) => {
    const r = await callRelationshipFn("social-relationship-inbox", { business_id: businessId, action: "get_thread", conversation_id: id });
    setActive(r?.conversation ?? null);
    setMessages(r?.messages ?? []);
    setDraft("");
    setAiGenerated(false);
  };

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const r = await callRelationshipFn("social-relationship-inbox", { business_id: businessId, action, ...extra });
    if (!r?.ok) toast({ title: `${action} failed`, description: String(r?.error ?? ""), variant: "destructive" });
    return r;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Unified social inbox</CardTitle>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {escalations.length > 0 && (
            <div className="rounded border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-400 flex items-center gap-2">
              <ShieldAlert size={14} /> {escalations.length} open escalation(s) awaiting founder review
            </div>
          )}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {threads.map((t) => (
              <button key={t.id} className="w-full text-left p-2 rounded bg-secondary/40 text-xs" onClick={() => open(t.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.profile?.full_name ?? t.provider_chat_id}</span>
                  <div className="flex gap-1">
                    {t.escalation_pending && <Badge variant="destructive" className="text-[10px]">escalated</Badge>}
                    <Badge variant="secondary" className="text-[10px]">{t.last_intent ?? t.conversation_status}</Badge>
                  </div>
                </div>
                <p className="text-muted-foreground">{t.network} · {t.last_message_at?.slice(0, 16)?.replace("T", " ") ?? "no messages"}</p>
              </button>
            ))}
            {!threads.length && <p className="text-xs text-muted-foreground">No conversations yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{active?.profile?.full_name ?? "Thread"}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!active && <p className="text-xs text-muted-foreground">Select a conversation.</p>}
          {active && (
            <>
              {active.escalation_pending && (
                <div className="rounded border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-400">
                  Escalated: {active.escalation_reason}. AI replies are suppressed until resolved.
                </div>
              )}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className={`p-2 rounded text-xs ${m.direction === "inbound" ? "bg-secondary/50" : "bg-primary/10"}`}>
                    <p className="text-[10px] text-muted-foreground">{m.direction}{m.ai_generated ? " · AI" : ""}</p>
                    <p>{m.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={async () => { const r = await call("sync_thread", { conversation_id: active.id }); if (r?.ok) open(active.id); }}>Sync</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const r = await call("draft_reply", { conversation_id: active.id });
                    if (r?.suppressed) toast({ title: "AI reply suppressed", description: String(r.reason) });
                    if (r?.draft) { setDraft(r.draft); setAiGenerated(true); }
                  }}
                >
                  Draft AI reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => call("promote_to_crm", { conversation_id: active.id }).then(() => toast({ title: "Sent to CRM review" }))}>Promote to CRM</Button>
                {active.escalation_pending && escalations[0] && (
                  <Button size="sm" variant="ghost" onClick={async () => { await call("resolve_escalation", { escalation_id: escalations.find((e) => e.conversation_id === active.id)?.id }); load(); open(active.id); }}>
                    Resolve escalation
                  </Button>
                )}
              </div>
              <Textarea rows={3} value={draft} onChange={(e) => { setDraft(e.target.value); }} placeholder="Reply — queued for gating, never sent instantly." />
              <Button
                size="sm"
                disabled={!draft.trim()}
                onClick={async () => {
                  const r = await call("queue_reply", { conversation_id: active.id, message: draft, ai_generated: aiGenerated });
                  if (r?.ok) toast({ title: `Reply queued (${r.queued_status})`, description: (r.gate?.blockers ?? []).join(", ") || undefined });
                  setDraft("");
                  open(active.id);
                }}
              >
                Queue reply
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------- policies */

export function RelationshipPoliciesPanel({ businessId }: { businessId: string }) {
  const [policy, setPolicy] = useState<any>({});
  const [paused, setPaused] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_relationship_policies").select("*").eq("business_id", businessId).is("account_id", null).maybeSingle();
    setPolicy(data ?? { mode: "test_only" });
    const { data: p } = await supabase.from("social_relationship_pauses").select("*").eq("business_id", businessId).eq("is_paused", true).maybeSingle();
    setPaused(Boolean(p));
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const r = await callRelationshipFn("social-relationship-provider", { business_id: businessId, provider: "unipile", action: "save_policy", policy, confirmation: confirmPhrase });
    toast({ title: r?.ok ? "Policy saved" : "Save failed", description: r?.ok ? undefined : String(r?.hint ?? r?.error), variant: r?.ok ? undefined : "destructive" });
    load();
  };

  const togglePause = async (v: boolean) => {
    const r = await callRelationshipFn("social-relationship-provider", { business_id: businessId, provider: "unipile", action: "set_pause", scope: "business", is_paused: v, reason: "founder_toggle", confirmation: confirmPhrase });
    if (!r?.ok) toast({ title: "Pause change blocked", description: String(r?.hint ?? r?.error ?? ""), variant: "destructive" });
    if (r?.ok) setPaused(v);
    load();
  };

  const num = (key: string, label: string) => (
    <div key={key}>
      <Label className="text-[11px]">{label}</Label>
      <Input type="number" value={policy[key] ?? ""} onChange={(e) => setPolicy({ ...policy, [key]: Number(e.target.value) })} />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Policies & safety</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded border border-red-500/30 bg-red-500/10 p-2">
          <div className="text-xs">
            <p className="font-semibold text-red-400">Emergency pause (this business)</p>
            <p className="text-muted-foreground">Stops every queued and scheduled relationship action immediately.</p>
          </div>
          <Switch checked={paused} disabled={paused && !confirmOk(confirmPhrase)} onCheckedChange={togglePause} />
        </div>
        <div>
          <Label className="text-[11px]">Mode</Label>
          <select className="h-9 w-full rounded-md border bg-background px-2 text-xs" value={policy.mode ?? "test_only"} onChange={(e) => setPolicy({ ...policy, mode: e.target.value })}>
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="grid md:grid-cols-3 gap-2">
          {num("daily_invite_limit", "Daily invites")}
          {num("weekly_invite_limit", "Weekly invites")}
          {num("daily_message_limit", "Daily messages")}
          {num("weekly_message_limit", "Weekly messages")}
          {num("max_ai_replies_per_conversation_per_day", "AI replies / thread / day")}
          {num("min_delay_seconds", "Min delay (s)")}
          {num("max_delay_seconds", "Max delay (s)")}
          {num("working_hours_start", "Working hours start")}
          {num("working_hours_end", "Working hours end")}
          {num("cooldown_minutes_after_warning", "Cooldown after warning (min)")}
        </div>
        <div>
          <Label className="text-[11px]">Timezone</Label>
          <Input value={policy.timezone ?? "Europe/London"} onChange={(e) => setPolicy({ ...policy, timezone: e.target.value })} />
        </div>
        <div className="space-y-2">
          {[
            ["allow_connect_then_dm", "Allow DM immediately after connecting"],
            ["allow_ai_autosend", "Allow AI auto-send (autopilot mode only)"],
            ["require_real_account_declaration", "Require real-account declaration"],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span>{label}</span>
              <Switch checked={policy[k] === true} onCheckedChange={(v) => setPolicy({ ...policy, [k]: v })} />
            </div>
          ))}
        </div>
        <ConfirmPhraseField
          value={confirmPhrase}
          onChange={setConfirmPhrase}
          label={`Releasing a pause or arming a live mode requires "${SEND_CONFIRMATION_PHRASE}"`}
        />
        <Button
          size="sm"
          onClick={save}
          disabled={!businessId || (EXTERNAL_MODES.includes(String(policy.mode)) && !confirmOk(confirmPhrase))}
        >
          Save policy
        </Button>
      </CardContent>
    </Card>
  );
}
