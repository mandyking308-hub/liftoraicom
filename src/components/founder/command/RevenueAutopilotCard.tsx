import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, ArrowRight, Lock } from "lucide-react";
import { computeRevenueLoop, type RevenueLoopSnapshot } from "@/lib/revenueAutopilot";

const priorityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-muted text-muted-foreground",
};

export default function RevenueAutopilotCard() {
  const [snap, setSnap] = useState<RevenueLoopSnapshot | null>(null);
  useEffect(() => { computeRevenueLoop().then(setSnap); }, []);

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gauge size={14} className="text-primary" />
          Revenue Autopilot Operating Loop
          <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> External actions approval-gated
          </Badge>
          <Link to="/founder/revenue-autopilot" className="ml-auto text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
            Open <ArrowRight size={11} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Calculating…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Cell label="Target gap" value={`$${Math.round(snap.gap).toLocaleString()}`} tone={snap.gap > 0 ? "warn" : "good"} />
              <Cell label="Required actions" value={snap.top_actions.length} />
              <Cell label="Hot leads" value={snap.hot_leads} />
              <Cell label="Upgrade opps" value={snap.upgrade_opportunities} />
              <Cell label="Close approvals" value={snap.approvals_blocking} tone={snap.approvals_blocking > 0 ? "bad" : "good"} />
              <Cell label="Overdue follow-ups" value={snap.overdue_follow_ups} tone={snap.overdue_follow_ups > 0 ? "warn" : "good"} />
              <Cell label="Proposals needed" value={snap.proposals_needed} />
              <Cell label="Calls to prepare" value={snap.calls_to_prepare} />
            </div>
            <div className="text-xs">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Revenue Manager Agent</p>
              <p>{snap.recommended_action}</p>
            </div>
            {snap.top_actions.length > 0 && (
              <ol className="space-y-1 text-xs">
                {snap.top_actions.map((a, i) => (
                  <li key={i} className="flex justify-between border-b border-border/40 pb-1">
                    <span>{i + 1}. {a.title} <span className="text-muted-foreground">— {a.agent}</span></span>
                    <Badge variant="outline" className={`text-[10px] ${priorityTone[a.priority] || ""}`}>{a.priority}</Badge>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Cell({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneCls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="p-2 rounded border border-border/50">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}