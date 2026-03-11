import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";

const FounderActivity = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setActivities(data);
        setLoading(false);
      });
  }, []);

  const eventIcon = (type: string) => {
    const map: Record<string, string> = {
      proposal_submitted: "📋",
      support_request: "🎫",
      project_update: "📝",
      message_sent: "💬",
    };
    return map[type] || "📌";
  };

  return (
    <FounderLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">All platform activity</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : activities.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card">
                <span className="text-lg mt-0.5">{eventIcon(a.event_type)}</span>
                <div className="flex-1">
                  <p className="text-sm">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{a.event_type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default FounderActivity;
