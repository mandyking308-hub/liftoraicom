import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Layers, Workflow as WorkflowIcon, GitBranch, Network } from "lucide-react";
import { Link } from "react-router-dom";

type RegistryRow = {
  id: string;
  manual_source: string;
  object_kind: string;
  object_name: string;
  route_path: string | null;
  module_area: string | null;
  command_centre_section: string | null;
  business_scoped: boolean;
  external_action_risk: boolean;
  requires_founder_approval: boolean;
  owner_agent_key: string | null;
  workflow_key: string | null;
  data_flow_key: string | null;
  readiness_status: string;
  visibility_status: string;
  next_action: string | null;
};

type WfRow = {
  workflow_key: string;
  workflow_name: string;
  source_object: string | null;
  target_object: string | null;
  command_centre_section: string | null;
  owner_agent_key: string | null;
  business_scoped: boolean;
  readiness_status: string;
  test_status: string;
  external_action_risk: boolean;
  founder_approval_required: boolean;
  next_action: string | null;
};

type DfRow = {
  flow_key: string;
  source_object: string;
  target_object: string;
  command_centre_section: string | null;
  workflow_key: string | null;
  owner_agent_key: string | null;
  readiness_status: string;
  next_action: string | null;
};

function StatusBadge({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  if (v === "registered" || v === "ready" || v === "passed") return <Badge>{value}</Badge>;
  if (v === "failed" || v === "missing") return <Badge variant="destructive">{value}</Badge>;
  if (v === "partial" || v === "warn") return <Badge variant="secondary">{value}</Badge>;
  return <Badge variant="outline">{value || "—"}</Badge>;
}

function RegRow({ r }: { r: RegistryRow }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-xs border-b border-border/40 py-1.5">
      <div className="col-span-3 truncate">
        {r.route_path ? (
          <Link to={r.route_path.replace(/:[^/]+/g, "")} className="text-primary hover:underline">{r.object_name}</Link>
        ) : <span>{r.object_name}</span>}
      </div>
      <div className="col-span-2 text-muted-foreground truncate">{r.command_centre_section ?? "—"}</div>
      <div className="col-span-2 text-muted-foreground truncate">{r.owner_agent_key ?? "—"}</div>
      <div className="col-span-1"><StatusBadge value={r.readiness_status} /></div>
      <div className="col-span-1">{r.business_scoped ? <Badge variant="outline">biz</Badge> : <Badge variant="outline">global</Badge>}</div>
      <div className="col-span-1">{r.external_action_risk ? <Badge variant="destructive">ext</Badge> : <Badge variant="outline">internal</Badge>}</div>
      <div className="col-span-2 text-muted-foreground truncate">{r.next_action ?? "—"}</div>
    </div>
  );
}

function RegList({ rows }: { rows: RegistryRow[] }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">No items in this category yet.</p>;
  return (
    <ScrollArea className="h-[320px] pr-2">
      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60 pb-1 mb-1">
        <div className="col-span-3">Object</div>
        <div className="col-span-2">CC section</div>
        <div className="col-span-2">Owner</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Scope</div>
        <div className="col-span-1">Risk</div>
        <div className="col-span-2">Next</div>
      </div>
      {rows.map((r) => <RegRow key={r.id} r={r} />)}
    </ScrollArea>
  );
}

