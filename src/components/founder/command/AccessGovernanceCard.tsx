import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, KeyRound, ArrowRight } from "lucide-react";
import { computeAccessGovSnapshot, type AccessGovSnapshot } from "@/lib/accessGovernanceEngine";

export default function AccessGovernanceCard() {
  const [snap, setSnap] = useState<AccessGovSnapshot | null>(null);
  useEffect(() => { computeAccessGovSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound size={16} className="text-primary" />
          Access / Secrets Governance
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live tracking</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> No raw secrets
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Calculating…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Systems" value={snap.systems_active} />
              <Stat label="Secrets missing" value={snap.secrets_missing} tone={snap.secrets_missing > 0 ? "warn" : "good"} />
              <Stat label="Rotation overdue" value={snap.rotation_due_now} tone={snap.rotation_due_now > 0 ? "bad" : "good"} />
              <Stat label="Expired access" value={snap.assignments_expired} tone={snap.assignments_expired > 0 ? "bad" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/access-governance" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Access Governance <ArrowRight size={12} />
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