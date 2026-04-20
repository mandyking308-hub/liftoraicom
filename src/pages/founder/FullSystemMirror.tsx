import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import {
  Layers, FileText, Workflow, Shield, Network, Plug, RefreshCw, CheckCircle2,
  AlertTriangle, History, Search, Database, Code2,
} from "lucide-react";
import { Download, GitCompare, Activity } from "lucide-react";

const FullSystemMirror = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");

  const tables = [
    "system_pages_index", "system_content", "system_backend_objects",
    "system_workflows_full", "system_workflow_steps", "system_rules",
    "system_integrations_full", "system_data_flows", "system_changes",
    "system_versions", "system_coverage_reports",
  ] as const;

  const { data: counts } = useQuery({
    queryKey: ["mirror-counts"],
    queryFn: async () => {
      const out: Record<string, number> = {};
      await Promise.all(tables.map(async (t) => {
        const { count } = await supabase.from(t as never).select("id", { count: "exact", head: true });
        out[t] = count ?? 0;
      }));
      return out;
    },
  });

  const { data: latestCoverage } = useQuery({
    queryKey: ["mirror-coverage"],
    queryFn: async () => {
      const { data } = await supabase.from("system_coverage_reports")
        .select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: latestVersion } = useQuery({
    queryKey: ["mirror-version"],
    queryFn: async () => {
      const { data } = await supabase.from("system_versions")
        .select("*").order("version_number", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["mirror-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("system_pages_index")
        .select("*").order("area").order("route_path");
      return data ?? [];
    },
  });

  const { data: content = [] } = useQuery({
    queryKey: ["mirror-content"],
    queryFn: async () => {
      const { data } = await supabase.from("system_content")
        .select("*").order("page").limit(500);
      return data ?? [];
    },
  });

  const { data: backend = [] } = useQuery({
    queryKey: ["mirror-backend"],
    queryFn: async () => {
      const { data } = await supabase.from("system_backend_objects")
        .select("*").order("object_kind").order("object_name");
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["mirror-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("system_workflows_full")
        .select("*, system_workflow_steps(*)").order("workflow_name");
      return data ?? [];
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["mirror-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("system_rules")
        .select("*").order("module").order("severity", { ascending: false });
      return data ?? [];
    },
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["mirror-integrations"],
    queryFn: async () => {
      const { data } = await supabase.from("system_integrations_full")
        .select("*").order("layer");
      return data ?? [];
    },
  });

  const { data: flows = [] } = useQuery({
    queryKey: ["mirror-flows"],
    queryFn: async () => {
      const { data } = await supabase.from("system_data_flows")
        .select("*").order("source_entity");
      return data ?? [];
    },
  });

  const { data: changes = [] } = useQuery({
    queryKey: ["mirror-changes"],
    queryFn: async () => {
      const { data } = await supabase.from("system_changes")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["mirror-versions"],
    queryFn: async () => {
      const { data } = await supabase.from("system_versions")
        .select("*").order("version_number", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: diffs = [] } = useQuery({
    queryKey: ["mirror-diffs"],
    queryFn: async () => {
      const { data } = await supabase.from("system_version_diffs" as never)
        .select("*").order("created_at", { ascending: false }).limit(20);
      return (data as any[]) ?? [];
    },
  });

  const [versionA, setVersionA] = useState<string>("");
  const [versionB, setVersionB] = useState<string>("");

  const filterFn = (haystack: string) =>
    !search || haystack.toLowerCase().includes(search.toLowerCase());

  const filteredPages = useMemo(() => pages.filter((p: any) =>
    filterFn(`${p.route_path} ${p.page_name} ${p.area} ${p.purpose}`)), [pages, search]);
  const filteredContent = useMemo(() => content.filter((c: any) =>
    filterFn(`${c.page} ${c.content_type} ${c.text_value} ${c.linked_feature}`)), [content, search]);
  const filteredBackend = useMemo(() => backend.filter((b: any) =>
    filterFn(`${b.object_kind} ${b.object_name} ${b.purpose}`)), [backend, search]);
  const filteredRules = useMemo(() => rules.filter((r: any) =>
    filterFn(`${r.rule_name} ${r.module} ${r.condition_text} ${r.action_text}`)), [rules, search]);
  const filteredIntegrations = useMemo(() => integrations.filter((i: any) =>
    filterFn(`${i.integration_name} ${i.layer} ${i.description}`)), [integrations, search]);
  const filteredFlows = useMemo(() => flows.filter((f: any) =>
    filterFn(`${f.source_entity} ${f.target_entity} ${f.relationship}`)), [flows, search]);

  const handleRebuild = async () => {
    const t = toast.loading("Rebuilding full manual…");
    const { data, error } = await supabase.rpc("rebuild_full_manual" as never);
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    toast.success(`Rebuilt to v${(data as any)?.version}`);
    qc.invalidateQueries();
  };

  const handleValidate = async () => {
    const t = toast.loading("Validating coverage…");
    const { data, error } = await supabase.rpc("validate_full_system_coverage" as never);
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    const score = (data as any)?.coverage_score;
    const gaps = (data as any)?.gaps_found;
    if (gaps > 0) toast.warning(`Coverage ${score}% — ${gaps} gap${gaps>1?"s":""} flagged`);
    else toast.success(`Coverage ${score}% — no gaps`);
    qc.invalidateQueries();
  };

  const handleRuntimeCheck = async () => {
    const t = toast.loading("Checking runtime vs documentation…");
    const { data, error } = await supabase.rpc("validate_runtime_vs_documentation" as never);
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    const m = (data as any)?.mismatches_found ?? 0;
    if (m > 0) toast.warning(`${m} runtime mismatch${m>1?"es":""} flagged`);
    else toast.success("Runtime matches documentation");
    qc.invalidateQueries();
  };

  const handleOrphanCheck = async () => {
    const t = toast.loading("Detecting orphan content…");
    const { data, error } = await supabase.rpc("detect_orphan_content" as never);
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    const o = (data as any)?.orphans_found ?? 0;
    if (o > 0) toast.warning(`${o} orphan content entries`);
    else toast.success("No orphan content");
    qc.invalidateQueries();
  };

  const handleCompareVersions = async () => {
    const a = parseInt(versionA), b = parseInt(versionB);
    if (!a || !b) { toast.error("Enter both version numbers"); return; }
    const t = toast.loading(`Comparing v${a} vs v${b}…`);
    const { error } = await supabase.rpc("compare_system_versions" as never, { _version_a: a, _version_b: b } as never);
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    toast.success(`Diff v${a} ↔ v${b} stored`);
    qc.invalidateQueries();
  };

  const handleExport = async () => {
    const t = toast.loading("Exporting full system snapshot…");
    const { data, error } = await supabase.rpc("export_full_system_snapshot" as never);
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liftor-system-snapshot-v${(data as any)?.manual_version ?? "x"}-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Snapshot downloaded");
  };

  const sevColor = (s: string) =>
    s === "critical" ? "destructive" : s === "high" ? "default" : "secondary";

  return (
    <FounderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="text-primary" size={24} /> Full System Mirror
            </h1>
            <p className="text-muted-foreground text-sm">
              Complete auto-generated mirror of every page, table, function, workflow, rule, and integration.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleValidate}>
              <CheckCircle2 size={16} className="mr-2" /> Validate Coverage
            </Button>
            <Button onClick={handleRebuild}>
              <RefreshCw size={16} className="mr-2" /> Rebuild Manual
            </Button>
          </div>
        </div>

        {/* Coverage strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Coverage</p>
              <p className="text-2xl font-bold text-primary">{latestCoverage?.coverage_score ?? "—"}%</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Gaps</p>
              <p className={`text-2xl font-bold ${(latestCoverage?.gaps_found ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                {latestCoverage?.gaps_found ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Manual Version</p>
              <p className="text-2xl font-bold">v{latestVersion?.version_number ?? 1}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Pages / Backend</p>
              <p className="text-2xl font-bold">{counts?.system_pages_index ?? 0} / {counts?.system_backend_objects ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Workflows / Rules</p>
              <p className="text-2xl font-bold">{counts?.system_workflows_full ?? 0} / {counts?.system_rules ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search across mirror…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 md:grid-cols-12 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="flows">Data Flows</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="diffs">Diffs</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History size={18} /> Recent Changes</CardTitle></CardHeader>
              <CardContent>
                {changes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No changes recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {changes.slice(0, 20).map((c: any) => (
                      <div key={c.id} className="flex items-start gap-3 p-2 rounded hover:bg-secondary/40">
                        <Badge variant="outline" className="text-xs">{c.change_type}</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.entity_type} · {c.entity_key || "—"}</p>
                          <p className="text-xs text-muted-foreground">{c.summary}</p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(c.created_at), "MMM d HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages */}
          <TabsContent value="pages">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg">Pages ({filteredPages.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead><TableHead>Name</TableHead>
                        <TableHead>Area</TableHead><TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPages.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.route_path}</TableCell>
                          <TableCell className="text-sm">{p.page_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.area}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.purpose}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content */}
          <TabsContent value="content">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText size={18} /> Content ({filteredContent.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead><TableHead>Type</TableHead>
                        <TableHead>Text</TableHead><TableHead>Feature</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContent.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.page}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{c.content_type}</Badge></TableCell>
                          <TableCell className="text-sm max-w-md truncate">{c.text_value}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.linked_feature}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backend */}
          <TabsContent value="backend">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Database size={18} /> Backend Objects ({filteredBackend.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kind</TableHead><TableHead>Name</TableHead>
                        <TableHead>Schema</TableHead><TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBackend.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell><Badge variant="outline" className="text-xs">{b.object_kind}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{b.object_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{b.schema_name}</TableCell>
                          <TableCell className="text-xs">{b.purpose}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows */}
          <TabsContent value="workflows">
            <div className="space-y-4">
              {workflows.map((w: any) => (
                <Card key={w.id} className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Workflow size={18} className="text-primary" /> {w.workflow_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{w.start_module}</span> → <span className="font-mono">{w.end_module}</span> · {w.step_count} steps
                    </p>
                  </CardHeader>
                  {w.system_workflow_steps?.length > 0 && (
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead><TableHead>Step</TableHead>
                            <TableHead>Trigger</TableHead><TableHead>Tables</TableHead><TableHead>Failure points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(w.system_workflow_steps as any[]).sort((a,b)=>a.step_index-b.step_index).map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell className="text-xs">{s.step_index}</TableCell>
                              <TableCell className="text-sm">{s.step_name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{s.trigger_source}</TableCell>
                              <TableCell className="text-xs font-mono">{s.linked_tables}</TableCell>
                              <TableCell className="text-xs text-destructive/80">{s.failure_points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rules */}
          <TabsContent value="rules">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield size={18} /> Rules ({filteredRules.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead><TableHead>Module</TableHead>
                        <TableHead>Condition</TableHead><TableHead>Action</TableHead><TableHead>Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm font-medium">{r.rule_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{r.module}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">{r.condition_text}</TableCell>
                          <TableCell className="text-xs max-w-xs">{r.action_text}</TableCell>
                          <TableCell><Badge variant={sevColor(r.severity) as any} className="text-xs">{r.severity}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plug size={18} /> Integrations ({filteredIntegrations.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Layer</TableHead>
                        <TableHead>Endpoint</TableHead><TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIntegrations.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="text-sm font-medium">{i.integration_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{i.layer}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{i.endpoint}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{i.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Flows */}
          <TabsContent value="flows">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Network size={18} /> Data Flows ({filteredFlows.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead><TableHead>Relationship</TableHead>
                        <TableHead>Target</TableHead><TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFlows.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-mono text-xs">{f.source_entity}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{f.relationship}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{f.target_entity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
};

export default FullSystemMirror;
