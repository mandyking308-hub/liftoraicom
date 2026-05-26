import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSops, fetchVersions, fetchReviews, fetchConflicts, fetchUsage, summarize, type SopSummary } from "@/lib/sopEngine";

export default function SopVersionControlCard() {
  const [sum, setSum] = useState<SopSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchSops(), fetchVersions(), fetchReviews(), fetchConflicts(), fetchUsage()])
      .then(([s,v,r,c,u]) => setSum(summarize(s,v,r,c,u)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpenCheck size={14} className="text-primary" />
          SOP / Playbook Version Control
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Publish gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Living SOPs for sales, support, onboarding, finance, privacy, incident, refund, marketplace and weekly review. Drafting and versioning is live; publishing approved SOPs requires founder approval.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/sops/library"     label="Approved SOPs"   value={sum?.approved} />
          <Tile to="/founder/sops/library"     label="Drafts"          value={sum?.draft} />
          <Tile to="/founder/sops/reviews"     label="Reviews pending" value={sum?.reviews_pending} cls={warn(sum?.reviews_pending ?? 0)} />
          <Tile to="/founder/sops/reviews"     label="Overdue reviews" value={sum?.reviews_overdue} cls={bad(sum?.reviews_overdue ?? 0)} />
          <Tile to="/founder/sops/conflicts"   label="Open conflicts"  value={sum?.conflicts_open} cls={bad(sum?.conflicts_open ?? 0)} />
          <Tile to="/founder/sops/agent-usage" label="Agents using"    value={sum?.agents_using} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/sops" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/sops/library" className="text-primary hover:underline">Library</Link>
          <Link to="/founder/sops/versions" className="text-primary hover:underline">Versions</Link>
          <Link to="/founder/sops/reviews" className="text-primary hover:underline">Reviews</Link>
          <Link to="/founder/sops/agent-usage" className="text-primary hover:underline">Agent usage</Link>
          <Link to="/founder/sops/conflicts" className="text-primary hover:underline">Conflicts</Link>
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