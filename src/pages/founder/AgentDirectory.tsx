import FounderLayout from "@/components/founder/FounderLayout";
import CRMCustomerMemoryDashboard from "@/components/founder/crm/CRMCustomerMemoryDashboard";
import AIAgentOperatingModelPanel from "@/components/founder/agents/AIAgentOperatingModelPanel";
import AIAgentOrchestratorPanel from "@/components/founder/agents/AIAgentOrchestratorPanel";
import AIConversationDraftingPanel from "@/components/founder/agents/AIConversationDraftingPanel";
import FounderApprovalConsole from "@/components/founder/approvals/FounderApprovalConsole";
import ApprovedActionExecutionPanel from "@/components/founder/approvals/ApprovedActionExecutionPanel";
import AgentBusinessLivePanel from "@/components/founder/agents/AgentBusinessLivePanel";
import AIEngagementAgentLivePanel from "@/components/founder/agents/AIEngagementAgentLivePanel";
import LiveCommercialAgentsPanel from "@/components/founder/commercial/LiveCommercialAgentsPanel";
import LiftorBusinessLiveRunPanel from "@/components/founder/command/LiftorBusinessLiveRunPanel";
import MultiBusinessOperatingLayerPanel from "@/components/founder/operations/MultiBusinessOperatingLayerPanel";
import BusinessOperatingRunbookPanel from "@/components/founder/operations/BusinessOperatingRunbookPanel";
import GlobalAutonomyControlPanel from "@/components/founder/autonomy/GlobalAutonomyControlPanel";
import GlobalOperatingClockPanel from "@/components/founder/global/GlobalOperatingClockPanel";
import AgentHandoverProtocolPanel from "@/components/founder/agents/AgentHandoverProtocolPanel";
import AutopilotActivationGatesPanel from "@/components/founder/autonomy/AutopilotActivationGatesPanel";
import AgentCollaborationBoard from "@/components/founder/agents/AgentCollaborationBoard";
import CustomerJourneyControlBoard from "@/components/founder/command/CustomerJourneyControlBoard";
import MultilingualIntelligencePanel from "@/components/founder/global/MultilingualIntelligencePanel";
import BusinessKnowledgeBrainPanel from "@/components/founder/knowledge/BusinessKnowledgeBrainPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Bot, CheckCircle2, AlertCircle, XCircle, Clock, Search, Zap, AlertTriangle } from "lucide-react";
import { useState } from "react";

const statusIcon = (status: string) => {
  if (status === "active") return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === "idle") return <Clock size={14} className="text-muted-foreground" />;
  if (status === "paused") return <AlertCircle size={14} className="text-yellow-400" />;
  if (status === "maintenance") return <XCircle size={14} className="text-primary" />;
  return <CheckCircle2 size={14} className="text-green-400" />;
};

const statusBadge = (status: string) => {
  const m: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    idle: "bg-muted text-muted-foreground",
    paused: "bg-yellow-500/20 text-yellow-400",
    maintenance: "bg-primary/20 text-primary",
    processing: "bg-primary/20 text-primary",
    offline: "bg-destructive/20 text-destructive",
  };
  return m[status] || "bg-muted text-muted-foreground";
};

const AgentDirectory = () => {
  const [search, setSearch] = useState("");

  const { data: agents = [] } = useQuery({
    queryKey: ["all-ai-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("*, monitored_systems(system_name, projects(name))")
        .order("name");
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["all-agent-alerts-unresolved"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_alerts")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["recent-agent-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_activity_logs")
        .select("*, ai_agents(name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const filtered = agents.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.agent_function || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = agents.filter((a: any) => a.status === "active" || a.status === "processing").length;
  const totalTasks = agents.reduce((s: number, a: any) => s + (a.tasks_completed_total || 0), 0);
  const totalPending = agents.reduce((s: number, a: any) => s + (a.tasks_pending || 0), 0);

  const stats = [
    { label: "Total Agents", value: agents.length, icon: Bot },
    { label: "Active", value: activeCount, icon: Zap },
    { label: "Tasks Completed", value: totalTasks, icon: CheckCircle2 },
    { label: "Open Alerts", value: alerts.length, icon: AlertTriangle },
  ];

  return (
    <FounderLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Agent Management</h1>
          <p className="text-muted-foreground text-sm mt-1">AI agent control center</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <s.icon size={20} className="text-primary mb-3" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AgentBusinessLivePanel />
        <AIEngagementAgentLivePanel />
        <LiftorBusinessLiveRunPanel />
        <MultiBusinessOperatingLayerPanel />
        <BusinessOperatingRunbookPanel />
        <GlobalAutonomyControlPanel />
        <GlobalOperatingClockPanel />
        <MultilingualIntelligencePanel />
        <BusinessKnowledgeBrainPanel />

        {/* Agent Directory */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Agent Directory</CardTitle>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-secondary border-border h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm">No agents found.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((agent: any) => (
                  <Link key={agent.id} to={`/founder/agents/${agent.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(agent.status)}
                          <div>
                            <p className="font-semibold text-sm">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent.agent_function || "—"} · {(agent as any).monitored_systems?.system_name || "Unassigned"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{agent.tasks_completed_total || 0} tasks</span>
                          <Badge variant="secondary" className={statusBadge(agent.status)}>{agent.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity recorded.</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(log as any).ai_agents?.name || "—"}
                        {log.system_name ? ` · ${log.system_name}` : ""}
                        {" · "}{format(new Date(log.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Active Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 size={18} className="text-green-400" />
                  All agents operating normally.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="secondary" className={a.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"}>{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.affected_system || "—"} · {format(new Date(a.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <CRMCustomerMemoryDashboard />
        <AIAgentOperatingModelPanel />
        <AIAgentOrchestratorPanel />
        <AIConversationDraftingPanel />
        <FounderApprovalConsole />
        <ApprovedActionExecutionPanel />
        <LiveCommercialAgentsPanel />
        <AgentHandoverProtocolPanel />
        <AgentCollaborationBoard />
        <CustomerJourneyControlBoard />
        <AutopilotActivationGatesPanel />
      </div>
    </FounderLayout>
  );
};

export default AgentDirectory;
