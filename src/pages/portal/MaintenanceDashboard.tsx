import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle, Clock, Shield, Cpu, Workflow, Activity } from "lucide-react";

const statusIcon = (status: string) => {
  if (status === "operational") return <CheckCircle2 size={16} className="text-green-400" />;
  if (status === "degraded") return <AlertCircle size={16} className="text-yellow-400" />;
  return <AlertCircle size={16} className="text-destructive" />;
};

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    operational: "bg-green-500/20 text-green-400",
    degraded: "bg-yellow-500/20 text-yellow-400",
    down: "bg-destructive/20 text-destructive",
  };
  return colors[status] || "bg-muted text-muted-foreground";
};

const serviceIcons: Record<string, React.ReactNode> = {
  "Platform Status": <Shield size={18} className="text-primary" />,
  "AI Services": <Cpu size={18} className="text-primary" />,
  "Automation Workflows": <Workflow size={18} className="text-primary" />,
};

const MaintenanceDashboard = () => {
  const { user } = useAuth();

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, projects(name)")
        .eq("client_id", profileId!)
        .eq("status", "active");
      return data ?? [];
    },
  });

  const subIds = subscriptions.map((s: any) => s.id);

  const { data: systemStatuses = [] } = useQuery({
    queryKey: ["system-status", subIds],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("system_status").select("*").in("subscription_id", subIds);
      return data ?? [];
    },
  });

  const { data: upcomingMaintenance = [] } = useQuery({
    queryKey: ["upcoming-maintenance", subIds],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_events")
        .select("*")
        .in("subscription_id", subIds)
        .gte("scheduled_date", new Date().toISOString().split("T")[0])
        .order("scheduled_date")
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentUpdates = [] } = useQuery({
    queryKey: ["recent-updates", subIds],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("update_logs")
        .select("*")
        .in("subscription_id", subIds)
        .order("performed_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: supportRequests = [] } = useQuery({
    queryKey: ["maintenance-support", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("support_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (subscriptions.length === 0) {
    return (
      <PortalLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Maintenance & Support</h1>
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <Activity size={40} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active maintenance subscriptions.</p>
              <p className="text-sm text-muted-foreground mt-1">Subscriptions become available after project completion.</p>
            </CardContent>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  const currentSub = subscriptions[0] as any;

  return (
    <PortalLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Maintenance & Support</h1>
            <p className="text-muted-foreground text-sm mt-1">{currentSub.projects?.name}</p>
          </div>
          <Badge className="bg-green-500/20 text-green-400" variant="secondary">Active</Badge>
        </div>

        {/* Service Plan */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
                <p className="font-semibold mt-1">{currentSub.plan_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Coverage</p>
                <p className="font-semibold mt-1">{currentSub.coverage_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Support Level</p>
                <p className="font-semibold mt-1">{currentSub.support_level}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Renewal</p>
                <p className="font-semibold mt-1">
                  {currentSub.last_renewal_date ? format(new Date(currentSub.last_renewal_date), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-lg">System Status</CardTitle></CardHeader>
          <CardContent>
            {systemStatuses.length === 0 ? (
              <div className="space-y-3">
                {["Platform Status", "AI Services", "Automation Workflows"].map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      {serviceIcons[name] || <Shield size={18} className="text-primary" />}
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400" variant="secondary">Operational</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {systemStatuses.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      {serviceIcons[s.service_name] || <Shield size={18} className="text-primary" />}
                      <span className="text-sm font-medium">{s.service_name}</span>
                    </div>
                    <Badge className={statusBadge(s.status)} variant="secondary">{s.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Maintenance */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Upcoming Maintenance</CardTitle>
                <Link to="/portal/maintenance/schedule" className="text-xs text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingMaintenance.length === 0 ? (
                <p className="text-muted-foreground text-sm">No scheduled maintenance.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMaintenance.map((e: any) => (
                    <div key={e.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{e.title}</p>
                        <Badge variant="secondary" className="text-xs capitalize">{e.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(e.scheduled_date), "MMM d, yyyy")}
                        {e.description ? ` · ${e.description}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Updates */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Updates</CardTitle>
                <Link to="/portal/maintenance/updates" className="text-xs text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentUpdates.length === 0 ? (
                <p className="text-muted-foreground text-sm">No updates yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentUpdates.map((u: any) => (
                    <div key={u.id} className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-sm font-medium">{u.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(u.performed_at), "MMM d, yyyy")}
                        {u.affected_system ? ` · ${u.affected_system}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Support Requests */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Support Requests</CardTitle>
              <Link to="/portal/support" className="text-xs text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            {supportRequests.length === 0 ? (
              <p className="text-muted-foreground text-sm">No support requests.</p>
            ) : (
              <div className="space-y-3">
                {supportRequests.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")} · {r.priority}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default MaintenanceDashboard;
