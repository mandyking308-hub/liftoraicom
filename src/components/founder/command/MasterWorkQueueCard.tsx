import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchWorkItems, summarize, OPEN_STATUSES, type QueueSummary } from "@/lib/masterWorkQueueEngine";

export default function MasterWorkQueueCard() {
  const [sum, setSum] = useState<QueueSummary | null>(null);
  useEffect(() => { fetchWorkItems({ status: OPEN_STATUSES }).then(rows => setSum(summarize(rows))).catch(() => setSum(null)); }, []);
  const tone = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Inbox size={14} className="text-primary" />
          Master Work Queue · Portfolio PMO
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> External gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">
          Single ranked queue across sales, delivery, support, finance, compliance,
          marketplace, portfolio and AI cost. Completing items here never triggers
          external action.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <Tile to="/founder/work-queue/today"      label="Open today"   value={sum?.open_today} />
          <Tile to="/founder/work-queue/today"      label="Urgent"       value={sum?.urgent} cls={tone(sum?.urgent ?? 0)} />
          <Tile to="/founder/work-queue/overdue"    label="Overdue"      value={sum?.overdue} cls={tone(sum?.overdue ?? 0)} />
          <Tile to="/founder/work-queue/approvals"  label="Approvals"    value={sum?.approvals_blocking} cls={tone(sum?.approvals_blocking ?? 0)} />
          <Tile to="/founder/work-queue/high-value" label="High-value"   value={sum?.high_value} />
          <Tile to="/founder/work-queue/blocked"    label="Blocked"      value={sum?.blocked} cls={tone(sum?.blocked ?? 0)} />
          <Tile to="/founder/work-queue"            label="Test rows"    value={sum?.test_records} />
        </div>
        {sum?.top_action && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top recommended action</p>
            <p className="text-sm font-medium">{sum.top_action.title}</p>
            {sum.top_action.recommended_action && <p className="text-[11px] text-primary/90">Next: {sum.top_action.recommended_action}</p>}
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/work-queue" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/work-queue/today" className="text-primary hover:underline">Today</Link>
          <Link to="/founder/work-queue/by-business" className="text-primary hover:underline">By business</Link>
          <Link to="/founder/work-queue/by-agent" className="text-primary hover:underline">By agent</Link>
          <Link to="/founder/work-queue/settings" className="text-primary hover:underline">Settings</Link>
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