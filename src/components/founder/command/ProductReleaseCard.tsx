import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Boxes, ArrowRight } from "lucide-react";
import { computeProductSnapshot, type ProductSnapshot } from "@/lib/productEngine";

export default function ProductReleaseCard() {
  const [snap, setSnap] = useState<ProductSnapshot | null>(null);
  useEffect(() => { computeProductSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Boxes size={16} className="text-primary" />
          Product / QA / Release
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live planning</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Deploys gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Bugs open" value={snap.bugs_open} tone={snap.bugs_open > 0 ? "warn" : "good"} />
              <Stat label="Critical" value={snap.bugs_critical_open} tone={snap.bugs_critical_open > 0 ? "bad" : "good"} />
              <Stat label="Releases pending" value={snap.releases_awaiting_approval} tone={snap.releases_awaiting_approval > 0 ? "warn" : "good"} />
              <Stat label="QA failing" value={snap.qa_failed} tone={snap.qa_failed > 0 ? "bad" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/product" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Product Console <ArrowRight size={12} />
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