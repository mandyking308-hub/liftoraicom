import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, FileCheck, ArrowRight } from "lucide-react";
import { computeAdviserPackSnapshot, fmtMoney, type AdviserPackSnapshot } from "@/lib/adviserPackEngine";

export default function AdviserHandoffPackCard() {
  const [snap, setSnap] = useState<AdviserPackSnapshot | null>(null);
  useEffect(() => { computeAdviserPackSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileCheck size={16} className="text-primary" />
          Adviser Handoff Pack
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live tracking</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Sends gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Compiling…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Packs" value={snap.packs_total} />
              <Stat label="Review needed" value={snap.packs_review_required} tone={snap.packs_review_required > 0 ? "warn" : "good"} />
              <Stat label="Items flagged" value={snap.items_review} tone={snap.items_review > 0 ? "warn" : "good"} />
              <Stat label="Questions open" value={snap.questions_open} tone={snap.questions_open > 0 ? "warn" : "good"} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Stat label="Confirmed rev 30d" value={fmtMoney(snap.confirmed_revenue_30d)} />
              <Stat label="AI spend 30d" value={fmtMoney(snap.ai_spend_30d, "USD")} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/adviser-pack" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Adviser Handoff <ArrowRight size={12} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded border border-border/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}