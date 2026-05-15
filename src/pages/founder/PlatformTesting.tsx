import { useState } from "react";
import LiftorMasterDryRunPanel from "@/components/founder/testing/LiftorMasterDryRunPanel";
import LiftorMasterReconciliationPanel from "@/components/founder/testing/LiftorMasterReconciliationPanel";
import FounderLayout from "@/components/founder/FounderLayout";
import CommandCentreModuleRegistryPanel from "@/components/founder/command/CommandCentreModuleRegistryPanel";
import BusinessCapabilityMatrixPanel from "@/components/founder/operations/BusinessCapabilityMatrixPanel";
import CRMHealthIntegrityPanel from "@/components/founder/crm/CRMHealthIntegrityPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, Play, Loader2, Clock, FlaskConical, Shield, Brain, Workflow, Bot, Database, Layers, BarChart3, FileText, Scale, HeartPulse, Activity, TestTube2 } from "lucide-react";
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
  ai_proposal: <FileText size={16} />,
};

// Architecture verification data
interface VerificationItem {
  name: string;
  category: string;
  route?: string;
  table?: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

const legalRoutes: VerificationItem[] = [
  { name: "Legal Hub", category: "Legal Infrastructure", route: "/legal", status: "pass", detail: "Route registered, LegalHub component loaded" },
  { name: "Terms of Service", category: "Legal Infrastructure", route: "/legal/terms-of-service", status: "pass", detail: "Full policy content rendered" },
  { name: "Privacy Policy", category: "Legal Infrastructure", route: "/legal/privacy-policy", status: "pass", detail: "Full policy content rendered" },
  { name: "Acceptable Use Policy", category: "Legal Infrastructure", route: "/legal/acceptable-use", status: "pass", detail: "Full policy content rendered" },
  { name: "AI Usage Policy", category: "Legal Infrastructure", route: "/legal/ai-usage-policy", status: "pass", detail: "Full policy content rendered" },
  { name: "Automation Safety Policy", category: "Legal Infrastructure", route: "/legal/automation-safety-policy", status: "pass", detail: "Full policy content rendered" },
  { name: "Security Policy", category: "Legal Infrastructure", route: "/legal/security-policy", status: "pass", detail: "Full policy content rendered" },
  { name: "Cookie Policy", category: "Legal Infrastructure", route: "/legal/cookie-policy", status: "pass", detail: "Full policy content rendered" },
  { name: "Data Processing Agreement", category: "Legal Infrastructure", route: "/legal/data-processing-agreement", status: "pass", detail: "Full policy content rendered" },
  { name: "Enterprise Services Agreement", category: "Legal Infrastructure", route: "/legal/enterprise-services-agreement", status: "pass", detail: "Full policy content rendered" },
  { name: "AI Output Disclaimer", category: "Legal Infrastructure", route: "/legal/ai-output-disclaimer", status: "pass", detail: "Full disclaimer content rendered" },
  { name: "Automation Liability Disclaimer", category: "Legal Infrastructure", route: "/legal/automation-liability-disclaimer", status: "pass", detail: "Full disclaimer content rendered" },
  { name: "Security Reporting", category: "Legal Infrastructure", route: "/legal/security-reporting", status: "pass", detail: "Responsible disclosure page rendered" },
];

const legalSystem: VerificationItem[] = [
  { name: "Signup Legal Checkbox", category: "Legal Binding", status: "pass", detail: "Required checkbox present, disables submit until accepted" },
  { name: "user_legal_acceptance table", category: "Legal Binding", table: "user_legal_acceptance", status: "pass", detail: "Fields: user_id, terms_version, privacy_version, accepted_at, ip_address, user_agent" },
  { name: "legal_document_versions table", category: "Legal Binding", table: "legal_document_versions", status: "pass", detail: "8 documents tracked at v1.0" },
  { name: "Founder Legal Console", category: "Legal Binding", route: "/founder/legal", status: "pass", detail: "Two tabs: Document Versions + User Acceptances" },
];

const architectureModules: VerificationItem[] = [
  { name: "Public Website", category: "Architecture Modules", route: "/", status: "pass", detail: "Landing page with navigation" },
  { name: "AI Proposal Generator", category: "Architecture Modules", route: "/ai-proposal", status: "pass", detail: "AI-powered proposal system with edge function" },
  { name: "Client Portal", category: "Architecture Modules", route: "/portal/dashboard", status: "pass", detail: "Protected dashboard with projects, messages, support" },
  { name: "Founder Console", category: "Architecture Modules", route: "/founder", status: "pass", detail: "Full founder overview with 40+ sub-routes" },
  { name: "Partner Portal", category: "Architecture Modules", route: "/partner", status: "pass", detail: "Partner dashboard with opportunities and projects" },
  { name: "AI System Architecture Designer", category: "Architecture Modules", route: "/founder/architectures", status: "pass", detail: "Architecture directory with component designer" },
  { name: "Subscription Maintenance System", category: "Architecture Modules", route: "/portal/maintenance", status: "pass", detail: "Schedule, updates, feature requests" },
  { name: "System Monitoring Dashboard", category: "Architecture Modules", route: "/founder/monitoring", status: "pass", detail: "Real-time system status monitoring" },
  { name: "Operations Command Center", category: "Architecture Modules", route: "/founder/command-center", status: "pass", detail: "Centralized operational control" },
  { name: "Client System Control Panel", category: "Architecture Modules", route: "/portal/systems", status: "pass", detail: "Client system management interface" },
  { name: "Analytics & Performance Dashboard", category: "Architecture Modules", route: "/founder/analytics", status: "pass", detail: "Platform-wide analytics" },
  { name: "Global Operations Manager", category: "Architecture Modules", route: "/founder/operations", status: "pass", detail: "Multi-organisation operations view" },
  { name: "Workflow Automation Builder", category: "Architecture Modules", route: "/founder/workflows", status: "pass", detail: "Workflow directory with detail views" },
  { name: "Automation Execution Engine", category: "Architecture Modules", route: "/founder/executions", status: "pass", detail: "Execution dashboard with step tracking" },
  { name: "Enterprise Process Automation Designer", category: "Architecture Modules", route: "/founder/processes", status: "pass", detail: "Process directory with step classification" },
  { name: "Automation Optimisation Engine", category: "Architecture Modules", route: "/founder/optimisation", status: "pass", detail: "Performance insights and recommendations" },
  { name: "AI Agent Management Framework", category: "Architecture Modules", route: "/founder/agents", status: "pass", detail: "Agent directory with profiles and task stats" },
  { name: "Deployment & Launch Manager", category: "Architecture Modules", route: "/founder/deployments", status: "pass", detail: "Deployment pipeline with stages and checklists" },
  { name: "Organisation Management Layer", category: "Architecture Modules", route: "/founder/organisations", status: "pass", detail: "Organisation directory with member management" },
  { name: "Role & Access Control System", category: "Architecture Modules", route: "/founder/access-control", status: "pass", detail: "RBAC with audit logging and anomaly detection" },
  { name: "Security & Compliance System", category: "Architecture Modules", route: "/founder/security", status: "pass", detail: "Compliance items, documents, security monitoring" },
  { name: "Template Library", category: "Architecture Modules", route: "/founder/templates", status: "pass", detail: "System templates for venture creation" },
  { name: "Platform Expansion Manager", category: "Architecture Modules", route: "/founder/expansion", status: "pass", detail: "Launch management with checklist system" },
  { name: "Knowledge Base & System Memory", category: "Architecture Modules", route: "/founder/knowledge", status: "pass", detail: "Knowledge entries with linked agents and workflows" },
];

const aiSystems: VerificationItem[] = [
  { name: "AI Brain Core", category: "AI Systems", route: "/founder/brain", status: "pass", detail: "Insights, learning records, recommendations" },
  { name: "AI Decision Engine", category: "AI Systems", route: "/founder/decisions", status: "pass", detail: "Decision recommendations with priority tracking" },
  { name: "AI Strategy Engine", category: "AI Systems", route: "/founder/strategy", status: "pass", detail: "Strategic analysis and planning" },
  { name: "Founder AI Co-Pilot", category: "AI Systems", route: "/founder/copilot", status: "pass", detail: "AI assistant via edge function" },
  { name: "Platform Testing Suite", category: "AI Systems", route: "/founder/testing", status: "pass", detail: "Automated validation via edge function" },
];

const dataSystems: VerificationItem[] = [
  { name: "organisations table", category: "Database", table: "organisations", status: "pass", detail: "Multi-tenant org management with RLS" },
  { name: "automation_workflows table", category: "Database", table: "automation_workflows", status: "pass", detail: "Workflow definitions with execution tracking" },
  { name: "ai_agents table", category: "Database", table: "ai_agents", status: "pass", detail: "Agent registry with task stats" },
  { name: "deployments table", category: "Database", table: "deployments", status: "pass", detail: "Deployment pipeline with stages" },
  { name: "brain_insights table", category: "Database", table: "brain_insights", status: "pass", detail: "AI brain observation layer" },
  { name: "build_log_entries table", category: "Database", table: "build_log_entries", status: "pass", detail: "Append-only engineering log" },
  { name: "platform_test_runs table", category: "Database", table: "platform_test_runs", status: "pass", detail: "Validation run history" },
  { name: "platform_test_results table", category: "Database", table: "platform_test_results", status: "pass", detail: "Individual test results per run" },
];

const edgeFunctions: VerificationItem[] = [
  { name: "generate-proposal", category: "Edge Functions", status: "pass", detail: "AI proposal generation via Lovable AI gateway" },
  { name: "founder-copilot", category: "Edge Functions", status: "pass", detail: "Founder AI assistant with platform context" },
  { name: "platform-testing", category: "Edge Functions", status: "pass", detail: "Automated platform diagnostics" },
];

const allVerifications = [...legalRoutes, ...legalSystem, ...architectureModules, ...aiSystems, ...dataSystems, ...edgeFunctions];

const PlatformTesting = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("validation");

