import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchDecisions, fetchReminders, summarize, type DecisionSummary } from "@/lib/decisionRegister";

export default function DecisionRegisterCard() {
  const [sum, setSum] = useState<DecisionSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchDecisions(), fetchReminders()])
      .then(([d, r]) => setSum(summarize(d, r)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gavel size={14} className="text-primary" />
          Founder Decision Register
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live capture</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Irreversible gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">One register for every important decision across 25 businesses. Recommendations, options and risks captured live. Implementation of irreversible decisions requires founder approval.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/decisions/open"        label="Open"            value={sum?.open} cls={warn(sum?.open ?? 0)} />
          <Tile to="/founder/decisions/open"        label="Founder review"  value={sum?.founder_review} cls={warn(sum?.founder_review ?? 0)} />
          <Tile to="/founder/decisions/open"        label="High risk"       value={sum?.high_risk} cls={bad(sum?.high_risk ?? 0)} />
          <Tile to="/founder/decisions/open"        label="Irreversible"    value={sum?.irreversible_open} cls={bad(sum?.irreversible_open ?? 0)} />
          <Tile to="/founder/decisions/implemented" label="Implemented"     value={sum?.implemented} />
          <Tile to="/founder/decisions/review"      label="Reviews overdue" value={sum?.reminders_overdue} cls={bad(sum?.reminders_overdue ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/decisions" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/decisions/open" className="text-primary hover:underline">Open</Link>
          <Link to="/founder/decisions/made" className="text-primary hover:underline">Made</Link>
          <Link to="/founder/decisions/implemented" className="text-primary hover:underline">Implementation</Link>
          <Link to="/founder/decisions/review" className="text-primary hover:underline">Review</Link>
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