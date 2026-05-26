import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight } from "lucide-react";
import { summariseImportCentre } from "@/lib/importCentre";

export default function ImportCentreCard() {
  const { data: s } = useQuery({ queryKey: ["import-centre-card"], queryFn: summariseImportCentre, refetchInterval: 60000 });
  const tone = (s?.awaitingApproval ?? 0) + (s?.failed ?? 0) + (s?.rollbackOpen ?? 0) > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload size={14} className="text-primary" /> Import / Migration Centre
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live preview</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Apply needs approval</Badge>
          <Link to="/founder/imports" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Batches" value={s?.totalBatches ?? 0} />
          <Stat label="Awaiting" value={s?.awaitingApproval ?? 0} tone={s?.awaitingApproval ? "warn" : undefined} />
          <Stat label="Failed" value={s?.failed ?? 0} tone={s?.failed ? "bad" : undefined} />
          <Stat label="Test" value={s?.testBatches ?? 0} />
          <Stat label="Applied" value={s?.appliedLive ?? 0} tone="ok" />
          <Stat label="Rollback" value={s?.rollbackOpen ?? 0} tone={s?.rollbackOpen ? "warn" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">
            {s.watchItems.map((w, i) => <div key={i}>• {w}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-400" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}