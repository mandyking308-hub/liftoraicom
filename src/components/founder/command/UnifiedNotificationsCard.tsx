import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchNotifications, fetchEscalations, summarize, OPEN_NOTIF_STATUSES, type NotifSummary } from "@/lib/notificationCentreEngine";

export default function UnifiedNotificationsCard() {
  const [sum, setSum] = useState<NotifSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchNotifications({ status: OPEN_NOTIF_STATUSES }), fetchEscalations()])
      .then(([n, e]) => setSum(summarize(n, e))).catch(() => setSum(null));
  }, []);
  const tone = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad = (n: number) => n > 0 ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell size={14} className="text-primary" />
          Unified Notifications & Escalations
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> External channels off
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">
          Single, ranked feed of every alert, approval, warning and escalation across Liftor.
          Internal UI only — email, SMS and push channels remain off until founder approval.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <Tile to="/founder/notifications/inbox"       label="New"            value={sum?.new_count} />
          <Tile to="/founder/notifications/urgent"      label="Critical"       value={sum?.critical} cls={bad(sum?.critical ?? 0)} />
          <Tile to="/founder/notifications/urgent"      label="High"           value={sum?.high} cls={tone(sum?.high ?? 0)} />
          <Tile to="/founder/notifications/urgent"      label="Overdue"        value={sum?.overdue} cls={bad(sum?.overdue ?? 0)} />
          <Tile to="/founder/notifications/escalations" label="Escalations"    value={sum?.open_escalations} cls={tone(sum?.open_escalations ?? 0)} />
          <Tile to="/founder/notifications/urgent"      label="Revenue-block"  value={sum?.revenue_blocking} />
          <Tile to="/founder/notifications/urgent"      label="Customer-risk"  value={sum?.customer_risk} />
        </div>
        {sum?.top_action && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top recommended action</p>
            <p className="text-sm font-medium">{sum.top_action.title}</p>
            {sum.top_action.message && <p className="text-[11px] text-primary/90">{sum.top_action.message}</p>}
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/notifications" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/notifications/inbox" className="text-primary hover:underline">Inbox</Link>
          <Link to="/founder/notifications/urgent" className="text-primary hover:underline">Urgent</Link>
          <Link to="/founder/notifications/escalations" className="text-primary hover:underline">Escalations</Link>
          <Link to="/founder/notifications/rules" className="text-primary hover:underline">Rules</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}