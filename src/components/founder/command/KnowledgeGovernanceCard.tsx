import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, BookOpen, ArrowRight } from "lucide-react";
import { computeKnowledgeSnapshot, type KnowledgeSnapshot } from "@/lib/knowledgeGovernanceEngine";

export default function KnowledgeGovernanceCard() {
  const [snap, setSnap] = useState<KnowledgeSnapshot | null>(null);
  useEffect(() => { computeKnowledgeSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen size={16} className="text-primary" />
          Knowledge Governance
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live verification</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Claims gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Score" value={snap.completeness_score} tone={snap.completeness_score >= 80 ? "good" : snap.completeness_score >= 50 ? "warn" : "bad"} />
              <Stat label="Conflicts" value={snap.conflicts_open + snap.conflicts_founder_review} tone={(snap.conflicts_open + snap.conflicts_founder_review) > 0 ? "warn" : "good"} />
              <Stat label="Stale" value={snap.stale_sources + snap.expired_sources} tone={(snap.stale_sources + snap.expired_sources) > 0 ? "warn" : "good"} />
              <Stat label="Untrusted" value={snap.untrusted_sources} tone={snap.untrusted_sources > 0 ? "bad" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/knowledge-governance" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Knowledge Console <ArrowRight size={12} />
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
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}