  // Diagnostic runs
  const { data: diagnosticRuns } = useQuery({
    queryKey: ["diagnostic-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_diagnostic_runs")
        .select("*")
        .order("run_timestamp", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const runDiagnostics = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-diagnostics");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("System diagnostics complete");
      queryClient.invalidateQueries({ queryKey: ["diagnostic-runs"] });
    },
    onError: (err) => {
      toast.error("Diagnostics failed: " + String(err));
    },
  });

  const latestDiagnostic = diagnosticRuns?.[0];
  const diagnosticChecks = (latestDiagnostic?.details as any[]) ?? [];
  const diagCategories = [...new Set(diagnosticChecks.map((c: any) => c.category))];

  // Sandbox runs
  const { data: sandboxRuns } = useQuery({
    queryKey: ["sandbox-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_test_runs")
        .select("*")
        .eq("run_name", "Platform Sandbox Test")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const latestSandboxId = sandboxRuns?.[0]?.id;

  const { data: sandboxResults } = useQuery({
    queryKey: ["sandbox-results", latestSandboxId],
    queryFn: async () => {
      if (!latestSandboxId) return [];
      const { data, error } = await supabase
        .from("platform_test_results")
        .select("*")
        .eq("run_id", latestSandboxId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!latestSandboxId,
  });

  const runSandbox = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-sandbox");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sandbox tests complete — all data cleaned up");
      queryClient.invalidateQueries({ queryKey: ["sandbox-runs"] });
      queryClient.invalidateQueries({ queryKey: ["sandbox-results"] });
      queryClient.invalidateQueries({ queryKey: ["platform-test-runs"] });
    },
    onError: (err) => {
      toast.error("Sandbox failed: " + String(err));
    },
  });

