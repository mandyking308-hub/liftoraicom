import FounderLayout from "@/components/founder/FounderLayout";
import BusinessActivationWizardPanel from "@/components/founder/activation/BusinessActivationWizardPanel";
import BusinessRehearsalSimulationPanel from "@/components/founder/activation/BusinessRehearsalSimulationPanel";
import GroupHQOperatingPanel from "@/components/founder/group/GroupHQOperatingPanel";
import TreasuryCashflowControlPanel from "@/components/founder/finance/TreasuryCashflowControlPanel";
import StrategicProspectingAgentPanel from "@/components/founder/prospecting/StrategicProspectingAgentPanel";
import ProductRoadmapQAReleasePanel from "@/components/founder/product/ProductRoadmapQAReleasePanel";
import CostCreditsMarginControlPanel from "@/components/founder/finance/CostCreditsMarginControlPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import {
  Globe, Server, Bot, Workflow, AlertTriangle, CheckCircle2, XCircle, Clock,
  Activity, Play, Search, Shield,
} from "lucide-react";
import MultiBusinessOperatingLayerPanel from "@/components/founder/operations/MultiBusinessOperatingLayerPanel";
import BusinessKnowledgeBrainPanel from "@/components/founder/knowledge/BusinessKnowledgeBrainPanel";
import PortfolioCommandCentrePanel from "@/components/founder/command/PortfolioCommandCentrePanel";
import InternalOperatingSchedulesPanel from "@/components/founder/operations/InternalOperatingSchedulesPanel";
import ControlledExternalActionGatesPanel from "@/components/founder/operations/ControlledExternalActionGatesPanel";
import BusinessOperatingRunbookPanel from "@/components/founder/operations/BusinessOperatingRunbookPanel";
import GlobalAutonomyControlPanel from "@/components/founder/autonomy/GlobalAutonomyControlPanel";
import GlobalOperatingClockPanel from "@/components/founder/global/GlobalOperatingClockPanel";
import MultilingualIntelligencePanel from "@/components/founder/global/MultilingualIntelligencePanel";
import GlobalJurisdictionPolicyPanel from "@/components/founder/compliance/GlobalJurisdictionPolicyPanel";
import MultiChannelInboxPanel from "@/components/founder/channels/MultiChannelInboxPanel";
import AgentHandoverProtocolPanel from "@/components/founder/agents/AgentHandoverProtocolPanel";
import LearningOptimisationEnginePanel from "@/components/founder/optimisation/LearningOptimisationEnginePanel";
import SelfHealingMonitoringPanel from "@/components/founder/monitoring/SelfHealingMonitoringPanel";
import PortfolioIntelligenceBrainPanel from "@/components/founder/strategy/PortfolioIntelligenceBrainPanel";
import CommandCentreModuleRegistryPanel from "@/components/founder/command/CommandCentreModuleRegistryPanel";
import BusinessCapabilityMatrixPanel from "@/components/founder/operations/BusinessCapabilityMatrixPanel";
import SocialMediaBrainPanel from "@/components/founder/social/SocialMediaBrainPanel";
import SocialContentFactoryPanel from "@/components/founder/social/SocialContentFactoryPanel";
import SocialRepurposingEnginePanel from "@/components/founder/social/SocialRepurposingEnginePanel";
import SocialSchedulerExportPanel from "@/components/founder/social/SocialSchedulerExportPanel";
import AutopilotActivationGatesPanel from "@/components/founder/autonomy/AutopilotActivationGatesPanel";
import GlobalAIBrainCommandCentre from "@/components/founder/command/GlobalAIBrainCommandCentre";
import AgentCollaborationBoard from "@/components/founder/agents/AgentCollaborationBoard";
import SmartleadControlledActivationPanel from "@/components/founder/integrations/SmartleadControlledActivationPanel";
import BusinessLaunchFactoryPanel from "@/components/founder/expansion/BusinessLaunchFactoryPanel";

