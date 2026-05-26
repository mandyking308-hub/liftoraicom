import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { loadDiversity, DIVERSITY_MODULES, type DiversityCounts } from "@/lib/portfolioDiversityEngine";

export default function PortfolioDiversityHealthCard() {
  const [c, setC] = useState<DiversityCounts | null>(null);
  useEffect(() => { loadDiversity().then(setC).catch(() => setC(null)); }, []);
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid size={14} className="text-primary" />
          Portfolio Diversity Health
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> External gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">
          Cross-module diversity signals across all 19 portfolio engines. Internal classification,
          mapping and scoring run live; partner contact, publishing, spend and external changes
          remain approval-gated.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {DIVERSITY_MODULES.map(m => (
            <Link key={m.key} to={m.to}
              className="border border-border/50 rounded p-2 hover:border-primary/40 hover:bg-primary/5 transition">
              <p className="text-[10px] uppercase text-muted-foreground">{m.label}</p>
              <p className="text-sm font-bold">{c ? c[m.key] : "—"}</p>
            </Link>
          ))}
        </div>
        <div className="flex gap-2 pt-1 flex-wrap text-[11px]">
          <Link to="/founder/portfolio-diversity" className="text-primary hover:underline">Open diversity overview →</Link>
          {c && c.test_records_total > 0 && (
            <span className="text-yellow-300">{c.test_records_total} LIVE_INTERNAL_TEST rows (excluded from KPIs)</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}