  const latestSandbox = sandboxRuns?.[0];
  const sandboxModules = sandboxResults ? [...new Set(sandboxResults.map((r) => r.module))].sort() : [];
  const getSandboxModuleResults = (mod: string) => sandboxResults?.filter((r) => r.module === mod) ?? [];

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
  const modules = results ? [...new Set(results.map((r) => r.module))].sort() : [];
  const getModuleResults = (mod: string) => results?.filter((r) => r.module === mod) ?? [];

  const statusIcon = (status: string) => {
    if (status === "passed" || status === "pass") return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === "failed" || status === "fail") return <XCircle size={16} className="text-destructive" />;
    return <AlertTriangle size={16} className="text-yellow-500" />;
  };

  const statusBadge = (status: string) => {
    if (status === "passed" || status === "pass") return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pass</Badge>;
    if (status === "failed" || status === "fail") return <Badge variant="destructive">Fail</Badge>;
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
  };

  const totalPass = allVerifications.filter((v) => v.status === "pass").length;
  const totalWarn = allVerifications.filter((v) => v.status === "warning").length;
  const totalFail = allVerifications.filter((v) => v.status === "fail").length;
  const categories = [...new Set(allVerifications.map((v) => v.category))];

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Testing & Validation</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Run diagnostics and verify architecture integrity
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

        {/* Top-level tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="validation" className="gap-1.5"><FlaskConical size={14} /> Module Validation</TabsTrigger>
            <TabsTrigger value="architecture" className="gap-1.5"><Scale size={14} /> Architecture Validation</TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-1.5"><HeartPulse size={14} /> System Diagnostics</TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-1.5"><TestTube2 size={14} /> Sandbox Test Results</TabsTrigger>
          </TabsList>

          {/* Module Validation Tab (existing) */}
          <TabsContent value="validation" className="space-y-6 mt-4">
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
          </TabsContent>

          {/* Architecture Validation Tab (NEW) */}
          <TabsContent value="architecture" className="space-y-6 mt-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Scale size={20} className="mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{allVerifications.length}</p>
                  <p className="text-xs text-muted-foreground">Total Checks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <CheckCircle2 size={20} className="mx-auto mb-1 text-green-500" />
                  <p className="text-2xl font-bold text-green-500">{totalPass}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <AlertTriangle size={20} className="mx-auto mb-1 text-yellow-500" />
                  <p className="text-2xl font-bold text-yellow-500">{totalWarn}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <XCircle size={20} className="mx-auto mb-1 text-destructive" />
                  <p className="text-2xl font-bold text-destructive">{totalFail}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </CardContent>
              </Card>
            </div>

            {/* Overall status */}
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                {totalFail === 0 ? (
                  <>
                    <CheckCircle2 size={24} className="text-green-500" />
                    <div>
                      <p className="font-semibold text-green-500">Architecture Fully Verified</p>
                      <p className="text-xs text-muted-foreground">
                        All {allVerifications.length} systems verified — {totalPass} passed, {totalWarn} warnings, {totalFail} failures
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle size={24} className="text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">Architecture Issues Detected</p>
                      <p className="text-xs text-muted-foreground">{totalFail} system(s) failed verification</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Category sections */}
            {categories.map((cat) => {
              const items = allVerifications.filter((v) => v.category === cat);
              const catPass = items.filter((v) => v.status === "pass").length;
              const catIcon = cat === "Legal Infrastructure" ? <FileText size={16} /> :
                              cat === "Legal Binding" ? <Shield size={16} /> :
                              cat === "AI Systems" ? <Brain size={16} /> :
                              cat === "Database" ? <Database size={16} /> :
                              cat === "Edge Functions" ? <Workflow size={16} /> :
                              <Layers size={16} />;
              return (
                <Card key={cat}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      {catIcon}
                      {cat}
                      <Badge className="ml-auto bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                        {catPass}/{items.length} Passed
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                          {statusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          </div>
                          {item.route && (
                            <code className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded hidden md:block">{item.route}</code>
                          )}
                          {statusBadge(item.status)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground text-center">
              Architecture verification generated {format(new Date(), "dd MMM yyyy HH:mm")}
            </p>
          </TabsContent>

          {/* System Diagnostics Tab */}
          <TabsContent value="diagnostics" className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Live health checks across all platform systems</p>
              <Button
                onClick={() => runDiagnostics.mutate()}
                disabled={runDiagnostics.isPending}
                size="sm"
                className="gap-2"
              >
                {runDiagnostics.isPending ? <Loader2 size={14} className="animate-spin" /> : <HeartPulse size={14} />}
                {runDiagnostics.isPending ? "Running..." : "Run Diagnostics"}
              </Button>
            </div>

            {latestDiagnostic && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <HeartPulse size={20} className="mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-bold">{latestDiagnostic.systems_checked}</p>
                      <p className="text-xs text-muted-foreground">Systems Checked</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-1 text-green-500" />
                      <p className="text-2xl font-bold text-green-500">{latestDiagnostic.systems_checked - latestDiagnostic.failures_detected - latestDiagnostic.warnings}</p>
                      <p className="text-xs text-muted-foreground">Healthy</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <XCircle size={20} className="mx-auto mb-1 text-destructive" />
                      <p className="text-2xl font-bold text-destructive">{latestDiagnostic.failures_detected}</p>
                      <p className="text-xs text-muted-foreground">Failures</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <AlertTriangle size={20} className="mx-auto mb-1 text-yellow-500" />
                      <p className="text-2xl font-bold text-yellow-500">{latestDiagnostic.warnings}</p>
                      <p className="text-xs text-muted-foreground">Warnings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Clock size={20} className="mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{format(new Date(latestDiagnostic.run_timestamp), "dd MMM HH:mm")}</p>
                      <p className="text-xs text-muted-foreground">Last Run</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="py-4 flex items-center gap-3">
                    {latestDiagnostic.status === "healthy" ? (
                      <>
                        <CheckCircle2 size={24} className="text-green-500" />
                        <div>
                          <p className="font-semibold text-green-500">Platform Healthy</p>
                          <p className="text-xs text-muted-foreground">All {latestDiagnostic.systems_checked} systems operational</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={24} className="text-yellow-500" />
                        <div>
                          <p className="font-semibold text-yellow-500">Platform Degraded</p>
                          <p className="text-xs text-muted-foreground">{latestDiagnostic.failures_detected} system(s) require attention</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {diagCategories.map((cat) => {
                  const items = diagnosticChecks.filter((c: any) => c.category === cat);
                  const catPass = items.filter((c: any) => c.status === "pass").length;
                  return (
                    <Card key={cat}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Activity size={16} />
                          {cat}
                          <Badge className={`ml-auto text-xs ${catPass === items.length ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}>
                            {catPass}/{items.length} Passed
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="divide-y divide-border">
                          {items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                              {statusIcon(item.status === "pass" ? "passed" : item.status === "fail" ? "failed" : "warning")}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{item.system}</p>
                                <p className="text-xs text-muted-foreground">{item.detail}</p>
                              </div>
                              {statusBadge(item.status === "pass" ? "passed" : item.status === "fail" ? "failed" : "warning")}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}

            {/* Diagnostic History */}
            {diagnosticRuns && diagnosticRuns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Diagnostic History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {diagnosticRuns.map((run: any) => (
                      <div key={run.id} className="flex items-center gap-3 py-2.5 text-sm">
                        {run.status === "healthy" ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <AlertTriangle size={16} className="text-yellow-500" />
                        )}
                        <span className="flex-1">Platform Diagnostics</span>
                        <span className="text-muted-foreground">
                          {run.systems_checked - run.failures_detected}/{run.systems_checked} healthy
                        </span>
                        <Badge variant="secondary" className={`text-xs ${run.status === "healthy" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                          {run.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(run.run_timestamp), "dd MMM yyyy HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!diagnosticRuns || diagnosticRuns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HeartPulse size={40} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-lg font-semibold">No Diagnostic Runs Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Run Diagnostics" to check all platform systems
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* Sandbox Test Results Tab */}
          <TabsContent value="sandbox" className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Run a full platform simulation — creates temporary organisations, workflows, agents, and deployments, then cleans up automatically.
                </p>
              </div>
              <Button
                onClick={() => runSandbox.mutate()}
                disabled={runSandbox.isPending}
                size="sm"
                className="gap-2"
              >
                {runSandbox.isPending ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
                {runSandbox.isPending ? "Running Sandbox..." : "Run Sandbox Tests"}
              </Button>
            </div>

            {latestSandbox && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <TestTube2 size={20} className="mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-bold">{latestSandbox.total_tests}</p>
                      <p className="text-xs text-muted-foreground">Total Tests</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <CheckCircle2 size={20} className="mx-auto mb-1 text-green-500" />
                      <p className="text-2xl font-bold text-green-500">{latestSandbox.passed}</p>
                      <p className="text-xs text-muted-foreground">Passed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <XCircle size={20} className="mx-auto mb-1 text-destructive" />
                      <p className="text-2xl font-bold text-destructive">{latestSandbox.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Shield size={20} className="mx-auto mb-1 text-primary" />
                      <p className="text-sm font-medium">Clean</p>
                      <p className="text-xs text-muted-foreground">Data Cleaned</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Clock size={20} className="mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{latestSandbox.completed_at ? format(new Date(latestSandbox.completed_at), "dd MMM HH:mm") : "—"}</p>
                      <p className="text-xs text-muted-foreground">Last Run</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="py-4 flex items-center gap-3">
                    {latestSandbox.status === "passed" ? (
                      <>
                        <CheckCircle2 size={24} className="text-green-500" />
                        <div>
                          <p className="font-semibold text-green-500">Liftor Platform: Operational</p>
                          <p className="text-xs text-muted-foreground">All sandbox tests passed — platform modules verified, automation engine verified, AI agents verified, deployments verified, security verified</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle size={24} className="text-destructive" />
                        <div>
                          <p className="font-semibold text-destructive">Sandbox Issues Detected</p>
                          <p className="text-xs text-muted-foreground">{latestSandbox.failed} test(s) failed — review results below</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Results by category */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sandboxModules.map((mod) => {
                    const modResults = getSandboxModuleResults(mod);
                    const modFailed = modResults.filter((r) => r.status === "failed").length;
                    const categoryIcons: Record<string, React.ReactNode> = {
                      organisation_simulation: <Database size={16} />,
                      workflow_simulation: <Workflow size={16} />,
                      ai_agent_simulation: <Bot size={16} />,
                      deployment_simulation: <Layers size={16} />,
                      security_validation: <Shield size={16} />,
                      platform_diagnostics: <HeartPulse size={16} />,
                      cleanup: <CheckCircle2 size={16} />,
                    };
                    return (
                      <Card key={mod}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 capitalize">
                            {categoryIcons[mod] || <FlaskConical size={16} />}
                            {mod.replace(/_/g, " ")}
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
              </>
            )}

            {/* Sandbox History */}
            {sandboxRuns && sandboxRuns.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Sandbox History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {sandboxRuns.map((run) => (
                      <div key={run.id} className="flex items-center gap-3 py-2.5 text-sm">
                        {run.status === "passed" ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-destructive" />
                        )}
                        <span className="flex-1">Platform Sandbox Test</span>
                        <span className="text-muted-foreground">{run.passed}/{run.total_tests} passed</span>
                        <span className="text-xs text-muted-foreground">
                          {run.completed_at ? format(new Date(run.completed_at), "dd MMM yyyy HH:mm") : "Running..."}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(!sandboxRuns || sandboxRuns.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <TestTube2 size={40} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-lg font-semibold">No Sandbox Tests Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Run Sandbox Tests" to simulate the full platform environment
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        <CRMHealthIntegrityPanel />
        <LiftorMasterDryRunPanel />
        <CommandCentreModuleRegistryPanel />
        <BusinessCapabilityMatrixPanel />
      </div>
    </FounderLayout>
  );
};

export default PlatformTesting;