const statusIcon = (s: string) => {
  if (["operational", "active", "connected", "completed", "running", "success"].includes(s)) return <CheckCircle2 size={14} className="text-green-400" />;
  if (["warning", "degraded", "paused"].includes(s)) return <Clock size={14} className="text-yellow-400" />;
  if (["offline", "failed", "error", "disconnected"].includes(s)) return <XCircle size={14} className="text-destructive" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusClass = (s: string) => {
  if (["operational", "active", "connected", "running", "completed", "success"].includes(s)) return "bg-green-500/20 text-green-400";
  if (["warning", "degraded", "paused"].includes(s)) return "bg-yellow-500/20 text-yellow-400";
  if (["offline", "failed", "error"].includes(s)) return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
};

const GlobalOperations = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // All systems with client info
  const { data: systems = [] } = useQuery({
    queryKey: ["global-systems"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("*, projects(name), profiles(full_name, company_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const systemIds = systems.map((s: any) => s.id);

  // All agents
  const { data: agents = [] } = useQuery({
    queryKey: ["global-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("*, monitored_systems(system_name, profiles(company_name))");
      return data ?? [];
    },
  });

  // All workflows
  const { data: workflows = [] } = useQuery({
    queryKey: ["global-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("*, monitored_systems(system_name, profiles(company_name))");
      return data ?? [];
    },
  });

  // Recent executions
  const { data: executions = [] } = useQuery({
    queryKey: ["global-executions"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_executions").select("*, automation_workflows(name), monitored_systems(system_name, profiles(company_name))").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  // Global alerts (unresolved)
  const { data: systemAlerts = [] } = useQuery({
    queryKey: ["global-system-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("system_alerts").select("*, monitored_systems(system_name, profiles(company_name))").eq("resolved", false).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: agentAlerts = [] } = useQuery({
    queryKey: ["global-agent-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_alerts").select("*, ai_agents(name, monitored_systems(system_name))").eq("resolved", false).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: workflowAlerts = [] } = useQuery({
    queryKey: ["global-workflow-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("workflow_alerts").select("*, automation_workflows(name, monitored_systems(system_name))").eq("resolved", false).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  // Activity feed
  const { data: activityLog = [] } = useQuery({
    queryKey: ["global-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
  });

  // Stats
  const activeSystems = systems.filter((s: any) => s.status === "operational").length;
  const activeAgents = agents.filter((a: any) => a.status === "active" || a.status === "processing").length;
  const runningWorkflows = workflows.filter((w: any) => w.status === "active" || w.status === "running").length;
  const allAlerts = [...systemAlerts, ...agentAlerts, ...workflowAlerts];
  const criticalAlerts = allAlerts.filter((a: any) => a.severity === "critical").length;

  // Filter systems
  const filteredSystems = systems.filter((s: any) => {
    const matchSearch = !search ||
      s.system_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Health services
  const healthServices = [
    { name: "Automation Engine", status: workflows.some((w: any) => w.status === "error") ? "degraded" : "operational" },
    { name: "AI Agent Services", status: agents.some((a: any) => a.status === "error" || a.status === "offline") ? "degraded" : "operational" },
    { name: "System Monitoring", status: systems.some((s: any) => s.status === "offline") ? "degraded" : "operational" },
    { name: "Integration Layer", status: "operational" },
  ];

  return (
    <FounderLayout>
      <div className="space-y-6">
        <BusinessActivationWizardPanel />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe size={24} className="text-primary" /> Global AI Operations</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform-wide operational oversight across all client systems</p>
        </div>

        <GlobalAIBrainCommandCentre />

        <MultiBusinessOperatingLayerPanel />
        <BusinessOperatingRunbookPanel />
        <GlobalAutonomyControlPanel />
        <GlobalOperatingClockPanel />
        <MultilingualIntelligencePanel />
        <BusinessKnowledgeBrainPanel />
        <PortfolioCommandCentrePanel />
        <InternalOperatingSchedulesPanel />
        <BusinessLaunchFactoryPanel />

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Active Systems", value: activeSystems, total: systems.length, icon: Server },
            { label: "AI Agents", value: activeAgents, total: agents.length, icon: Bot },
            { label: "Workflows", value: runningWorkflows, total: workflows.length, icon: Workflow },
            { label: "Alerts", value: allAlerts.length, icon: AlertTriangle, highlight: allAlerts.length > 0 },
            { label: "Critical", value: criticalAlerts, icon: Shield, highlight: criticalAlerts > 0 },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <s.icon size={18} className="text-primary" />
                  {"total" in s && s.total !== undefined && <span className="text-xs text-muted-foreground">{s.value}/{s.total}</span>}
                </div>
                <p className={`text-2xl font-bold ${s.highlight ? "text-destructive" : ""}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Health */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield size={18} /> Global System Health</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {healthServices.map(h => (
                <div key={h.name} className="p-4 rounded-lg bg-secondary/50 flex items-center gap-3">
                  {statusIcon(h.status)}
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className={`text-xs capitalize ${h.status === "operational" ? "text-green-400" : "text-yellow-400"}`}>{h.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client System Directory */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2"><Server size={18} /> Client System Directory</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search systems..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-48" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="degraded">Degraded</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSystems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No systems found.</p>
            ) : (
              <div className="space-y-2">
                {filteredSystems.map((sys: any) => {
                  const sysAgents = agents.filter((a: any) => a.system_id === sys.id);
                  const sysWorkflows = workflows.filter((w: any) => w.system_id === sys.id);
                  return (
                    <Link key={sys.id} to={`/founder/monitoring/${sys.id}`}>
                      <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {statusIcon(sys.status)}
                            <div>
                              <p className="font-medium">{sys.system_name}</p>
                              <p className="text-xs text-muted-foreground">{sys.profiles?.company_name || sys.profiles?.full_name || "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs text-muted-foreground hidden sm:block">
                              <p>{sysAgents.length} agents · {sysWorkflows.length} workflows</p>
                            </div>
                            <Badge variant="secondary" className={statusClass(sys.status)}>{sys.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Global Automation Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Play size={18} /> Global Automation Activity</CardTitle></CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent automation activity.</p>
              ) : (
                <div className="space-y-2">
                  {executions.slice(0, 8).map((e: any) => (
                    <div key={e.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(e.status)}
                          <div>
                            <p className="text-sm font-medium">{e.automation_workflows?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{e.monitored_systems?.profiles?.company_name || "—"} · {e.monitored_systems?.system_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={`text-xs ${statusClass(e.status)}`}>{e.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.created_at), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Global AI Agent Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bot size={18} /> Global AI Agent Activity</CardTitle></CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No agents configured.</p>
              ) : (
                <div className="space-y-2">
                  {agents.slice(0, 8).map((a: any) => (
                    <Link key={a.id} to={`/founder/agents/${a.id}`}>
                      <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcon(a.status)}
                            <div>
                              <p className="text-sm font-medium">{a.name}</p>
                              <p className="text-xs text-muted-foreground">{a.monitored_systems?.profiles?.company_name || "—"} · {a.monitored_systems?.system_name}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={`text-xs ${statusClass(a.status)}`}>{a.status}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Global Alert Center */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle size={18} /> Global Alert Center</CardTitle></CardHeader>
            <CardContent>
              {allAlerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  All systems operating normally.
                </div>
              ) : (
                <div className="space-y-2">
                  {allAlerts.slice(0, 10).map((a: any) => {
                    const systemName = a.monitored_systems?.system_name || a.ai_agents?.monitored_systems?.system_name || a.automation_workflows?.monitored_systems?.system_name || "—";
                    const org = a.monitored_systems?.profiles?.company_name || "—";
                    return (
                      <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{org} · {systemName}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className={`text-xs ${a.severity === "critical" ? "bg-destructive/20 text-destructive" : a.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"}`}>{a.severity}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "MMM d, h:mm a")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Global Activity Feed */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity size={18} /> Global Activity Feed</CardTitle></CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent platform activity.</p>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((e: any) => (
                    <div key={e.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{e.description}</p>
                          <p className="text-xs text-muted-foreground">{e.event_type.replace(/_/g, " ")}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <ControlledExternalActionGatesPanel />
        <SmartleadControlledActivationPanel />
        <GlobalJurisdictionPolicyPanel />
        <MultiChannelInboxPanel />
        <AgentHandoverProtocolPanel />
        <LearningOptimisationEnginePanel />
        <SelfHealingMonitoringPanel />
        <PortfolioIntelligenceBrainPanel />
        <SocialMediaBrainPanel />
        <SocialContentFactoryPanel />
        <SocialRepurposingEnginePanel />
        <SocialSchedulerExportPanel />
        <AgentCollaborationBoard />
        <AutopilotActivationGatesPanel />
        <CommandCentreModuleRegistryPanel />
        <BusinessCapabilityMatrixPanel />
      </div>
    <div className="max-w-7xl mx-auto px-4 pb-6"><StrategicProspectingAgentPanel /></div>
    <div className="max-w-7xl mx-auto px-4 pb-6"><GroupHQOperatingPanel /></div>
    <div className="max-w-7xl mx-auto px-4 pb-6"><TreasuryCashflowControlPanel /></div>
   <div className="max-w-7xl mx-auto px-4 pb-6"><ProductRoadmapQAReleasePanel /></div>
   <div className="max-w-7xl mx-auto px-4 pb-6"><CostCreditsMarginControlPanel /></div>
    </FounderLayout>
  );
};

export default GlobalOperations;
