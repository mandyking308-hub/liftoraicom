import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, UserCheck, ArrowRight } from "lucide-react";
import { computeOnboardingSnapshot, type OnboardingSnapshot } from "@/lib/customerOnboarding";

export default function CustomerOnboardingCard() {
  const [snap, setSnap] = useState<OnboardingSnapshot | null>(null);
  useEffect(() => { computeOnboardingSnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck size={16} className="text-primary" />
          Customer Onboarding Engine
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live planning</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Sends approval-gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Calculating…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="In progress" value={snap.in_progress} />
              <Stat label="Waiting" value={snap.waiting_customer} tone={snap.waiting_customer > 0 ? "warn" : "good"} />
              <Stat label="Blocked" value={snap.blocked} tone={snap.blocked > 0 ? "bad" : "good"} />
              <Stat label="Complete" value={snap.complete} tone="good" />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/customer-onboarding" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Customer Onboarding <ArrowRight size={12} />
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