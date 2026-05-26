import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadDiversity, DIVERSITY_MODULES, type DiversityCounts } from "@/lib/portfolioDiversityEngine";

export default function PortfolioDiversityOverview() {
  const [c, setC] = useState<DiversityCounts | null>(null);
  useEffect(() => { loadDiversity().then(setC).catch(() => setC(null)); }, []);
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Portfolio Diversity Control Layer</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid size={20} className="text-primary" />
            Portfolio Diversity Control Layer
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> External actions gated
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Cross-portfolio diagnostics aggregated from all 19 diversity engines —
            archetype, template, entity, launch, integration, compliance, context,
            prioritisation, allocation, risk, lifecycle, product, pricing, channel,
            attribution, partner, IP, insurance and exit metrics.
          </p>
        </div>

        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Diversity signals</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {DIVERSITY_MODULES.map(m => (
                <Link key={m.key} to={m.to}
                  className="border border-border/50 rounded p-3 hover:border-primary/40 hover:bg-primary/5 transition">
                  <p className="text-[10px] uppercase text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold">{c ? c[m.key] : "—"}</p>
                  <p className="text-[10px] text-primary/80 mt-1">Open →</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Test evidence</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground">
            <p>
              LIVE_INTERNAL_TEST records seeded across all 19 modules for SaaS, Marketplace and
              Service archetypes. These rows carry the LIVE_INTERNAL_TEST tag and are excluded
              from confirmed KPIs and revenue reports.
            </p>
            <p>Current test rows visible to diagnostics: <span className="font-bold text-foreground">{c?.test_records_total ?? "—"}</span></p>
            <div className="flex gap-2 flex-wrap pt-1">
              <Link to="/founder/data-quality/test-data" className="text-primary hover:underline">Test-data board</Link>
              <Link to="/founder/command-centre" className="text-primary hover:underline">Back to Command Centre</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}