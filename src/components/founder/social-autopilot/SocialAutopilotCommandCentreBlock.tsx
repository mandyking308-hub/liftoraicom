import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SocialAutopilotCommandCentreBlock() {
  const [data, setData] = useState<any>(null);
  const businessId = typeof window !== "undefined" ? localStorage.getItem("liftor.activeBusinessId") || "" : "";

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-autopilot-healthcheck${businessId ? `?business_id=${businessId}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
        setData(await res.json());
      } catch { /* ignore */ }
    })();
  }, [businessId]);

  const stat = (label: string, value: any) => (
    <div className="p-2 rounded bg-secondary/40">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-semibold">{value ?? "—"}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone size={16} /> Social Autopilot
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            <Lock size={10} className="mr-1" /> Provider execution LOCKED
          </Badge>
          <Link to="/founder/social-autopilot"><Button size="sm" variant="outline">Open</Button></Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {stat("Mode", data?.automation_mode ?? "approval_required")}
          {stat("Accounts", `${data?.connected_accounts_count ?? 0}/${data?.accounts_count ?? 0}`)}
          {stat("Assets", data?.assets_count)}
          {stat("Drafts", data?.content_count)}
          {stat("Need approval", data?.pending_content_approvals)}
          {stat("Blocked jobs", data?.publish_jobs_blocked)}
          {stat("Inbox", data?.inbox_messages_count)}
          {stat("Reply drafts", data?.reply_jobs_pending_approval)}
          {stat("Perf logs", data?.performance_logs_count)}
          {stat("Test data", data?.test_data_count)}
          {stat("Ext publish", "OFF")}
          {stat("DM send", "OFF")}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Next: upload business knowledge + manuals so the Social Brain can generate per-business content.
        </p>
      </CardContent>
    </Card>
  );
}