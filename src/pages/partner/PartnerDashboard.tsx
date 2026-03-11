import PartnerLayout from "@/components/partner/PartnerLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, FolderKanban, Clock, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const useProfileId = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });
};

const statusColors: Record<string, string> = {
  new_submission: "bg-primary/20 text-primary",
  under_review: "bg-yellow-500/20 text-yellow-400",
  proposal_sent: "bg-blue-500/20 text-blue-400",
  negotiation: "bg-purple-500/20 text-purple-400",
  project_confirmed: "bg-green-500/20 text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const PartnerDashboard = () => {
  const { data: profileId } = useProfileId();

  const { data: opportunities = [] } = useQuery({
    queryKey: ["partner-opportunities", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_opportunities")
        .select("*")
        .eq("partner_id", profileId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["partner-recent-messages", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const oppIds = opportunities.map((o) => o.id);
      if (!oppIds.length) return [];
      const { data } = await supabase
        .from("partner_messages")
        .select("*")
        .in("opportunity_id", oppIds)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const activeProjects = opportunities.filter((o) => o.project_id);
  const stats = [
    { label: "Opportunities", value: opportunities.length, icon: Lightbulb },
    { label: "Active Projects", value: activeProjects.length, icon: FolderKanban },
    { label: "Under Review", value: opportunities.filter((o) => o.status === "under_review").length, icon: Clock },
    { label: "Recent Messages", value: messages.length, icon: MessageSquare },
  ];

  return (
    <PartnerLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your partnership activity</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <s.icon size={20} className="text-primary" />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <p className="text-muted-foreground text-sm">No opportunities yet. <Link to="/partner/opportunities" className="text-primary hover:underline">Register one</Link>.</p>
            ) : (
              <div className="space-y-3">
                {opportunities.slice(0, 5).map((opp) => (
                  <Link
                    key={opp.id}
                    to={`/partner/opportunities/${opp.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{opp.company_name}</p>
                      <p className="text-xs text-muted-foreground">{opp.industry || "—"} · {format(new Date(opp.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <Badge className={statusColors[opp.status] || "bg-muted text-muted-foreground"} variant="secondary">
                      {opp.status.replace(/_/g, " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
};

export default PartnerDashboard;
