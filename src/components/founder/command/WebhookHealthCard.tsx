import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchInbox, summarize, type InboxSummary } from "@/lib/webhookInbox";

export default function WebhookHealthCard() {
  const [sum, setSum] = useState<InboxSummary | null>(null);
  useEffect(() => { fetchInbox(500).then(e => setSum(summarize(e))).catch(() => setSum(null)); }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Inbox size={14} className="text-primary" />
          Webhook Inbox Health
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Receive live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> No external actions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Inbound webhooks from payments, voice, email, calendars, signatures and marketplaces. Verified, deduped and normalised before reaching the Event Bus.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/webhooks/inbox"             label="Received 24h"   value={sum?.received_today} />
          <Tile to="/founder/webhooks/normalised-events" label="Normalised 24h" value={sum?.normalised_today} />
          <Tile to="/founder/webhooks/failures"          label="Failed 24h"     value={sum?.failed_today} cls={bad(sum?.failed_today ?? 0)} />
          <Tile to="/founder/webhooks/failures"          label="Unverified 24h" value={sum?.unverified_today} cls={bad(sum?.unverified_today ?? 0)} />
          <Tile to="/founder/webhooks/inbox"             label="Duplicates 24h" value={sum?.duplicates_today} />
          <Tile to="/founder/webhooks/failures"          label="Parked"         value={sum?.parked_total} cls={warn(sum?.parked_total ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
            {sum.top_provider_failing && <p className="text-[11px] text-muted-foreground">Worst provider: {sum.top_provider_failing.provider} ({sum.top_provider_failing.count})</p>}
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/webhooks" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/webhooks/inbox" className="text-primary hover:underline">Inbox</Link>
          <Link to="/founder/webhooks/providers" className="text-primary hover:underline">Provider rules</Link>
          <Link to="/founder/webhooks/normalised-events" className="text-primary hover:underline">Normalised</Link>
          <Link to="/founder/webhooks/failures" className="text-primary hover:underline">Failures</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: any; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}