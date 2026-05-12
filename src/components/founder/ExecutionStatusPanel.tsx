import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Send, Inbox as InboxIcon, FileSignature, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";

const tile = (label: string, value: ReactNode, sub: string | undefined, Icon: any) => (
  <div className="rounded-md border border-border/50 bg-card p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon size={12} className="text-primary" /> {label}
    </div>
    <div className="text-lg font-semibold mt-1 leading-tight">{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const fmtAgo = (iso?: string | null) =>
  iso ? `${formatDistanceToNow(new Date(iso))} ago` : "never";

const ExecutionStatusPanel = () => {
  const { data } = useQuery({
    queryKey: ["execution-status"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [mode, lastSent, lastInbound, drafts, dueSoon, nextDue] = await Promise.all([
        supabase.from("system_settings").select("value").eq("key", "system_mode").maybeSingle(),
        supabase
          .from("email_queue")
          .select("sent_at")
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("communications")
          .select("created_at")
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("email_queue")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "delayed", "throttled"])
          .lte("scheduled_at", new Date().toISOString()),
        supabase
          .from("email_queue")
          .select("scheduled_at")
          .in("status", ["pending", "delayed", "throttled"])
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const m = (mode.data?.value as string) ?? "live";
      return {
        mode: String(m).toLowerCase(),
        lastSentAt: (lastSent.data as any)?.sent_at as string | null,
        lastInboundAt: (lastInbound.data as any)?.created_at as string | null,
        pendingDrafts: drafts.count ?? 0,
        dueNow: dueSoon.count ?? 0,
        nextDue: (nextDue.data as any)?.scheduled_at as string | null,
      };
    },
  });

  const isLive = data?.mode !== "sandbox";

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity size={16} className="text-primary" /> Execution Status
        </CardTitle>
        <Badge variant={isLive ? "destructive" : "outline"} className="uppercase">
          {isLive ? "Controlled Live" : "Sandbox"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {tile("Send worker last run", fmtAgo(data?.lastSentAt), "every 2 min via cron", Send)}
          {tile("Inbound poll last reply", fmtAgo(data?.lastInboundAt), "every 2 min via cron", InboxIcon)}
          {tile("AI drafts awaiting approval", data?.pendingDrafts ?? 0, "human-in-the-loop", FileSignature)}
          {tile("Queue due now", data?.dueNow ?? 0, "eligible to send", Send)}
          {tile(
            "Next scheduled send",
            data?.nextDue ? fmtAgo(data.nextDue).replace(" ago", " from now") : "—",
            data?.nextDue ? new Date(data.nextDue).toLocaleString() : undefined,
            Clock
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {isLive
            ? "Controlled LIVE: workers process eligible queue rows respecting compliance, caps, suppression, reply-stop and provider limits. No artificial global cap is applied."
            : "SANDBOX mode: live execution is paused. Switch back to Controlled LIVE in System → Modes to resume real sends."}
        </p>
      </CardContent>
    </Card>
  );
};

export default ExecutionStatusPanel;