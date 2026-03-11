import PortalLayout from "@/components/portal/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

const MaintenanceUpdates = () => {
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

  const { data: logs = [] } = useQuery({
    queryKey: ["all-update-logs", subIds],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("update_logs")
        .select("*")
        .in("subscription_id", subIds)
        .order("performed_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Update History</h1>
          <p className="text-muted-foreground text-sm mt-1">Log of all updates performed on your systems</p>
        </div>

        {logs.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No updates recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <Card key={log.id} className="bg-card border-border/50">
                <CardContent className="p-5">
                  <p className="font-semibold">{log.title}</p>
                  {log.description && <p className="text-sm text-muted-foreground mt-1">{log.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{format(new Date(log.performed_at), "MMM d, yyyy h:mm a")}</span>
                    {log.affected_system && <span className="px-2 py-0.5 rounded bg-secondary">{log.affected_system}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default MaintenanceUpdates;
