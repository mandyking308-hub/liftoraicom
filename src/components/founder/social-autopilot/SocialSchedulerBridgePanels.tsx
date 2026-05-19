import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  return <pre className="text-[10px] bg-muted/40 p-2 rounded overflow-auto max-h-56">{JSON.stringify(data, null, 2)}</pre>;
}

export function SocialSchedulerExportHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = () => businessId && call("social-scheduler-export-healthcheck", { method: "POST", body: JSON.stringify({ business_id: businessId }) }).then(setData);
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Scheduler Export Health</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs">{!data ? <p className="text-muted-foreground">No data.</p> :
        <div className="grid grid-cols-2 gap-2">{Object.entries(data).filter(([k]) => !["ok","no_external_action"].includes(k)).map(([k,v]) => (
          <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{String(v)}</span></div>
        ))}</div>}</CardContent></Card>
  );
}

export function SocialSchedulerExportPreviewPanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [exportType, setExportType] = useState("metricool_csv");
  const [batchId, setBatchId] = useState("");
  return (
    <Card><CardHeader><CardTitle className="text-base">Export Preview</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Preview eligible publish jobs as a Metricool-ready / operator-check CSV. No external action.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={exportType} onChange={e => setExportType(e.target.value)} className="border rounded px-2 py-1 text-xs bg-background">
            <option value="metricool_csv">Metricool CSV</option>
            <option value="generic_csv">Generic CSV</option>
          </select>
          <Input placeholder="optional queue_batch_id" value={batchId} onChange={e => setBatchId(e.target.value)} className="max-w-xs text-xs" />
          <Button size="sm" disabled={!businessId} onClick={async () => {
            setOut(await call("social-scheduler-export-preview", { method: "POST", body: JSON.stringify({ business_id: businessId, export_type: exportType, queue_batch_id: batchId || undefined }) }));
          }}>Preview</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialSchedulerExportCreatePanel({ businessId }: { businessId: string }) {
  const [out, setOut] = useState<any>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("metricool_csv");
  const [phrase, setPhrase] = useState("");
  const PH = "CREATE SOCIAL SCHEDULER EXPORT";
  return (
    <Card><CardHeader><CardTitle className="text-base">Create Export Batch</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="export name" value={name} onChange={e => setName(e.target.value)} className="text-xs" />
        <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-2 py-1 text-xs bg-background">
          <option value="metricool_csv">Metricool CSV</option>
          <option value="generic_csv">Generic CSV</option>
          <option value="operator_pack">Operator Pack</option>
          <option value="manual_copy_pack">Manual Copy Pack</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!businessId || !name} onClick={async () => {
            setOut(await call("social-scheduler-export-create", { method: "POST", body: JSON.stringify({ business_id: businessId, export_name: name, export_type: type }) }));
          }}>Dry run</Button>
          <Input className="max-w-[320px] text-xs" placeholder={`phrase: ${PH}`} value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!businessId || !name || phrase !== PH} onClick={async () => {
            setOut(await call("social-scheduler-export-create", { method: "POST", body: JSON.stringify({ business_id: businessId, export_name: name, export_type: type, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Create batch</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialSchedulerExportRowsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await (supabase as any).from("social_scheduler_export_rows").select("id,platform,scheduled_date,scheduled_time,caption,row_status,validation_status").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Export Rows</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs">
        {rows.length === 0 ? <p className="text-muted-foreground">No export rows yet.</p> :
          <div className="space-y-1">{rows.map(r => (
            <div key={r.id} className="flex justify-between border-b border-border/40 py-1">
              <span><Badge variant="outline">{r.platform}</Badge> {r.scheduled_date ?? "—"} {r.scheduled_time ?? ""}</span>
              <span><Badge variant="secondary">{r.row_status}</Badge> <Badge variant="outline">{r.validation_status}</Badge></span>
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialSchedulerValidationPanel({ businessId }: { businessId: string }) {
  const [batchId, setBatchId] = useState("");
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  const PH = "VALIDATE SOCIAL SCHEDULER EXPORT";
  return (
    <Card><CardHeader><CardTitle className="text-base">Validate Export</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="export_batch_id" value={batchId} onChange={e => setBatchId(e.target.value)} className="text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!batchId} onClick={async () => {
            setOut(await call("social-scheduler-export-validate", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId }) }));
          }}>Dry run</Button>
          <Input className="max-w-[320px] text-xs" placeholder={`phrase: ${PH}`} value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!batchId || phrase !== PH} onClick={async () => {
            setOut(await call("social-scheduler-export-validate", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Validate</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialSchedulerCsvPanel({ businessId }: { businessId: string }) {
  const [batchId, setBatchId] = useState("");
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  const PH = "GENERATE SOCIAL SCHEDULER CSV";
  const download = () => {
    if (!out?.csv) return;
    const blob = new Blob([out.csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `scheduler-export-${batchId.slice(0,8)}.csv`; a.click();
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Generate CSV</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Internal CSV only. No external upload. No provider API call.</p>
        <Input placeholder="export_batch_id" value={batchId} onChange={e => setBatchId(e.target.value)} className="text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!batchId} onClick={async () => {
            setOut(await call("social-scheduler-csv-generate", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId }) }));
          }}>Preview CSV</Button>
          <Input className="max-w-[320px] text-xs" placeholder={`phrase: ${PH}`} value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!batchId || phrase !== PH} onClick={async () => {
            setOut(await call("social-scheduler-csv-generate", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Generate</Button>
          {out?.csv && <Button size="sm" variant="outline" onClick={download}>Download CSV</Button>}
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialOperatorPackPanel({ businessId }: { businessId: string }) {
  const [batchId, setBatchId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  const PH = "CREATE SOCIAL OPERATOR PACK";
  return (
    <Card><CardHeader><CardTitle className="text-base">Operator Scheduling Pack</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="export_batch_id" value={batchId} onChange={e => setBatchId(e.target.value)} className="text-xs" />
        <Input placeholder="assigned_to (email or name)" value={assignee} onChange={e => setAssignee(e.target.value)} className="text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!batchId} onClick={async () => {
            setOut(await call("social-operator-pack-create", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId, assigned_to: assignee || undefined }) }));
          }}>Preview checklist</Button>
          <Input className="max-w-[320px] text-xs" placeholder={`phrase: ${PH}`} value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!batchId || phrase !== PH} onClick={async () => {
            setOut(await call("social-operator-pack-create", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId, assigned_to: assignee || undefined, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Create task</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialManualCopyPackPanel({ businessId }: { businessId: string }) {
  const [batchId, setBatchId] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Manual Copy Pack</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="optional export_batch_id" value={batchId} onChange={e => setBatchId(e.target.value)} className="text-xs" />
        <Button size="sm" disabled={!businessId} onClick={async () => {
          setOut(await call("social-manual-copy-pack-preview", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId || undefined }) }));
        }}>Build copy pack</Button>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialManualSchedulingConfirmPanel({ businessId }: { businessId: string }) {
  const [batchId, setBatchId] = useState("");
  const [notes, setNotes] = useState("");
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  const PH = "CONFIRM SOCIAL MANUAL SCHEDULING";
  return (
    <Card><CardHeader><CardTitle className="text-base">Confirm Manual Scheduling</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Marks the batch as manually scheduled outside Liftor. Does not mark as published.</p>
        <Input placeholder="export_batch_id" value={batchId} onChange={e => setBatchId(e.target.value)} className="text-xs" />
        <Textarea placeholder="confirmation notes (where scheduled, when, by whom)" value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" />
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-[320px] text-xs" placeholder={`phrase: ${PH}`} value={phrase} onChange={e => setPhrase(e.target.value)} />
          <Button size="sm" disabled={!batchId || phrase !== PH} onClick={async () => {
            setOut(await call("social-manual-scheduling-confirm", { method: "POST", body: JSON.stringify({ business_id: businessId, export_batch_id: batchId, confirmation_notes: notes, dry_run: false, confirmation_phrase: phrase }) }));
          }}>Confirm</Button>
        </div>
        <Out data={out} />
      </CardContent></Card>
  );
}

export function SocialSchedulerExportAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await (supabase as any).from("social_scheduler_export_audit").select("id,action,action_status,created_at,provider_calls,posts_scheduled_externally").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Export Audit Log</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs">
        {rows.length === 0 ? <p className="text-muted-foreground">No audit entries yet.</p> :
          <div className="space-y-1">{rows.map(r => (
            <div key={r.id} className="flex justify-between border-b border-border/40 py-1">
              <span><Badge variant="outline">{r.action}</Badge> <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span></span>
              <span className="font-mono">provider:{r.provider_calls ?? 0} · ext_sched:{r.posts_scheduled_externally ?? 0}</span>
            </div>
          ))}</div>}
      </CardContent></Card>
  );
}

export function SocialSchedulerBridgeDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-base">Scheduler Bridge / Metricool Export</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Liftor prepares Metricool-ready and operator-check CSV exports. No external API call. No external publish. No external schedule.
          A human operator uploads to Metricool / Buffer / Hootsuite manually, then confirms back here.
        </CardContent></Card>
      <div className="grid md:grid-cols-2 gap-4">
        <SocialSchedulerExportHealthPanel businessId={businessId} />
        <SocialSchedulerExportPreviewPanel businessId={businessId} />
        <SocialSchedulerExportCreatePanel businessId={businessId} />
        <SocialSchedulerExportRowsPanel businessId={businessId} />
        <SocialSchedulerValidationPanel businessId={businessId} />
        <SocialSchedulerCsvPanel businessId={businessId} />
        <SocialOperatorPackPanel businessId={businessId} />
        <SocialManualCopyPackPanel businessId={businessId} />
        <SocialManualSchedulingConfirmPanel businessId={businessId} />
        <SocialSchedulerExportAuditPanel businessId={businessId} />
      </div>
    </div>
  );
}
