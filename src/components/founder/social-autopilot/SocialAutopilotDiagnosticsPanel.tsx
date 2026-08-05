import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function SocialAutopilotDiagnosticsPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [dist, setDist] = useState<any>(null);
  const [brain, setBrain] = useState<{ sources: number; extractions: number; logs: number; profile: any } | null>(null);

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
      if (businessId) {
        try {
          const d = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-distribution-health`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ business_id: businessId }),
          });
          setDist(await d.json());
        } catch { /* */ }
      }
      if (businessId) {
        const [{ count: sc }, { count: ec }, { count: lc }, { data: prof }] = await Promise.all([
          supabase.from("business_social_knowledge_sources").select("id", { count: "exact", head: true }).eq("business_id", businessId),
          supabase.from("business_social_brain_extractions").select("id", { count: "exact", head: true }).eq("business_id", businessId),
          supabase.from("business_social_profile_approval_log").select("id", { count: "exact", head: true }).eq("business_id", businessId),
          supabase.from("business_social_brain_profiles").select("*").eq("business_id", businessId).maybeSingle().then((r: any) => r),
        ]);
        setBrain({ sources: sc ?? 0, extractions: ec ?? 0, logs: lc ?? 0, profile: prof.data });
      }
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
        {brain && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Social Brain (current business)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span>Sources</span><span>{brain.sources}</span>
              <span>Extractions</span><span>{brain.extractions}</span>
              <span>Approval log entries</span><span>{brain.logs}</span>
              <span>Profile status</span><span>{brain.profile?.profile_status ?? "—"}</span>
              <span>Settings sync</span><span>{brain.profile?.profile_status === "applied_to_settings" ? "synced" : "not synced"}</span>
            </div>
            {brain.profile && (
              <details className="mt-2">
                <summary className="text-[10px] cursor-pointer">Raw profile JSON</summary>
                <pre className="text-[10px] p-2 bg-secondary/40 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(brain.profile, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}