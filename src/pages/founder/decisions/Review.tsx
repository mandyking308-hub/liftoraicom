import { useEffect, useState } from "react";
import { DecLayout, DecStat } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchReminders, fetchDecisions, type DecisionReviewReminder, type FounderDecision } from "@/lib/decisionRegister";

export default function DecisionsReview() {
  const [reminders, setReminders] = useState<DecisionReviewReminder[]>([]);
  const [decisions, setDecisions] = useState<FounderDecision[]>([]);
  useEffect(() => { fetchReminders().then(setReminders); fetchDecisions().then(setDecisions); }, []);
  const now = Date.now();
  const map = new Map(decisions.map(d => [d.id, d]));
  const overdue = reminders.filter(r => r.review_status === "pending" && new Date(r.review_due_at).getTime() < now);
  const upcoming = reminders.filter(r => r.review_status === "pending" && new Date(r.review_due_at).getTime() >= now);
  return (
    <DecLayout title="Review reminders" subtitle="Important decisions are reviewed later to confirm they still hold.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <DecStat label="Pending" value={reminders.filter(r => r.review_status === "pending").length} />
        <DecStat label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "bad" : "ok"} />
        <DecStat label="Upcoming" value={upcoming.length} />
        <DecStat label="Completed" value={reminders.filter(r => r.review_status === "completed").length} tone="ok" />
      </div>
      <Card className="tech-card">
        <CardContent className="p-3 space-y-2 text-xs">
          {reminders.length === 0 && <p className="text-muted-foreground">No review reminders scheduled.</p>}
          {reminders.map(r => {
            const d = map.get(r.decision_id);
            const isOverdue = r.review_status === "pending" && new Date(r.review_due_at).getTime() < now;
            return (
              <div key={r.id} className="border border-border/50 rounded p-2 flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className={`text-[10px] ${isOverdue ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-blue-500/15 text-blue-300 border-blue-500/30"}`}>
                  {isOverdue ? "Overdue" : r.review_status}
                </Badge>
                <span className="font-medium">{d?.decision_title ?? r.decision_id.slice(0,8)}</span>
                <span className="text-muted-foreground">— {r.review_reason ?? "scheduled"}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">Due {new Date(r.review_due_at).toLocaleString()}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </DecLayout>
  );
}