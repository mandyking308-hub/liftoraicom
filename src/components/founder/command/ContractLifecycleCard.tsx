import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, FileSignature, ArrowRight } from "lucide-react";
import { computeContractsSnapshot, type ContractsSnapshot } from "@/lib/contractsEngine";

export default function ContractLifecycleCard() {
  const [snap, setSnap] = useState<ContractsSnapshot | null>(null);
  useEffect(() => { computeContractsSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSignature size={16} className="text-primary" />
          Contract Lifecycle
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live tracking</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Send/sign approval-gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Calculating…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Active" value={snap.active} />
              <Stat label="Approval" value={snap.awaiting_approval} tone={snap.awaiting_approval > 0 ? "warn" : "good"} />
              <Stat label="Renewals 30d" value={snap.renewals_30d} tone={snap.renewals_30d > 0 ? "warn" : "good"} />
              <Stat label="Overdue obl." value={snap.obligations_overdue} tone={snap.obligations_overdue > 0 ? "bad" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/contracts" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Contract Lifecycle <ArrowRight size={12} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded border border-border/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}