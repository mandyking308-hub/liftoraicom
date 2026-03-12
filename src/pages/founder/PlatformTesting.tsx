import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, Play, Loader2, Clock, FlaskConical, Shield, Brain, Workflow, Bot, Database, Layers, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const moduleIcons: Record<string, React.ReactNode> = {
  organisations: <Database size={16} />,
  automations: <Workflow size={16} />,
  agents: <Bot size={16} />,
  systems: <Layers size={16} />,
  brain: <Brain size={16} />,
  decisions: <BarChart3 size={16} />,
  strategy: <BarChart3 size={16} />,
  deployments: <Layers size={16} />,
  architectures: <Layers size={16} />,
  templates: <Layers size={16} />,
  knowledge: <Database size={16} />,
  integrations: <Layers size={16} />,
  build_log: <Database size={16} />,
  optimisation: <BarChart3 size={16} />,
  security: <Shield size={16} />,
  data_integrity: <Shield size={16} />,
  manual: <Database size={16} />,
  executions: <Workflow size={16} />,
  expansion: <Layers size={16} />,
};

const PlatformTesting = () => {
  const queryClient = useQueryClient();

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ["platform-test-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_test_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const latestRunId = runs?.[0]?.id;

  const { data: results } = useQuery({
    queryKey: ["platform-test-results", latestRunId],
    queryFn: async () => {
      if (!latestRunId) return [];
      const { data, error } = await supabase
        .from("platform_test_results")
        .select("*")
        .eq("run_id", latestRunId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!latestRunId,
  });

  const runTests = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-testing");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Platform validation complete");
      queryClient.invalidateQueries({ queryKey: ["platform-test-runs"] });
      queryClient.invalidateQueries({ queryKey: ["platform-test-results"] });
    },
    onError: (err) => {
      toast.error("Validation failed: " + String(err));
    },
  });

  const latestRun = runs?.[0];

  const modules = results
    ? [...new Set(results.map((r) => r.module))].sort()
    : [];

  const getModuleResults = (mod: string) => results?.filter((r) => r.module === mod) ?? [];

  const statusIcon = (status: string) => {
    if (status === "passed") return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === "failed") return <XCircle size={16} className="text-destructive" />;
    return <AlertTriangle size={16} className="text-yellow-500" />;
  };

  const statusBadge = (status: string) => {
    if (status === "passed") return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Passed</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Testing & Validation</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Run diagnostics across every module to validate platform integrity
            </p>
          </div>
          <Button
            onClick={() => runTests.mutate()}
            disabled={runTests.isPending}
            className="gap-2"
          >
            {runTests.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {runTests.isPending ? "Running Tests..." : "Run Full Validation"}
          </Button>
        </div>

        {/* Summary Cards */}
        {latestRun && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <FlaskConical size={20} className="mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{latestRun.total_tests}</p>
                <p className="text-xs text-muted-foreground">Total Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <CheckCircle2 size={20} className="mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold text-green-500">{latestRun.passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <XCircle size={20} className="mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{latestRun.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <AlertTriangle size={20} className="mx-auto mb-1 text-yellow-500" />
                <p className="text-2xl font-bold text-yellow-500">{latestRun.warnings}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <Clock size={20} className="mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{latestRun.completed_at ? format(new Date(latestRun.completed_at), "dd MMM HH:mm") : "—"}</p>
                <p className="text-xs text-muted-foreground">Last Run</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overall Status */}
        {latestRun && (
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              {latestRun.status === "passed" ? (
                <>
                  <CheckCircle2 size={24} className="text-green-500" />
                  <div>
                    <p className="font-semibold text-green-500">All Systems Operational</p>
                    <p className="text-xs text-muted-foreground">Platform validation passed with no failures</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={24} className="text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">Issues Detected</p>
                    <p className="text-xs text-muted-foreground">{latestRun.failed} test(s) failed — review results below</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Module Results */}
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All Modules</TabsTrigger>
            {modules.map((m) => (
              <TabsTrigger key={m} value={m} className="capitalize gap-1.5">
                {moduleIcons[m]}
                {m.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod) => {
                const modResults = getModuleResults(mod);
                const modPassed = modResults.filter((r) => r.status === "passed").length;
                const modFailed = modResults.filter((r) => r.status === "failed").length;
                return (
                  <Card key={mod}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 capitalize">
                        {moduleIcons[mod]}
                        {mod.replace("_", " ")}
                        {modFailed > 0 ? (
                          <Badge variant="destructive" className="ml-auto text-xs">{modFailed} Failed</Badge>
                        ) : (
                          <Badge className="ml-auto bg-green-500/10 text-green-500 border-green-500/20 text-xs">All Passed</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {modResults.map((r) => (
                        <div key={r.id} className="flex items-start gap-2 text-sm">
                          {statusIcon(r.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{r.test_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.details}</p>
                          </div>
                          {r.duration_ms != null && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{r.duration_ms}ms</span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {modules.map((mod) => (
            <TabsContent key={mod} value={mod} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center gap-2">
                    {moduleIcons[mod]}
                    {mod.replace("_", " ")} Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {getModuleResults(mod).map((r) => (
                      <div key={r.id} className="flex items-center gap-3 py-3">
                        {statusIcon(r.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{r.test_name}</p>
                          <p className="text-sm text-muted-foreground">{r.details}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {r.duration_ms != null && (
                            <span className="text-xs text-muted-foreground">{r.duration_ms}ms</span>
                          )}
                          {statusBadge(r.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Run History */}
        {runs && runs.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Validation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 py-2.5 text-sm">
                    {run.status === "passed" ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-destructive" />
                    )}
                    <span className="flex-1">{run.run_name}</span>
                    <span className="text-muted-foreground">
                      {run.passed}/{run.total_tests} passed
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {run.completed_at ? format(new Date(run.completed_at), "dd MMM yyyy HH:mm") : "Running..."}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {runsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!runsLoading && (!runs || runs.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <FlaskConical size={40} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-semibold">No Validation Runs Yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Run Full Validation" to test all platform modules
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
};

export default PlatformTesting;
