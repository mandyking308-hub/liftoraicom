import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const MaintenanceSchedule = () => {
  const { user } = useAuth();

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: subIds = [] } = useQuery({
    queryKey: ["sub-ids", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("id").eq("client_id", profileId!).eq("status", "active");
      return (data ?? []).map((s) => s.id);
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["all-maintenance", subIds],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_events")
        .select("*")
        .in("subscription_id", subIds)
        .order("scheduled_date", { ascending: false });
      return data ?? [];
    },
  });

  const statusColors: Record<string, string> = {
    scheduled: "bg-primary/20 text-primary",
    in_progress: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">All scheduled and completed maintenance activities</p>
        </div>

        {events.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No maintenance events.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((e: any) => (
              <Card key={e.id} className="bg-card border-border/50">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {format(new Date(e.scheduled_date), "MMM d, yyyy")}
                      {e.description ? ` · ${e.description}` : ""}
                    </p>
                  </div>
                  <Badge className={statusColors[e.status] || ""} variant="secondary">{e.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default MaintenanceSchedule;
