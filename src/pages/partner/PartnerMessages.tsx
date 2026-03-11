import PartnerLayout from "@/components/partner/PartnerLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

const PartnerMessages = () => {
  const { user } = useAuth();

  const { data: profileId } = useQuery({
    queryKey: ["profile-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      return data?.id as string;
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["partner-opps-messages", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_opportunities")
        .select("id, company_name")
        .eq("partner_id", profileId!);
      return data ?? [];
    },
  });

  const { data: messagesByOpp = {} } = useQuery({
    queryKey: ["partner-message-counts", opportunities],
    enabled: opportunities.length > 0,
    queryFn: async () => {
      const result: Record<string, { count: number; latest: string }> = {};
      for (const opp of opportunities) {
        const { data, count } = await supabase
          .from("partner_messages")
          .select("created_at", { count: "exact" })
          .eq("opportunity_id", opp.id)
          .order("created_at", { ascending: false })
          .limit(1);
        result[opp.id] = {
          count: count ?? 0,
          latest: data?.[0]?.created_at ?? "",
        };
      }
      return result;
    },
  });

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">Communication threads by opportunity</p>
        </div>

        {opportunities.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No conversations yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => {
              const info = messagesByOpp[opp.id];
              return (
                <Link key={opp.id} to={`/partner/opportunities/${opp.id}`}>
                  <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MessageSquare size={20} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opp.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {info?.count ? `${info.count} messages` : "No messages"} 
                          {info?.latest ? ` · Last: ${format(new Date(info.latest), "MMM d")}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
};

export default PartnerMessages;
