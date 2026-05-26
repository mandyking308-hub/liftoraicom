import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSummaries, fetchPacks, fetchHistory, summarize, type PortfolioMemorySummary } from "@/lib/portfolioMemory";

export default function PortfolioMemoryCard() {
  const [sum, setSum] = useState<PortfolioMemorySummary | null>(null);
  useEffect(() => {
    Promise.all([fetchSummaries(), fetchPacks(), fetchHistory()])
      .then(([s,p,h]) => setSum(summarize(s,p,h)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BrainCircuit size={14} className="text-primary" />
          Portfolio Memory / Handover
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live summaries</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Sharing gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Five-minute briefs and handover packs for every business — operator, adviser, buyer, VA, technical, emergency. Internal capture live; external sharing approval-gated.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/portfolio-memory/businesses"      label="Briefs"            value={sum?.live_summaries} />
          <Tile to="/founder/portfolio-memory/businesses"      label="Stale"             value={sum?.stale_summaries} cls={warn(sum?.stale_summaries ?? 0)} />
          <Tile to="/founder/portfolio-memory/handover-packs"  label="Packs"             value={sum?.packs} />
          <Tile to="/founder/portfolio-memory/handover-packs"  label="In review"         value={sum?.packs_review} cls={warn(sum?.packs_review ?? 0)} />
          <Tile to="/founder/portfolio-memory/handover-packs"  label="Sensitive · gated" value={sum?.sensitive_unapproved} cls={bad(sum?.sensitive_unapproved ?? 0)} />
          <Tile to="/founder/portfolio-memory/history"         label="History events"    value={sum?.history_events} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/portfolio-memory" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/portfolio-memory/businesses" className="text-primary hover:underline">Businesses</Link>
          <Link to="/founder/portfolio-memory/handover-packs" className="text-primary hover:underline">Packs</Link>
          <Link to="/founder/portfolio-memory/operator-briefs" className="text-primary hover:underline">Operator</Link>
          <Link to="/founder/portfolio-memory/adviser-briefs" className="text-primary hover:underline">Adviser</Link>
          <Link to="/founder/portfolio-memory/buyer-briefs" className="text-primary hover:underline">Buyer</Link>
          <Link to="/founder/portfolio-memory/history" className="text-primary hover:underline">History</Link>
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