import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import GlobalAutonomyControlPanel from "@/components/founder/autonomy/GlobalAutonomyControlPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Activity, ShieldAlert, Heart, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type SystemEvent = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  business_name: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  resolved: boolean;
  created_at: string;
};

type HealthScore = {
  health_score: number;
  reply_rate: number;
  conversion_rate: number;
  assignment_completion_rate: number;
  payment_collection_rate: number;
  emails_sent_per_hour: number;
  open_critical_events: number;
};

type RetryRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  retry_count: number;
  next_retry_at: string;
  status: "pending" | "completed" | "failed";
  last_error: string;
};

const severityBadge = (s: SystemEvent["severity"]) => {
  const cls = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    critical: "bg-destructive/15 text-destructive border-destructive/30",
  }[s];
  return <Badge variant="outline" className={cls}>{s}</Badge>;
};

const SystemDashboard = () => {
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["system_health_score"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_health_score" as never)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as HealthScore;
    },
    refetchInterval: 30000,
  });

  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ["system_events_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_events" as never)
        .select("*")
        .eq("resolved", false)
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as SystemEvent[];
    },
    refetchInterval: 30000,
  });

  const { data: retries = [] } = useQuery({
    queryKey: ["retry_queue_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retry_queue" as never)
        .select("*")
        .order("next_retry_at", { ascending: true })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as unknown as RetryRow[];
    },
    refetchInterval: 30000,
  });

  const { data: resolutionRate = 0 } = useQuery({
    queryKey: ["system_resolution_rate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_events" as never)
        .select("resolved")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (error) return 0;
      const all = (data ?? []) as { resolved: boolean }[];
      if (!all.length) return 100;
      const resolved = all.filter((e) => e.resolved).length;
      return Math.round((resolved / all.length) * 100);
    },
    refetchInterval: 60000,
  });

  const runDetection = async () => {
    const { error } = await supabase.rpc("detect_anomalies" as never);
    if (error) {
      toast.error("Detection failed: " + error.message);
    } else {
      toast.success("Anomaly scan complete");
      refetchEvents();
      refetchHealth();
    }
  };

  const score = health?.health_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-destructive";

  const criticalCount = events.filter((e) => e.severity === "critical").length;
  const highCount = events.filter((e) => e.severity === "high").length;

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Oversight</h1>
            <p className="text-muted-foreground mt-1">
              Failsafe monitoring across every Liftor module. No silent failures.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runDetection}>
              <RefreshCw className="w-4 h-4 mr-2" /> Run Detection
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/founder/system/events">All Events <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/founder/system/health">Health Trends <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Heart className="w-4 h-4" /> System Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
              <Progress value={score} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-2">Weighted across 5 metrics</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Critical Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-destructive">{criticalCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Require immediate action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground mt-2">{highCount} high severity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" /> 7d Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-emerald-400">{resolutionRate}%</div>
              <Progress value={resolutionRate} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Health metrics breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Health Metrics (latest snapshot)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Metric label="Reply Rate" value={`${health?.reply_rate ?? 0}%`} />
              <Metric label="Conversion Rate" value={`${health?.conversion_rate ?? 0}%`} />
              <Metric label="Assignment Completion" value={`${health?.assignment_completion_rate ?? 0}%`} />
              <Metric label="Payment Collection" value={`${health?.payment_collection_rate ?? 0}%`} />
              <Metric label="Emails / Hour" value={`${health?.emails_sent_per_hour ?? 0}`} />
            </div>
          </CardContent>
        </Card>

        {/* Active events */}
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active alerts. All systems nominal.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{severityBadge(e.severity)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{e.event_type}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{e.message}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.entity_type ?? "—"}</TableCell>
                      <TableCell className="text-xs">{e.business_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Retry queue */}
        <Card>
          <CardHeader>
            <CardTitle>Retry Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {retries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Retry queue is empty.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Retry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retries.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.action_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.entity_type}</TableCell>
                      <TableCell className="text-xs">{r.retry_count} / 3</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          r.status === "completed" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : r.status === "failed" ? "bg-destructive/15 text-destructive border-destructive/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.next_retry_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <GlobalAutonomyControlPanel />
      </div>
    </FounderLayout>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default SystemDashboard;