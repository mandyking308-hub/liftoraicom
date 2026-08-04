import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Lock, RefreshCw, ShieldCheck } from "lucide-react";

const CONFIRM_PHRASE = "DISTRIBUTE APPROVED BATCH";

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
        platform: channel.service ?? null, active: true,
      });
    }
    setBusy(false); load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Channel mapping</CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw size={12} /></Button>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {channels.length === 0 && <p className="text-muted-foreground">No channels synced yet. Test the connection, select an organisation, then Sync channels.</p>}
        {channels.map((c) => {
          const m = maps.find((x) => x.channel_id === c.id);
          return (
            <div key={c.id} className="flex items-center justify-between border rounded p-2 gap-2">
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
          );
        })}
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
          {["test", "approval_required", "approved_batch_autopilot", "paused"].map((m) => (
            <Button key={m} size="sm" variant={(policy?.policy_mode ?? "test") === m ? "default" : "outline"} disabled={!businessId} onClick={() => setMode(m)}>
              {m}
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground">
          New businesses default to <b>test</b> — nothing is ever submitted until a founder unlocks the execution gate and moves off test mode.
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
    setOut(await call("social-distribution-preview", { business_id: businessId, batch_id: batchId || null }));
    setBusy(false);
  };
  const distribute = async () => {
    if (!confirm("Submit every eligible approved job in this batch to Buffer?")) return;
    setBusy(true);
    setResult(await call("social-distribution-submit", { business_id: businessId, batch_id: batchId || null, job_ids: batchId ? null : (out?.evaluations ?? []).filter((e: any) => e.eligible).map((e: any) => e.job_id), confirmation_phrase: phrase }));
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
          <Input className="h-8 w-64" placeholder="Queue batch id (optional)" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={preview}>Preview</Button>
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={retry}>Retry transient failures</Button>
          <Button size="sm" variant="outline" disabled={!businessId || busy} onClick={reconcile}>Reconcile with Buffer</Button>
        </div>
        {out && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {["blocked", "ready", "submitting", "scheduled", "sent", "failed", "retrying", "dead_letter"].map((k) => (
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
                {!e.eligible && <p className="text-[10px] text-yellow-400 mt-1">{e.blockers.join(", ")}</p>}
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
      <DistributionPreviewPanel businessId={businessId} />
      <DistributionJobStatusPanel businessId={businessId} />
    </div>
  );
}
