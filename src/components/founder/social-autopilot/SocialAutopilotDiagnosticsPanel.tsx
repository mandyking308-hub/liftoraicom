import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function SocialAutopilotDiagnosticsPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token ?? ""}` };
      const businessId = localStorage.getItem("liftor.activeBusinessId") || "";
      try {
        const p = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-provider-discovery`, { headers });
        setProviders((await p.json()).providers ?? []);
      } catch { /* */ }
      try {
        const h = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-autopilot-healthcheck${businessId ? `?business_id=${businessId}` : ""}`, { headers });
        setHealth(await h.json());
      } catch { /* */ }
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Social Autopilot Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Provider adapter capability matrix</p>
          <div className="space-y-1 text-xs">
            {providers.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded bg-secondary/40">
                <span className="font-medium">{p.display_name}</span>
                <div className="flex gap-1">
                  <Badge variant="secondary">{p.adapter_status}</Badge>
                  {p.can_publish_posts && <Badge variant="outline">publish</Badge>}
                  {p.can_send_dms && <Badge variant="outline">dm</Badge>}
                  {p.can_reply_to_comments && <Badge variant="outline">reply</Badge>}
                  {p.can_sync_analytics && <Badge variant="outline">analytics</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Queues & safety</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span>Publish jobs</span><span>{health?.publish_jobs_count ?? 0} ({health?.publish_jobs_blocked ?? 0} blocked)</span>
            <span>Reply jobs</span><span>{health?.reply_jobs_count ?? 0} ({health?.reply_jobs_pending_approval ?? 0} need approval)</span>
            <span>Inbox</span><span>{health?.inbox_messages_count ?? 0}</span>
            <span>Performance logs</span><span>{health?.performance_logs_count ?? 0}</span>
            <span>Test data</span><span>{health?.test_data_count ?? 0}</span>
            <span>External publish</span><span className="text-yellow-400">LOCKED</span>
            <span>DM send</span><span className="text-yellow-400">LOCKED</span>
            <span>Provider execution</span><span className="text-yellow-400">LOCKED</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}