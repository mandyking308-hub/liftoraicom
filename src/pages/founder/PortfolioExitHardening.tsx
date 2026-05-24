import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldAlert, ArrowLeft, AlertTriangle, ClipboardCheck, Gauge, Users, Share2, FileText, Siren, Archive, Database, AlertCircle, FlaskConical, Compass } from "lucide-react";

type Row = Record<string, any>;
const sb: any = supabase;
const useT = (table: string, order = "created_at", asc = false) => useQuery({
  queryKey: [table], queryFn: async () => {
    const { data, error } = await sb.from(table).select("*").order(order, { ascending: asc }).limit(500);
    if (error) throw error; return (data ?? []) as Row[];
  },
});
const Empty = ({ m }: { m: string }) => <div className="text-sm text-muted-foreground italic py-6 text-center">{m}</div>;

export default function PortfolioExitHardening() {
  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1400px]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-7 w-7 text-primary" /> Operational Hardening</h1>
            <p className="text-sm text-muted-foreground mt-1">Acceptance, data quality, permissions, deal-room sharing, reports, incidents, retention, errors, test/live, assumptions.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        </div>
        <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Final gate stays human</AlertTitle><AlertDescription className="text-xs">No exports, payments, outreach or buyer sharing happens here without explicit founder approval.</AlertDescription></Alert>

        <Tabs defaultValue="acceptance" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="acceptance"><ClipboardCheck className="h-3 w-3 mr-1"/>Acceptance</TabsTrigger>
            <TabsTrigger value="quality"><Gauge className="h-3 w-3 mr-1"/>Data Quality</TabsTrigger>
            <TabsTrigger value="perms"><Users className="h-3 w-3 mr-1"/>Permissions</TabsTrigger>
            <TabsTrigger value="deal"><Share2 className="h-3 w-3 mr-1"/>Buyer Pack</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="h-3 w-3 mr-1"/>Reports</TabsTrigger>
            <TabsTrigger value="incidents"><Siren className="h-3 w-3 mr-1"/>Incidents</TabsTrigger>
            <TabsTrigger value="retention"><Archive className="h-3 w-3 mr-1"/>Retention</TabsTrigger>
            <TabsTrigger value="errors"><AlertCircle className="h-3 w-3 mr-1"/>Errors</TabsTrigger>
            <TabsTrigger value="env"><FlaskConical className="h-3 w-3 mr-1"/>Test / Live</TabsTrigger>
            <TabsTrigger value="assumptions"><Compass className="h-3 w-3 mr-1"/>Assumptions</TabsTrigger>
            <TabsTrigger value="perf"><Database className="h-3 w-3 mr-1"/>Performance</TabsTrigger>
          </TabsList>
          <TabsContent value="acceptance"><Acceptance /></TabsContent>
          <TabsContent value="quality"><Quality /></TabsContent>
          <TabsContent value="perms"><Perms /></TabsContent>
          <TabsContent value="deal"><BuyerPack /></TabsContent>
          <TabsContent value="reports"><Reports /></TabsContent>
          <TabsContent value="incidents"><Incidents /></TabsContent>
          <TabsContent value="retention"><Retention /></TabsContent>
          <TabsContent value="errors"><Errors /></TabsContent>
          <TabsContent value="env"><EnvMode /></TabsContent>
          <TabsContent value="assumptions"><Assumptions /></TabsContent>
          <TabsContent value="perf"><Perf /></TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

