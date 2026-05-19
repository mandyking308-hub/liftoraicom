import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

async function call(path: string, init: RequestInit) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token ?? "";
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  return r.json();
}

function Out({ data }: { data: any }) {
  if (!data) return null;
  return <pre className="text-[10px] bg-muted/40 p-2 rounded overflow-auto max-h-48">{JSON.stringify(data, null, 2)}</pre>;
}

export function SocialPublishingHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = () => businessId && call(`social-publishing-healthcheck?business_id=${businessId}`, { method: "GET" }).then(setData);
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Publishing Health</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs">
        {!data ? <p className="text-muted-foreground">No data.</p> :
          <div className="grid grid-cols-2 gap-2">{Object.entries(data).filter(([k]) => !["ok", "no_external_action"].includes(k)).map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{String(v)}</span></div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialPublishQueuePreviewPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [phrase, setPhrase] = useState("");
  const [ids, setIds] = useState("");
  return (
    <Card><CardHeader><CardTitle className="text-base">Queue Preview & Job Creation</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Approved content/calendar items become internal publish jobs. No external publishing.</p>
        <Textarea placeholder="optional: comma-separated content_item_ids or calendar_item_ids" value={ids} onChange={e => setIds(e.target.value)} className="text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!businessId} onClick={async () => {
            const arr = ids.split(",").map(s => s.trim()).filter(Boolean);
            setOut(await call("social-publish-queue-preview", { method: "POST", body: JSON.stringify({ business_id: businessId, content_item_ids: arr.length ? arr : undefined }) }));
          }}>Preview eligibility</Button>
          <Input className="max-w-[300px]" placeholder='phrase: CREATE SOCIAL PUBLISH JOBS' value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!businessId || phrase !== "CREATE SOCIAL PUBLISH JOBS"} onClick={async () => {
            const arr = ids.split(",").map(s => s.trim()).filter(Boolean);
            setOut(await call("social-publish-job-create", { method: "POST", body: JSON.stringify({ business_id: businessId, content_item_ids: arr.length ? arr : undefined, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Create jobs</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialPublishJobsPanel({ businessId, onSelect }: { businessId: string; onSelect?: (id: string) => void }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_publish_jobs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    setJobs(data || []);
  };
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Publish Jobs</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs space-y-1">
        {!jobs.length ? <p className="text-muted-foreground">No jobs.</p> :
          jobs.map((j: any) => (
            <div key={j.id} className="flex items-center justify-between border rounded p-2 cursor-pointer hover:bg-muted/40" onClick={() => onSelect?.(j.id)}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{j.platform}/{j.provider}</Badge>
                <span>{j.job_type}</span>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-[10px]">{j.status}</Badge>
                <Badge variant="outline" className="text-[10px]">gate:{j.execution_gate_status}</Badge>
                {j.manual_export_status !== "not_exported" && <Badge variant="outline" className="text-[10px]">{j.manual_export_status}</Badge>}
                {j.block_reason && <Badge variant="destructive" className="text-[10px]">{j.block_reason}</Badge>}
              </div>
            </div>
          ))}
      </CardContent></Card>
  );
}

export function SocialPublishBatchPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [phrase, setPhrase] = useState("");
  const [name, setName] = useState("Batch " + new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("manual_export");
  const [ids, setIds] = useState("");
  return (
    <Card><CardHeader><CardTitle className="text-base">Publish Batches</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!businessId} onClick={async () => {
            setOut(await call("social-publish-batch-preview", { method: "POST", body: JSON.stringify({ business_id: businessId }) }));
          }}>Preview unbatched</Button>
        </div>
        <Input placeholder="batch name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2">
          <select className="border rounded h-9 px-2 bg-background text-sm" value={type} onChange={e => setType(e.target.value)}>
            {["calendar_day", "calendar_week", "calendar_month", "campaign", "platform", "provider", "manual_export", "mixed"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="publish_job_ids (comma)" value={ids} onChange={e => setIds(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-[300px]" placeholder='phrase: CREATE SOCIAL PUBLISH BATCH' value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!businessId || phrase !== "CREATE SOCIAL PUBLISH BATCH"} onClick={async () => {
            const arr = ids.split(",").map(s => s.trim()).filter(Boolean);
            setOut(await call("social-publish-batch-create", { method: "POST", body: JSON.stringify({ business_id: businessId, batch_name: name, batch_type: type, publish_job_ids: arr, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Create batch</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialProviderRouterPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [jobId, setJobId] = useState("");
  return (
    <Card><CardHeader><CardTitle className="text-base">Provider Router (preview)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="publish_job_id" value={jobId} onChange={e => setJobId(e.target.value)} />
        <Button size="sm" disabled={!businessId || !jobId} onClick={async () => {
          setOut(await call("social-provider-router-preview", { method: "POST", body: JSON.stringify({ business_id: businessId, publish_job_id: jobId }) }));
        }}>Route preview</Button>
        <p className="text-xs text-muted-foreground">All provider execution is locked this sprint.</p>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialProviderConnectionsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_provider_connections").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Provider Connections</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs space-y-1">
        <p className="text-muted-foreground">No raw secrets stored. Token references only.</p>
        {!rows.length ? <p className="text-muted-foreground">No connections.</p> :
          rows.map(r => (
            <div key={r.id} className="flex items-center justify-between border rounded p-2">
              <span>{r.provider} — {r.connection_name}</span>
              <Badge variant="secondary" className="text-[10px]">{r.connection_status}</Badge>
            </div>
          ))}
      </CardContent></Card>
  );
}

export function SocialProviderExecutionGatesPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const refresh = () => businessId && call("social-provider-execution-gate-check", { method: "POST", body: JSON.stringify({ business_id: businessId }) }).then(setOut);
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Execution Gates</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs space-y-1">
        <p className="text-muted-foreground">All gates locked. Future provider execution requires explicit unlock.</p>
        {!out?.gates?.length ? <p className="text-muted-foreground">No gates configured.</p> :
          out.gates.map((g: any) => (
            <div key={g.id} className="flex items-center justify-between border rounded p-2">
              <span>{g.provider} · {g.action_type}</span>
              <Badge variant={g.gate_status === "locked" ? "secondary" : "default"} className="text-[10px]">{g.gate_status}</Badge>
            </div>
          ))}
      </CardContent></Card>
  );
}

export function SocialManualExportPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [phrase, setPhrase] = useState("");
  const [name, setName] = useState("Export " + new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("generic_csv");
  const [batchId, setBatchId] = useState("");
  return (
    <Card><CardHeader><CardTitle className="text-base">Manual Export (operator only — no API call)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="export name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2">
          <select className="border rounded h-9 px-2 bg-background text-sm" value={type} onChange={e => setType(e.target.value)}>
            {["metricool_csv", "buffer_csv", "hootsuite_csv", "generic_csv", "operator_pack", "manual_copy_pack"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="queue_batch_id (optional)" value={batchId} onChange={e => setBatchId(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!businessId} onClick={async () => {
            setOut(await call("social-manual-export-preview", { method: "POST", body: JSON.stringify({ business_id: businessId, batch_id: batchId || undefined, export_type: type }) }));
          }}>Preview</Button>
          <Input className="max-w-[300px]" placeholder='phrase: CREATE SOCIAL MANUAL EXPORT' value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!businessId || phrase !== "CREATE SOCIAL MANUAL EXPORT"} onClick={async () => {
            setOut(await call("social-manual-export-create", { method: "POST", body: JSON.stringify({ business_id: businessId, export_name: name, export_type: type, batch_id: batchId || undefined, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Create export</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialPublishingAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_publish_queue_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data || []);
  };
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Publish Queue Audit</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs space-y-1">
        {!rows.length ? <p className="text-muted-foreground">No audit entries.</p> :
          rows.map(r => (
            <div key={r.id} className="flex items-center justify-between border rounded p-2">
              <span><Badge variant="outline" className="text-[10px] mr-1">{r.action}</Badge>{r.provider ?? ""} {r.platform ?? ""}</span>
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
      </CardContent></Card>
  );
}

export function SocialPublishingDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <SocialPublishingHealthPanel businessId={businessId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SocialPublishQueuePreviewPanel businessId={businessId} />
        <SocialPublishBatchPanel businessId={businessId} />
      </div>
      <SocialPublishJobsPanel businessId={businessId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SocialProviderRouterPanel businessId={businessId} />
        <SocialProviderConnectionsPanel businessId={businessId} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SocialProviderExecutionGatesPanel businessId={businessId} />
        <SocialManualExportPanel businessId={businessId} />
      </div>
      <SocialPublishingAuditPanel businessId={businessId} />
    </div>
  );
}