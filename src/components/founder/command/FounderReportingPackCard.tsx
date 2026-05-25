import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, FileText, ArrowRight } from "lucide-react";
import { computeReportingSnapshot, fmtMoney, type ReportingSnapshot } from "@/lib/founderReportingEngine";

export default function FounderReportingPackCard() {
  const [snap, setSnap] = useState<ReportingSnapshot | null>(null);
  useEffect(() => { computeReportingSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          Founder Reporting Pack
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live drafting</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Sharing gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Compiling…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Rev 7d" value={fmtMoney(snap.confirmed_revenue_7d)} />
              <Stat label="AI ROI 7d" value={`${snap.ai_roi_7d.toFixed(1)}×`} tone={snap.ai_roi_7d >= 3 ? "good" : snap.ai_roi_7d >= 1 ? "default" : "warn"} />
              <Stat label="Approvals" value={snap.approvals_pending} tone={snap.approvals_pending > 0 ? "warn" : "good"} />
              <Stat label="Critical inc." value={snap.incidents_critical} tone={snap.incidents_critical > 0 ? "bad" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/reports" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Reporting Pack <ArrowRight size={12} />
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