/* Acceptance */
function Acceptance() {
  const qc = useQueryClient();
  const rows = useT("ma_acceptance_criteria", "module", true);
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { const { error } = await sb.from("ma_acceptance_criteria").update({ ...patch, last_checked: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ma_acceptance_criteria"] }); toast.success("Updated"); },
  });
  const STATUS = ["not_started","partially_complete","complete","needs_qa","failed"];
  const TEST = ["untested","passing","failing","blocked"];
  return (
    <Card className="tech-card"><CardHeader><CardTitle>Acceptance criteria</CardTitle><CardDescription>Module-by-module completion and test status.</CardDescription></CardHeader>
    <CardContent>
      {rows.data?.length === 0 ? <Empty m="No modules" /> : (
        <div className="overflow-auto max-h-[650px]">
          <Table><TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Status</TableHead><TableHead>Test</TableHead><TableHead>Owner</TableHead><TableHead>Last checked</TableHead><TableHead>Next action</TableHead></TableRow></TableHeader>
          <TableBody>{(rows.data ?? []).map(r => (
            <TableRow key={r.id}>
              <TableCell className="text-xs font-medium">{r.module}</TableCell>
              <TableCell><Select value={r.completion_status} onValueChange={(v) => update.mutate({ id: r.id, completion_status: v })}><SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue/></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell>
              <TableCell><Select value={r.test_status} onValueChange={(v) => update.mutate({ id: r.id, test_status: v })}><SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue/></SelectTrigger><SelectContent>{TEST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell>
              <TableCell className="text-xs">{r.owner}</TableCell>
              <TableCell className="text-xs">{r.last_checked ? new Date(r.last_checked).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.next_action}</TableCell>
            </TableRow>
          ))}</TableBody></Table>
        </div>
      )}
    </CardContent></Card>
  );
}

/* Quality */
function Quality() {
  const qc = useQueryClient();
  const rows = useT("ma_data_quality_scores", "computed_at", false);
  const [f, setF] = useState<any>({ record_type: "companies", record_id: "", completeness: 50, source_quality: 50, freshness: 50, duplicate_risk: 0, confidence: 50, licence_risk: "unknown", human_review_required: false, warnings: "" });
  const add = useMutation({
    mutationFn: async () => {
      const warnings = f.warnings.split(",").map((s: string) => s.trim()).filter(Boolean);
      const { error } = await sb.from("ma_data_quality_scores").upsert({ ...f, warnings, missing_required: [] }, { onConflict: "record_type,record_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ma_data_quality_scores"] }); toast.success("Scored"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="tech-card"><CardHeader><CardTitle>Score a record</CardTitle><CardDescription>Completeness, source, freshness, duplicate risk, confidence, licence risk.</CardDescription></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Select value={f.record_type} onValueChange={(v) => setF({ ...f, record_type: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["companies","investors","buyer_matches","weekly_signals","competitor_profiles","valuation_benchmarks","data_room_items","portfolio_assets"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Record id (uuid)" value={f.record_id} onChange={(e) => setF({ ...f, record_id: e.target.value })} />
        {(["completeness","source_quality","freshness","duplicate_risk","confidence"] as const).map(k => (
          <div key={k}><Label className="text-xs">{k} (0-100)</Label><Input type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></div>
        ))}
        <Select value={f.licence_risk} onValueChange={(v) => setF({ ...f, licence_risk: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["unknown","none","low","medium","high"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Textarea rows={2} placeholder="Warnings (comma separated)" value={f.warnings} onChange={(e) => setF({ ...f, warnings: e.target.value })} />
        <Button size="sm" onClick={() => add.mutate()} disabled={!f.record_id}>Save score</Button>
      </CardContent></Card>
      <Card className="tech-card"><CardHeader><CardTitle>Recent scores & warnings</CardTitle></CardHeader>
      <CardContent className="text-xs max-h-[600px] overflow-auto">
        {rows.data?.length === 0 ? <Empty m="No scores yet" /> : (rows.data ?? []).map(r => (
          <div key={r.id} className="border border-border rounded p-2 mb-2">
            <div className="flex justify-between"><span><b>{r.record_type}</b> · <span className="font-mono text-[10px]">{r.record_id.slice(0,8)}…</span></span>
              <Badge variant={r.confidence < 50 ? "destructive" : "secondary"}>conf {r.confidence ?? "—"}</Badge>
            </div>
            <div className="text-muted-foreground mt-1">completeness {r.completeness} · source {r.source_quality} · fresh {r.freshness} · dup {r.duplicate_risk} · licence {r.licence_risk}</div>
            {(r.warnings ?? []).length > 0 && <div className="text-amber-400 mt-1">⚠ {(r.warnings ?? []).join(" · ")}</div>}
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

/* Permissions matrix */
function Perms() {
  const rows = useT("ma_permissions_matrix", "role_name", true);
  const roles = Array.from(new Set((rows.data ?? []).map(r => r.role_name)));
  const caps = Array.from(new Set((rows.data ?? []).map(r => r.capability)));
  return (
    <Card className="tech-card"><CardHeader><CardTitle>Permissions matrix</CardTitle><CardDescription>Role × capability map. Edits via migration only.</CardDescription></CardHeader>
    <CardContent>
      {rows.data?.length === 0 ? <Empty m="No matrix" /> : (
        <div className="overflow-auto max-h-[650px]">
          <Table><TableHeader><TableRow><TableHead>Capability</TableHead>{roles.map(r => <TableHead key={r} className="text-xs">{r}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{caps.map(c => (
            <TableRow key={c}>
              <TableCell className="text-xs font-mono">{c}</TableCell>
              {roles.map(r => {
                const row = (rows.data ?? []).find(x => x.role_name === r && x.capability === c);
                return <TableCell key={r}>{row?.allowed ? <Badge variant="default">✓</Badge> : <Badge variant="outline" className="opacity-50">×</Badge>}</TableCell>;
              })}
            </TableRow>
          ))}</TableBody></Table>
        </div>
      )}
    </CardContent></Card>
  );
}

/* Buyer Pack readiness */
function BuyerPack() {
  const qc = useQueryClient();
  const items = useT("ma_data_room_items", "item_name", true);
  const assets = useT("ma_portfolio_assets", "asset_name", true);
  const update = useMutation({
    mutationFn: async ({ id, sharing_level }: any) => { const { error } = await sb.from("ma_data_room_items").update({ sharing_level }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ma_data_room_items"] }),
  });
  const LEVELS = ["internal","adviser_safe","buyer_safe","nda_required","do_not_share"];
  const buckets: Record<string, Row[]> = { buyer_safe: [], nda_required: [], adviser_safe: [], internal: [], do_not_share: [] };
  (items.data ?? []).forEach(i => { (buckets[i.sharing_level ?? "internal"] ??= []).push(i); });
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-5 gap-2 text-xs">
        {LEVELS.map(l => <Card key={l} className="tech-card"><CardContent className="p-3"><div className="text-muted-foreground text-[10px] uppercase">{l.replace(/_/g," ")}</div><div className="text-2xl font-bold">{buckets[l]?.length ?? 0}</div></CardContent></Card>)}
      </div>
      <Card className="tech-card"><CardHeader><CardTitle>Data room items — sharing level</CardTitle><CardDescription>Buyer-safe requires adviser sign-off. Nothing leaves the platform automatically.</CardDescription></CardHeader>
      <CardContent>
        {items.data?.length === 0 ? <Empty m="No data room items" /> : (
          <div className="overflow-auto max-h-[500px]">
            <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Item</TableHead><TableHead>Status</TableHead><TableHead>Adviser reviewed</TableHead><TableHead>Sharing</TableHead></TableRow></TableHeader>
            <TableBody>{(items.data ?? []).map(i => {
              const a = (assets.data ?? []).find(x => x.id === i.portfolio_asset_id);
              return (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{a?.asset_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{i.item_name}</TableCell>
                  <TableCell className="text-xs">{i.status}</TableCell>
                  <TableCell className="text-xs">{i.adviser_reviewed ? <Badge>yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
                  <TableCell><Select value={i.sharing_level ?? "internal"} onValueChange={(v) => update.mutate({ id: i.id, sharing_level: v })}><SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue/></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></TableCell>
                </TableRow>
              );
            })}</TableBody></Table>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}

/* Reports */
function Reports() {
  const qc = useQueryClient();
  const packs = useT("ma_reporting_packs", "generated_at", false);
  const assets = useT("ma_portfolio_assets", "asset_name", true);
  const [type, setType] = useState("weekly_founder_briefing");
  const [assetId, setAssetId] = useState("");
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("ma_reporting_packs").insert({ pack_type: type, portfolio_asset_id: assetId || null, period_start: new Date().toISOString().slice(0,10), period_end: new Date().toISOString().slice(0,10), contents: { note: "Placeholder — generator pending" } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pack created"); qc.invalidateQueries({ queryKey: ["ma_reporting_packs"] }); },
  });
  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("ma_reporting_packs").update({ approved_for_export: true, approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Approved for export"); qc.invalidateQueries({ queryKey: ["ma_reporting_packs"] }); },
  });
  const TYPES = ["weekly_founder_briefing","monthly_portfolio_review","quarterly_build_board","buyer_readiness"];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card"><CardHeader><CardTitle>Generate pack</CardTitle><CardDescription>Snapshots saved as JSON. Export requires founder approval.</CardDescription></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Select value={assetId} onValueChange={setAssetId}><SelectTrigger><SelectValue placeholder="Asset (optional)"/></SelectTrigger><SelectContent>{(assets.data ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" onClick={() => create.mutate()}>Create snapshot</Button>
      </CardContent></Card>
      <Card className="tech-card lg:col-span-2"><CardHeader><CardTitle>Recent packs</CardTitle></CardHeader>
      <CardContent className="text-xs max-h-[600px] overflow-auto">
        {packs.data?.length === 0 ? <Empty m="No packs" /> : (packs.data ?? []).map(p => (
          <div key={p.id} className="border border-border rounded p-2 mb-2">
            <div className="flex justify-between"><span><b>{p.pack_type}</b> · {new Date(p.generated_at).toLocaleString()}</span>
              {p.approved_for_export ? <Badge>approved</Badge> : <Button size="sm" variant="outline" onClick={() => approve.mutate(p.id)}>Approve for export</Button>}
            </div>
            <pre className="text-[10px] text-muted-foreground mt-1 overflow-auto max-h-40">{JSON.stringify(p.contents, null, 2)}</pre>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

/* Incidents */
function Incidents() {
  const qc = useQueryClient();
  const rows = useT("ma_incidents", "opened_at", false);
  const assets = useT("ma_portfolio_assets", "asset_name", true);
  const [f, setF] = useState<any>({ incident_type: "data_leak", title: "", description: "", severity: "medium", mitigation: "", escalation_path: "", portfolio_asset_id: "" });
  const TYPES = ["data_leak","source_licence_issue","exposed_secret","incorrect_recommendation","failed_import","duplicate_merge_error","legal_ip_concern","competitor_copy_concern","buyer_outreach_risk","compliance_concern","failed_scheduled_job","valuation_error","entity_jurisdiction_concern"];
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_incidents").insert({ ...f, portfolio_asset_id: f.portfolio_asset_id || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Logged"); qc.invalidateQueries({ queryKey: ["ma_incidents"] }); },
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("ma_incidents").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ma_incidents"] }),
  });
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2"><CardHeader><CardTitle>Register</CardTitle></CardHeader>
      <CardContent className="text-xs max-h-[600px] overflow-auto">
        {rows.data?.length === 0 ? <Empty m="No incidents" /> : (rows.data ?? []).map(r => (
          <div key={r.id} className="border border-border rounded p-2 mb-2">
            <div className="flex justify-between"><span><Badge variant={r.severity === "critical" || r.severity === "high" ? "destructive" : "secondary"} className="mr-2">{r.severity}</Badge><b>{r.title}</b></span>
              <Badge variant={r.status === "resolved" ? "default" : "secondary"}>{r.status}</Badge></div>
            <div className="text-muted-foreground mt-1">{r.incident_type} · opened {new Date(r.opened_at).toLocaleDateString()}</div>
            {r.description && <div className="mt-1">{r.description}</div>}
            {r.mitigation && <div className="text-primary mt-1">→ {r.mitigation}</div>}
            {r.status !== "resolved" && <Button size="sm" variant="outline" className="mt-2" onClick={() => resolve.mutate(r.id)}>Mark resolved</Button>}
          </div>
        ))}
      </CardContent></Card>
      <Card className="tech-card"><CardHeader><CardTitle>Log incident</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Select value={f.incident_type} onValueChange={(v) => setF({ ...f, incident_type: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}/>
        <Select value={f.severity} onValueChange={(v) => setF({ ...f, severity: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["low","medium","high","critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={f.portfolio_asset_id} onValueChange={(v) => setF({ ...f, portfolio_asset_id: v })}><SelectTrigger><SelectValue placeholder="Asset (optional)"/></SelectTrigger><SelectContent>{(assets.data ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent></Select>
        <Textarea rows={2} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}/>
        <Textarea rows={2} placeholder="Mitigation" value={f.mitigation} onChange={(e) => setF({ ...f, mitigation: e.target.value })}/>
        <Textarea rows={2} placeholder="Escalation path" value={f.escalation_path} onChange={(e) => setF({ ...f, escalation_path: e.target.value })}/>
        <Button size="sm" onClick={() => add.mutate()} disabled={!f.title}>Log</Button>
      </CardContent></Card>
    </div>
  );
}

/* Retention */
function Retention() {
  const rows = useT("ma_retention_policies", "record_class", true);
  return (
    <Card className="tech-card"><CardHeader><CardTitle>Retention & archive policy</CardTitle><CardDescription>Audit logs and adviser notes are never auto-deleted.</CardDescription></CardHeader>
    <CardContent>
      {rows.data?.length === 0 ? <Empty m="No policies" /> : (
        <Table><TableHeader><TableRow><TableHead>Record class</TableHead><TableHead>Action</TableHead><TableHead>Period (months)</TableHead><TableHead>Legal hold</TableHead><TableHead>Do not delete</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
        <TableBody>{(rows.data ?? []).map(r => (
          <TableRow key={r.id}>
            <TableCell className="text-xs font-mono">{r.record_class}</TableCell>
            <TableCell><Badge>{r.action}</Badge></TableCell>
            <TableCell className="text-xs">{r.period_months ?? "—"}</TableCell>
            <TableCell>{r.legal_hold ? <Badge variant="destructive">yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
            <TableCell>{r.do_not_delete ? <Badge variant="destructive">yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{r.notes}</TableCell>
          </TableRow>
        ))}</TableBody></Table>
      )}
    </CardContent></Card>
  );
}

/* Errors */
function Errors() {
  const qc = useQueryClient();
  const rows = useT("ma_error_queue", "occurred_at", false);
  const resolve = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("ma_error_queue").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ma_error_queue"] }),
  });
  return (
    <Card className="tech-card"><CardHeader><CardTitle>Error queue</CardTitle><CardDescription>Failures from imports, AI runs, schedulers, valuation, connectors.</CardDescription></CardHeader>
    <CardContent className="text-xs max-h-[600px] overflow-auto">
      {rows.data?.length === 0 ? <Empty m="No errors logged" /> : (rows.data ?? []).map(r => (
        <div key={r.id} className="border border-border rounded p-2 mb-2">
          <div className="flex justify-between"><span><Badge variant={r.severity === "critical" || r.severity === "high" ? "destructive" : "secondary"} className="mr-2">{r.severity}</Badge><b>{r.error_type}</b> · {r.module}</span>
            {r.resolved ? <Badge>resolved</Badge> : <Button size="sm" variant="outline" onClick={() => resolve.mutate(r.id)}>Resolve</Button>}</div>
          <div className="text-muted-foreground mt-1">{r.message}</div>
          <div className="text-[10px] text-muted-foreground mt-1">occurred {new Date(r.occurred_at).toLocaleString()} · retry {r.retry_available ? "available" : "n/a"}</div>
        </div>
      ))}
    </CardContent></Card>
  );
}

/* Test / Live */
function EnvMode() {
  const qc = useQueryClient();
  const rows = useT("ma_environment_mode", "changed_at", false);
  const current = (rows.data ?? [])[0];
  const change = useMutation({
    mutationFn: async (mode: string) => {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("ma_environment_mode").insert({ current_mode: mode, changed_by: user?.id, notes: `Switched to ${mode}` });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mode changed (audited)"); qc.invalidateQueries({ queryKey: ["ma_environment_mode"] }); },
  });
  const purge = async () => {
    if (!confirm("Purge ALL rows flagged is_test_data=true across M&A tables? This is logged.")) return;
    const tables = ["ma_portfolio_assets","ma_companies","ma_buyer_matches","ma_deals","ma_weekly_signals","ma_ai_recommendations"];
    let total = 0;
    for (const t of tables) {
      const { error, count } = await sb.from(t).delete({ count: "exact" }).eq("is_test_data", true);
      if (error) { toast.error(`${t}: ${error.message}`); return; }
      total += count ?? 0;
    }
    await sb.from("ma_backup_events").insert({ event_type: "export", status: "completed", location_note: "purge_test_data", notes: `Purged ${total} test rows` });
    toast.success(`Purged ${total} test rows`);
  };
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="tech-card"><CardHeader><CardTitle>Current mode</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={current?.current_mode === "test" ? "secondary" : "default"} className="text-base">{current?.current_mode ?? "live"}</Badge>
        <div className="flex gap-2"><Button size="sm" onClick={() => change.mutate("test")}>Switch to TEST</Button><Button size="sm" variant="outline" onClick={() => change.mutate("live")}>Switch to LIVE</Button></div>
        <Alert><AlertTriangle className="h-4 w-4"/><AlertTitle>Purge test data</AlertTitle><AlertDescription className="text-xs">Deletes only rows where <code>is_test_data=true</code> in 6 M&A tables. Auditable.</AlertDescription></Alert>
        <Button size="sm" variant="destructive" onClick={purge}>Purge test data</Button>
      </CardContent></Card>
      <Card className="tech-card"><CardHeader><CardTitle>Mode history</CardTitle></CardHeader>
      <CardContent className="text-xs max-h-[400px] overflow-auto">
        {(rows.data ?? []).map(r => <div key={r.id} className="border-b border-border py-1">{new Date(r.changed_at).toLocaleString()} · <b>{r.current_mode}</b> {r.notes && <span className="text-muted-foreground">— {r.notes}</span>}</div>)}
      </CardContent></Card>
    </div>
  );
}

/* Assumptions */
function Assumptions() {
  const qc = useQueryClient();
  const rows = useT("ma_strategic_assumptions", "created_at", false);
  const assets = useT("ma_portfolio_assets", "asset_name", true);
  const [f, setF] = useState<any>({ portfolio_asset_id: "", assumption: "", confidence: 50, evidence: "", owner: "Founder", test_method: "", review_date: "" });
  const add = useMutation({
    mutationFn: async () => { const { error } = await sb.from("ma_strategic_assumptions").insert({ ...f, portfolio_asset_id: f.portfolio_asset_id || null, review_date: f.review_date || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Recorded"); qc.invalidateQueries({ queryKey: ["ma_strategic_assumptions"] }); },
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status, outcome }: any) => { const { error } = await sb.from("ma_strategic_assumptions").update({ status, outcome }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ma_strategic_assumptions"] }),
  });
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="tech-card lg:col-span-2"><CardHeader><CardTitle>Strategic assumption register</CardTitle></CardHeader>
      <CardContent className="text-xs max-h-[600px] overflow-auto">
        {rows.data?.length === 0 ? <Empty m="No assumptions yet" /> : (rows.data ?? []).map(r => {
          const a = (assets.data ?? []).find(x => x.id === r.portfolio_asset_id);
          return (
            <div key={r.id} className="border border-border rounded p-2 mb-2">
              <div className="flex justify-between"><b>{r.assumption}</b><Badge variant={r.status === "validated" ? "default" : r.status === "invalidated" ? "destructive" : "secondary"}>{r.status}</Badge></div>
              <div className="text-muted-foreground mt-1">{a?.asset_name ?? "Portfolio-wide"} · conf {r.confidence ?? "—"} · owner {r.owner ?? "—"}</div>
              {r.evidence && <div className="mt-1"><b>Evidence:</b> {r.evidence}</div>}
              {r.test_method && <div><b>Test:</b> {r.test_method}</div>}
              {r.review_date && <div className="text-[10px]">review {new Date(r.review_date).toLocaleDateString()}</div>}
              {r.status === "open" && (
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: "validated", outcome: "Confirmed" })}>Validate</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: "invalidated", outcome: "Disproved" })}>Invalidate</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: "deferred", outcome: null })}>Defer</Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent></Card>
      <Card className="tech-card"><CardHeader><CardTitle>Record assumption</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Select value={f.portfolio_asset_id} onValueChange={(v) => setF({ ...f, portfolio_asset_id: v })}><SelectTrigger><SelectValue placeholder="Asset (optional)"/></SelectTrigger><SelectContent>{(assets.data ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}</SelectContent></Select>
        <Textarea rows={2} placeholder="Assumption" value={f.assumption} onChange={(e) => setF({ ...f, assumption: e.target.value })}/>
        <Input type="number" placeholder="Confidence 0-100" value={f.confidence} onChange={(e) => setF({ ...f, confidence: Number(e.target.value) })}/>
        <Textarea rows={2} placeholder="Evidence" value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })}/>
        <Input placeholder="Owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}/>
        <Textarea rows={2} placeholder="Test method" value={f.test_method} onChange={(e) => setF({ ...f, test_method: e.target.value })}/>
        <Input type="date" value={f.review_date} onChange={(e) => setF({ ...f, review_date: e.target.value })}/>
        <Button size="sm" onClick={() => add.mutate()} disabled={!f.assumption}>Record</Button>
      </CardContent></Card>
    </div>
  );
}

/* Performance & indexing notes */
function Perf() {
  const INDEXES = [
    "ma_buyer_matches(portfolio_asset_id)","ma_buyer_matches(buyer_warmth_status)",
    "ma_weekly_signals(related_portfolio_asset_id, signal_date DESC)","ma_weekly_signals(related_company_id, related_investor_id, source_id)",
    "ma_ai_recommendations(portfolio_asset_id, status, created_at DESC)",
    "ma_execution_targets(portfolio_asset_id, status)",
    "ma_data_room_items(portfolio_asset_id, status, sharing_level)",
    "ma_competitor_profiles(updated_at DESC)",
    "ma_portfolio_assets(current_stage)","ma_build_candidates(recommendation_status)",
    "ma_lifecycle_transitions(portfolio_asset_id, status)",
    "ma_alerts(status, portfolio_asset_id)",
    "ma_data_quality_scores(record_type, record_id)",
    "ma_incidents(status, severity)","ma_error_queue(resolved, occurred_at DESC)",
  ];
  return (
    <Card className="tech-card"><CardHeader><CardTitle>Performance & indexing</CardTitle><CardDescription>Indexes applied this migration. Dashboards cap to 200-500 rows per query.</CardDescription></CardHeader>
    <CardContent className="text-xs">
      <ul className="font-mono space-y-1">{INDEXES.map(i => <li key={i}>· {i}</li>)}</ul>
    </CardContent></Card>
  );
}