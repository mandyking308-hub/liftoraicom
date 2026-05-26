import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchBackups, fetchExports, fetchChecklists, fetchPacks, summarize, type BRSummary } from "@/lib/backupRecoveryEngine";

export default function BackupRecoveryCard() {
  const [sum, setSum] = useState<BRSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchBackups(), fetchExports(), fetchChecklists(), fetchPacks()])
      .then(([b,e,c,p]) => setSum(summarize(b,e,c,p)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Backup / Export / Recovery
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Exports gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Tracks backup status across business, customer, finance, document, AI and operational systems. Exports, restore operations and emergency pack generation require founder approval. No automatic restore.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/backup-recovery/status"         label="Healthy"          value={sum?.healthy} />
          <Tile to="/founder/backup-recovery/status"         label="Unknown"          value={sum?.unknown} cls={warn(sum?.unknown ?? 0)} />
          <Tile to="/founder/backup-recovery/status"         label="Failed"           value={sum?.failed} cls={bad(sum?.failed ?? 0)} />
          <Tile to="/founder/backup-recovery/status"         label="Critical at risk" value={sum?.critical_unknown_or_failed} cls={bad(sum?.critical_unknown_or_failed ?? 0)} />
          <Tile to="/founder/backup-recovery/exports"        label="Export approval"  value={sum?.exports_awaiting_approval} cls={warn(sum?.exports_awaiting_approval ?? 0)} />
          <Tile to="/founder/backup-recovery/emergency-pack" label="Emergency packs"  value={sum?.packs} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/backup-recovery" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/backup-recovery/status" className="text-primary hover:underline">Status</Link>
          <Link to="/founder/backup-recovery/exports" className="text-primary hover:underline">Exports</Link>
          <Link to="/founder/backup-recovery/restore" className="text-primary hover:underline">Restore</Link>
          <Link to="/founder/backup-recovery/emergency-pack" className="text-primary hover:underline">Emergency Pack</Link>
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