export default function FullManualFunctionControlPanel() {
  const reg = useQuery<RegistryRow[]>({
    queryKey: ["cc-manual-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("command_centre_manual_registry")
        .select("id,manual_source,object_kind,object_name,route_path,module_area,command_centre_section,business_scoped,external_action_risk,requires_founder_approval,owner_agent_key,workflow_key,data_flow_key,readiness_status,visibility_status,next_action")
        .order("object_kind").order("object_name");
      if (error) throw error;
      return (data ?? []) as RegistryRow[];
    },
    staleTime: 60_000,
  });
  const wf = useQuery<WfRow[]>({
    queryKey: ["cc-workflow-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("command_centre_workflow_registry")
        .select("workflow_key,workflow_name,source_object,target_object,command_centre_section,owner_agent_key,business_scoped,readiness_status,test_status,external_action_risk,founder_approval_required,next_action")
        .order("workflow_name");
      if (error) throw error;
      return (data ?? []) as WfRow[];
    },
    staleTime: 60_000,
  });
  const df = useQuery<DfRow[]>({
    queryKey: ["cc-data-flow-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("command_centre_data_flow_registry")
        .select("flow_key,source_object,target_object,command_centre_section,workflow_key,owner_agent_key,readiness_status,next_action")
        .order("flow_key");
      if (error) throw error;
      return (data ?? []) as DfRow[];
    },
    staleTime: 60_000,
  });

  const acceptance = useQuery({
    queryKey: ["full-manual-cc-acceptance"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("full-manual-command-centre-acceptance", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const rows = reg.data ?? [];
  const groups = useMemo(() => ({
    routes: rows.filter((r) => r.object_kind === "route"),
    backend: rows.filter((r) => r.object_kind === "table" || r.object_kind === "view"),
    edge: rows.filter((r) => r.object_kind === "edge_function"),
    rules: rows.filter((r) => r.object_kind === "rule" || r.object_kind === "compliance_rule"),
    integrations: rows.filter((r) => r.object_kind === "integration"),
  }), [rows]);

  const bySection = (section: string) => rows.filter((r) => (r.command_centre_section ?? "").toLowerCase() === section);

  const scores = acceptance.data?.scores ?? {};
  const counts = acceptance.data?.counts ?? {};
  const cls = acceptance.data?.classifications ?? {};

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Full Manual Function Control
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Single cockpit for every manual route, backend object, edge function, workflow and data flow. Read-only audit.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> No send · No publish · No provider mutation</Badge>
          <Badge>{cls.overall ?? "—"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <Score label="Manual coverage" v={scores.manual_coverage_score ?? 0} />
          <Score label="CC visibility" v={scores.command_centre_visibility_score ?? 0} />
          <Score label="Workflow coverage" v={scores.workflow_coverage_score ?? 0} />
          <Score label="Commercial backbone" v={scores.commercial_backbone_score ?? 0} />
          <Score label="Multi-business" v={scores.multi_business_score ?? 0} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px] text-muted-foreground">
          <Counter label="Manual objects" v={counts.manual_objects} />
          <Counter label="Modules" v={counts.modules} />
          <Counter label="Workflows" v={counts.workflows} />
          <Counter label="Data flows" v={counts.data_flows} />
          <Counter label="Lost features" v={counts.lost_features} tone={(counts.lost_features ?? 0) > 0 ? "warn" : "ok"} />
          <Counter label="Hidden pages" v={counts.hidden_pages} tone={(counts.hidden_pages ?? 0) > 0 ? "warn" : "ok"} />
        </div>

        <Tabs defaultValue="coverage" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="flex w-max gap-1">
              <TabsTrigger value="coverage">Coverage</TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
              <TabsTrigger value="backend">Backend</TabsTrigger>
              <TabsTrigger value="edge">Edge fns</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="dataflows">Data flows</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="commercial">Commercial</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
              <TabsTrigger value="crm">CRM/AI</TabsTrigger>
              <TabsTrigger value="outbound">Outbound</TabsTrigger>
              <TabsTrigger value="social">Social/Mkt</TabsTrigger>
              <TabsTrigger value="support">Support/Portal</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="lost">Lost features</TabsTrigger>
              <TabsTrigger value="matrix">25-business</TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="coverage" className="pt-3 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(scores).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
                  <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                  <Badge>{Number(v)}%</Badge>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(cls).map(([k, v]) => (
                <div key={k} className="rounded-md border border-border/60 px-2 py-1.5">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}: </span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="routes"><RegList rows={groups.routes} /></TabsContent>
          <TabsContent value="backend"><RegList rows={groups.backend} /></TabsContent>
          <TabsContent value="edge"><RegList rows={groups.edge} /></TabsContent>
          <TabsContent value="rules"><RegList rows={groups.rules} /></TabsContent>
          <TabsContent value="integrations"><RegList rows={groups.integrations} /></TabsContent>

          <TabsContent value="workflows" className="pt-3">
            <ScrollArea className="h-[320px] pr-2">
              {(wf.data ?? []).map((w) => (
                <div key={w.workflow_key} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <WorkflowIcon className="h-3 w-3 text-primary" />
                    <span className="font-medium truncate">{w.workflow_name}</span>
                    <span className="text-muted-foreground truncate">{w.source_object} → {w.target_object}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{w.owner_agent_key ?? "—"}</Badge>
                    {w.external_action_risk && <Badge variant="destructive">ext</Badge>}
                    <StatusBadge value={w.readiness_status} />
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="dataflows" className="pt-3">
            <ScrollArea className="h-[320px] pr-2">
              {(df.data ?? []).map((f) => (
                <div key={f.flow_key} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="h-3 w-3 text-primary" />
                    <span className="truncate">{f.source_object} <Network className="inline h-3 w-3 mx-0.5" /> {f.target_object}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{f.workflow_key ?? "—"}</Badge>
                    <Badge variant="outline">{f.owner_agent_key ?? "—"}</Badge>
                    <StatusBadge value={f.readiness_status} />
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="commercial"><RegList rows={[...bySection("commercial"), ...bySection("finance")]} /></TabsContent>
          <TabsContent value="suppliers"><RegList rows={bySection("suppliers")} /></TabsContent>
          <TabsContent value="crm"><RegList rows={[...bySection("crm"), ...bySection("agents")]} /></TabsContent>
          <TabsContent value="outbound"><RegList rows={bySection("outbound")} /></TabsContent>
          <TabsContent value="social"><RegList rows={[...bySection("social"), ...bySection("marketing"), ...bySection("content"), ...bySection("assets")]} /></TabsContent>
          <TabsContent value="support"><RegList rows={[...bySection("support"), ...bySection("portal"), ...bySection("partners")]} /></TabsContent>
          <TabsContent value="security"><RegList rows={[...bySection("security"), ...bySection("compliance")]} /></TabsContent>
          <TabsContent value="testing"><RegList rows={[...bySection("testing"), ...bySection("system")]} /></TabsContent>

          <TabsContent value="lost" className="pt-3">
            <p className="text-xs text-muted-foreground">
              Lost features: <Badge variant={counts.lost_features ? "destructive" : "outline"}>{counts.lost_features ?? 0}</Badge>
              {" · "}Hidden pages: <Badge variant={counts.hidden_pages ? "destructive" : "outline"}>{counts.hidden_pages ?? 0}</Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Run the Lost Feature Detector or Master Reconciliation panel for the full diff and recommended fixes.
            </p>
          </TabsContent>

          <TabsContent value="matrix" className="pt-3">
            <p className="text-xs text-muted-foreground">
              Multi-business coverage score: <Badge>{scores.multi_business_score ?? 0}%</Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Open the Business Capability Matrix for the per-business module grid (any new business inherits the same modules).
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Score({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <Progress value={v} className="h-1.5 flex-1" />
        <span className="text-xs font-medium">{v}%</span>
      </div>
    </div>
  );
}

function Counter({ label, v, tone = "ok" }: { label: string; v: any; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
      <span>{label}</span>
      <Badge variant={tone === "warn" ? "destructive" : "outline"}>{v ?? 0}</Badge>
    </div>
  );
}