import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Lock, RefreshCw, ShieldCheck } from "lucide-react";

const CONFIRM_PHRASE = "DISTRIBUTE APPROVED BATCH";

const DISPATCH_MODES = ["OFF", "DRAFT_TO_BUFFER", "AUTO_SCHEDULE"] as const;

const POLICY_MODE_LABELS: Array<[string, string]> = [
  ["test", "Off (test)"],
  ["approval_required", "Approval required"],
  ["draft_to_buffer", "Draft to Buffer"],
  ["approved_batch_autopilot", "Automatic publishing"],
  ["paused", "Paused"],
];

async function call(path: string, body?: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token ?? "";
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  return r.json();
}

function Out({ data }: { data: unknown }) {
  if (!data) return null;
  return <pre className="text-[10px] bg-muted/40 p-2 rounded overflow-auto max-h-56">{JSON.stringify(data, null, 2)}</pre>;
}

function ServiceBadge({ service }: { service?: string | null }) {
  return <Badge variant="outline" className="text-[10px] capitalize">{service ?? "unknown"}</Badge>;
}

export function BufferConnectionPanel({ businessId, onOrganization }: { businessId: string; onOrganization?: (id: string) => void }) {
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [conn, setConn] = useState<any>(null);

  const loadConn = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_provider_connections").select("*")
      .eq("business_id", businessId).eq("provider", "buffer").maybeSingle();
    setConn(data);
    if (data?.provider_organization_id) { setSelected(data.provider_organization_id); onOrganization?.(data.provider_organization_id); }
  };
  useEffect(() => { loadConn(); }, [businessId]);

  const test = async () => {
    setBusy(true);
    const r = await call("social-buffer-connection-test", { business_id: businessId });
    setOut(r); setOrgs(r.organizations ?? []); setBusy(false); loadConn();
  };

  const sync = async () => {
    if (!selected) return;
    setBusy(true);
    setOut(await call("social-buffer-channel-sync", { business_id: businessId, organization_id: selected }));
    setBusy(false); onOrganization?.(selected); loadConn();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={14} /> Buffer connection</CardTitle>
        <Badge variant={conn?.connection_status === "connected" ? "secondary" : "outline"} className="text-[10px]">
          {conn ? conn.connection_status : "not configured"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">
          The API key lives only in the server secret <code>BUFFER_API_KEY</code>. It is never displayed, returned or stored in the database.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={test}>Test connection</Button>
          <Button size="sm" variant="outline" disabled={!selected || busy} onClick={sync}>Sync channels</Button>
        </div>
        {orgs.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground">Organisation</p>
            <div className="flex flex-wrap gap-2">
              {orgs.map((o) => (
                <Button key={o.id} size="sm" variant={selected === o.id ? "default" : "outline"} onClick={() => setSelected(o.id)}>
                  {o.name}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Organisation ID</span><span className="font-mono">{conn?.provider_organization_id ?? "—"}</span>
          <span className="text-muted-foreground">Mode</span><span className="font-mono">{conn?.connection_mode ?? "test"}</span>
          <span className="text-muted-foreground">Last channel sync</span><span className="font-mono">{conn?.last_channel_sync_at ? new Date(conn.last_channel_sync_at).toLocaleString() : "—"}</span>
        </div>
        <Out data={out} />
      </CardContent>
    </Card>
  );
}

export function ChannelMappingPanel({ businessId, organizationId }: { businessId: string; organizationId?: string }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!businessId) return;
    let q = supabase.from("social_provider_channels").select("*").order("service");
    if (organizationId) q = q.eq("provider_organization_id", organizationId);
    const [{ data: ch }, { data: mp }] = await Promise.all([
      q,
      supabase.from("social_business_channel_map").select("*").eq("business_id", businessId),
    ]);
    setChannels(ch ?? []); setMaps(mp ?? []);
  };
  useEffect(() => { load(); }, [businessId, organizationId]);

  const toggle = async (channel: any) => {
    setBusy(true);
    const existing = maps.find((m) => m.channel_id === channel.id);
    if (existing) {
      await supabase.from("social_business_channel_map").update({ active: !existing.active }).eq("id", existing.id);
    } else {
      await supabase.from("social_business_channel_map").insert({
        business_id: businessId, channel_id: channel.id, provider: "buffer",
        platform: channel.service ?? null, active: true, dispatch_mode: "OFF",
      });
    }
    setBusy(false); load();
  };

  const setMode = async (channel: any, mode: string) => {
    const existing = maps.find((m) => m.channel_id === channel.id);
    if (!existing) return;
    if (mode === "AUTO_SCHEDULE" && !confirm(`Enable automatic publishing to ${channel.display_name ?? channel.name}? Approved jobs will be scheduled in Buffer without further clicks.`)) return;
    setBusy(true);
    await supabase.from("social_business_channel_map").update({ dispatch_mode: mode }).eq("id", existing.id);
    setBusy(false); load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Channel mapping</CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw size={12} /></Button>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <p className="text-muted-foreground">
          Every channel starts at <b>OFF</b>. <b>DRAFT_TO_BUFFER</b> creates Buffer drafts only. <b>AUTO_SCHEDULE</b> lets the
          automatic dispatcher schedule approved posts at their exact time. Manual CSV export remains available as a fallback.
        </p>
        {channels.length === 0 && <p className="text-muted-foreground">No channels synced yet. Test the connection, select an organisation, then Sync channels.</p>}
        {channels.map((c) => {
          const m = maps.find((x) => x.channel_id === c.id);
          return (
            <div key={c.id} className="border rounded p-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ServiceBadge service={c.service} />
                  <span className="truncate">{c.display_name ?? c.name ?? c.external_channel_id}</span>
                  {c.is_disconnected && <Badge variant="destructive" className="text-[10px]">disconnected</Badge>}
                  {c.is_locked && <Badge variant="destructive" className="text-[10px]">locked</Badge>}
                  {c.is_queue_paused && <Badge variant="outline" className="text-[10px]">queue paused</Badge>}
                </div>
                <Button size="sm" variant={m?.active ? "default" : "outline"} disabled={busy} onClick={() => toggle(c)}>
                  {m?.active ? "Mapped" : "Map to business"}
                </Button>
              </div>
              {m?.active && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Publishing mode</span>
                  {DISPATCH_MODES.map((mode) => (
                    <Button key={mode} size="sm" variant={(m.dispatch_mode ?? "OFF") === mode ? "default" : "outline"}
                      className="h-6 text-[10px]" disabled={busy} onClick={() => setMode(c, mode)}>
                      {mode}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const STATE_TONE: Record<string, string> = {
  LIVE: "text-emerald-400",
  ARMED: "text-blue-400",
  MAPPED: "text-blue-300",
  CONNECTED: "text-muted-foreground",
  NOT_CONFIGURED: "text-muted-foreground",
  DEGRADED: "text-yellow-400",
  BLOCKED: "text-red-400",
};

export function DistributionHealthPanel({ businessId }: { businessId: string }) {
  const [health, setHealth] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!businessId) return;
    setBusy(true);
    setHealth(await call("social-distribution-health", { business_id: businessId }));
    setBusy(false);
  };
  useEffect(() => { load(); }, [businessId]);

  const kill = async (scope: "global" | "business", on: boolean) => {
    const label = scope === "global" ? "EVERY business and provider" : "this business";
    if (!confirm(`${on ? "Engage" : "Release"} the kill switch for ${label}? Queued content is never deleted.`)) return;
    const scope_key = scope === "global" ? "all" : businessId;
    const { data: existing } = await supabase.from("social_distribution_pauses").select("id")
      .eq("scope", scope).eq("scope_key", scope_key).maybeSingle();
    if (existing) await supabase.from("social_distribution_pauses").update({ paused: on, reason: "founder_kill_switch" }).eq("id", existing.id);
    else await supabase.from("social_distribution_pauses").insert({ scope, scope_key, paused: on, reason: "founder_kill_switch" });
    load();
  };

  const runNow = async () => {
    setBusy(true);
    await call("social-distribution-dispatch-due", { business_id: businessId });
    setBusy(false); load();
  };

  const state = health?.health?.state ?? "—";
  const c = health?.counts ?? {};
  const switches = health?.kill_switches ?? [];
  const globalOn = switches.some((s: any) => s.scope === "global");
  const businessOn = switches.some((s: any) => s.scope === "business" && s.scope_key === businessId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Activity size={14} /> Distribution health</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={runNow}>Run dispatcher now</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={load}><RefreshCw size={12} /></Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${STATE_TONE[state] ?? ""}`}>{state}</span>
          <span className="text-muted-foreground">{health?.health?.detail}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["due", "scheduled", "draft_in_provider", "blocked", "failed", "published", "retrying", "submission_unknown"].map((k) => (
            <div key={k} className="border rounded p-2 flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{c[k] ?? 0}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <span className="text-muted-foreground">Dispatcher</span>
          <span className={health?.dispatcher?.status === "LIVE" ? "text-emerald-400" : "text-yellow-400"}>
            {health?.dispatcher?.status ?? "—"}{health?.dispatcher?.schedule_registered ? "" : " (CONFIGURATION REQUIRED)"}
          </span>
          <span className="text-muted-foreground">Maintenance (retry + reconcile)</span>
          <span className={health?.maintenance?.status === "LIVE" ? "text-emerald-400" : "text-yellow-400"}>
            {health?.maintenance?.status ?? "—"}{health?.maintenance?.schedule_registered ? "" : " (CONFIGURATION REQUIRED)"}
          </span>
          <span className="text-muted-foreground">Last maintenance run</span>
          <span className="font-mono">{health?.maintenance?.last_run_at ? new Date(health.maintenance.last_run_at).toLocaleString() : "never"}</span>
          <span className="text-muted-foreground">Last run</span>
          <span className="font-mono">{health?.dispatcher?.last_run_at ? new Date(health.dispatcher.last_run_at).toLocaleString() : "never"}</span>
          <span className="text-muted-foreground">Channels</span>
          <span className="font-mono">
            {health?.channels?.mapped ?? 0} mapped · {health?.channels?.auto_schedule ?? 0} auto · {health?.channels?.draft ?? 0} draft · {health?.channels?.off ?? 0} off
          </span>
        </div>
        <div className="border rounded p-2 space-y-2">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={14} className={globalOn || businessOn ? "text-red-400" : "text-muted-foreground"} /> Emergency kill switch</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={businessOn ? "outline" : "destructive"} disabled={!businessId} onClick={() => kill("business", !businessOn)}>
              {businessOn ? "Release business kill switch" : "Kill switch — this business"}
            </Button>
            <Button size="sm" variant={globalOn ? "outline" : "destructive"} onClick={() => kill("global", !globalOn)}>
              {globalOn ? "Release portfolio kill switch" : "Kill switch — whole portfolio"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Blocks every new provider call immediately. Queued content and schedules are preserved.</p>
        </div>
        <Out data={health?.health} />
      </CardContent>
    </Card>
  );
}

export function DistributionPolicyPanel({ businessId }: { businessId: string }) {
  const [policy, setPolicy] = useState<any>(null);
  const [paused, setPaused] = useState<any[]>([]);

  const load = async () => {
    if (!businessId) return;
    const [{ data: p }, { data: pa }] = await Promise.all([
      supabase.from("social_distribution_policies").select("*").eq("business_id", businessId).eq("provider", "buffer").maybeSingle(),
      supabase.from("social_distribution_pauses").select("*").eq("paused", true),
    ]);
    setPolicy(p); setPaused(pa ?? []);
  };
  useEffect(() => { load(); }, [businessId]);

  const setMode = async (mode: string) => {
    if (mode === "approved_batch_autopilot") {
      // Deliberate two-step arming — never a single accidental click.
      if (!confirm("Arm automatic publishing? Approved posts will be scheduled in Buffer with no further clicks.")) return;
      const typed = prompt(`Type ${CONFIRM_PHRASE} to confirm automatic publishing.`);
      if ((typed ?? "").trim() !== CONFIRM_PHRASE) return;
    }
    if (policy) await supabase.from("social_distribution_policies").update({ policy_mode: mode }).eq("id", policy.id);
    else await supabase.from("social_distribution_policies").insert({ business_id: businessId, provider: "buffer", policy_mode: mode });
    load();
  };

  const emergency = async (on: boolean) => {
    if (on && !confirm("Emergency pause will stop ALL Buffer submissions for this business. Continue?")) return;
    if (!on && !confirm("Resume distribution for this business?")) return;
    const existing = paused.find((p) => p.scope === "business" && p.scope_key === businessId);
    if (existing) await supabase.from("social_distribution_pauses").update({ paused: on }).eq("id", existing.id);
    else await supabase.from("social_distribution_pauses").insert({ scope: "business", scope_key: businessId, paused: on, reason: "founder_action" });
    load();
  };

  const isPaused = paused.some((p) => (p.scope === "global") || (p.scope === "provider" && p.scope_key === "buffer") || (p.scope === "business" && p.scope_key === businessId));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock size={14} /> Distribution policy</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="flex flex-wrap gap-2">
          {POLICY_MODE_LABELS.map(([m, label]) => (
            <Button key={m} size="sm" variant={(policy?.policy_mode ?? "test") === m ? "default" : "outline"} disabled={!businessId} onClick={() => setMode(m)}>
              {label}
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground">
          New businesses default to <b>Off (test)</b> — nothing is ever submitted until a founder unlocks the execution gate and moves off test mode.
          <b> Draft to Buffer</b> hands approved posts to Buffer as drafts only; they are never scheduled or published.
          <b> Automatic publishing</b> schedules approved posts at their exact time and requires a typed confirmation.
        </p>
        <div className="flex items-center justify-between border rounded p-2">
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} className={isPaused ? "text-red-400" : "text-muted-foreground"} />
            Emergency pause: <b>{isPaused ? "ACTIVE" : "off"}</b>
          </span>
          {isPaused
            ? <Button size="sm" variant="outline" onClick={() => emergency(false)}>Resume</Button>
            : <Button size="sm" variant="destructive" onClick={() => emergency(true)}>Emergency pause</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export function DistributionPreviewPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);

  const preview = async () => {
    setBusy(true);
    setOut(await call("social-distribution-preview", { business_id: businessId, publish_queue_batch_id: batchId || null }));
    setBusy(false);
  };
  const distribute = async () => {
    if (!confirm("Submit every eligible approved job in this batch to Buffer?")) return;
    setBusy(true);
    setResult(await call("social-distribution-submit", { business_id: businessId, publish_queue_batch_id: batchId || null, job_ids: batchId ? null : (out?.evaluations ?? []).filter((e: any) => e.eligible).map((e: any) => e.job_id), confirmation_phrase: phrase }));
    setBusy(false); preview();
  };
  const retry = async () => {
    setBusy(true);
    setResult(await call("social-distribution-retry", { business_id: businessId }));
    setBusy(false); preview();
  };
  const reconcile = async () => {
    setBusy(true);
    setResult(await call("social-distribution-reconcile", { business_id: businessId }));
    setBusy(false); preview();
  };

  const totals = out?.status_totals ?? {};

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Distribution preview & batch dispatch</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-2 items-center">
          <Input className="h-8 w-64" placeholder="Publish queue batch id (optional)" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={preview}>Preview</Button>
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={retry}>Retry transient failures</Button>
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={reconcile}>Reconcile with Buffer</Button>
        </div>
        {out && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {["blocked", "ready", "submitting", "scheduled", "sent", "failed", "retrying", "submission_unknown", "dead_letter"].map((k) => (
              <div key={k} className="border rounded p-2 flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{totals[k] ?? 0}</span></div>
            ))}
          </div>
        )}
        {out?.evaluations?.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-auto">
            {out.evaluations.map((e: any) => (
              <div key={e.job_id} className="border rounded p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{e.channel_label ?? "no channel mapped"} — {e.text_preview || "(no text)"}</span>
                  <Badge variant={e.eligible ? "secondary" : "outline"} className="text-[10px]">{e.eligible ? "ready" : "blocked"}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  source: {e.hydrated_from} · media: {e.media_count}{e.link_url ? " · link" : ""}
                </p>
                {e.blockers?.length > 0 && <p className="text-[10px] text-yellow-400 mt-1">{e.blockers.join(", ")}</p>}
                {e.provider_input && (
                  <details className="mt-1">
                    <summary className="text-[10px] cursor-pointer text-muted-foreground">Exact payload Buffer would receive</summary>
                    <pre className="text-[10px] p-2 bg-secondary/40 rounded mt-1 overflow-x-auto">{JSON.stringify(e.provider_input, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <Input className="h-8 w-72" placeholder={`Type: ${CONFIRM_PHRASE}`} value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          <Button size="sm" disabled={busy || phrase !== CONFIRM_PHRASE || !out?.ready} onClick={distribute}>Approve & distribute batch</Button>
        </div>
        <Out data={result} />
      </CardContent>
    </Card>
  );
}

export function DistributionJobStatusPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_publish_jobs")
      .select("id, platform, distribution_status, provider_post_id, provider_status, last_error, attempt_count, scheduled_for, dead_letter_reason")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Job distribution status</CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw size={12} /></Button>
      </CardHeader>
      <CardContent className="text-xs space-y-1 max-h-72 overflow-auto">
        {rows.length === 0 && <p className="text-muted-foreground">No publish jobs.</p>}
        {rows.map((r) => (
          <div key={r.id} className="border rounded p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><ServiceBadge service={r.platform} /><span className="font-mono text-[10px]">{r.provider_post_id ?? "—"}</span></span>
              <Badge variant="outline" className="text-[10px]">{r.distribution_status}</Badge>
            </div>
            {r.last_error && <p className="text-[10px] text-red-400 mt-1">{r.last_error} (attempt {r.attempt_count})</p>}
            {r.dead_letter_reason && <p className="text-[10px] text-red-400">dead letter: {r.dead_letter_reason}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialDistributionFabricDashboard({ businessId }: { businessId: string }) {
  const [org, setOrg] = useState<string | undefined>(undefined);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BufferConnectionPanel businessId={businessId} onOrganization={setOrg} />
        <DistributionPolicyPanel businessId={businessId} />
      </div>
      <ChannelMappingPanel businessId={businessId} organizationId={org} />
      <DistributionHealthPanel businessId={businessId} />
      <DistributionPreviewPanel businessId={businessId} />
      <DistributionJobStatusPanel businessId={businessId} />
    </div>
  );
}
