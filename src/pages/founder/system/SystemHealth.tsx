import { useQuery } from "@tanstack/react-query";
import LiftorMasterDryRunPanel from "@/components/founder/testing/LiftorMasterDryRunPanel";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import CommandCentreModuleRegistryPanel from "@/components/founder/command/CommandCentreModuleRegistryPanel";
import SelfHealingMonitoringPanel from "@/components/founder/monitoring/SelfHealingMonitoringPanel";
import CRMInteractionSourceAdaptersPanel from "@/components/founder/crm/CRMInteractionSourceAdaptersPanel";
import CRMHealthIntegrityPanel from "@/components/founder/crm/CRMHealthIntegrityPanel";
import AIAgentOperatingModelPanel from "@/components/founder/agents/AIAgentOperatingModelPanel";
import AIAgentOrchestratorPanel from "@/components/founder/agents/AIAgentOrchestratorPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

type HealthRow = {
  id: string;
  metric_name: string;
  value: number;
  timestamp: string;
};

const METRICS: { key: string; label: string; suffix: string }[] = [
  { key: "reply_rate", label: "Reply Rate", suffix: "%" },
  { key: "conversion_rate", label: "Conversion Rate", suffix: "%" },
  { key: "assignment_completion_rate", label: "Assignment Completion", suffix: "%" },
  { key: "payment_collection_rate", label: "Payment Collection", suffix: "%" },
  { key: "emails_sent_per_hour", label: "Emails / Hour", suffix: "" },
];

const SystemHealth = () => {
  const { data: rows = [] } = useQuery({
    queryKey: ["system_health_history"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("system_health" as never)
        .select("*")
        .gte("timestamp", since)
        .order("timestamp", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as HealthRow[];
    },
    refetchInterval: 60000,
  });

  const seriesFor = (metric: string) =>
    rows
      .filter((r) => r.metric_name === metric)
      .map((r) => ({
        time: format(new Date(r.timestamp), "MMM d HH:mm"),
        value: Number(r.value),
      }));

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health Trends</h1>
          <p className="text-muted-foreground mt-1">
            7-day metric history sampled every 15 minutes.
          </p>
        </div>
        <SelfHealingMonitoringPanel />
        <div>
        </div>

        <CRMInteractionSourceAdaptersPanel />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {METRICS.map((m) => {
            const data = seriesFor(m.key);
            const latest = data.length ? data[data.length - 1].value : 0;
            return (
              <Card key={m.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle>
                  <div className="text-3xl font-bold">{latest}{m.suffix}</div>
                </CardHeader>
                <CardContent>
                  {data.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet — first snapshot will appear within 15 minutes.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <CRMHealthIntegrityPanel />
        <AIAgentOperatingModelPanel />
        <AIAgentOrchestratorPanel />
        <LiftorMasterDryRunPanel />
        <CommandCentreModuleRegistryPanel />
      </div>
    </FounderLayout>
  );
};

export default SystemHealth;