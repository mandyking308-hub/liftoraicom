import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Layers, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

type LostResp = {
  ok: boolean;
  score: number;
  lost_features: any[];
  hidden_pages: any[];
  duplicate_modules: any[];
  missing_gates: any[];
  missing_business_scope: any[];
  modules_without_panel: string[];
  modules_without_next_action: string[];
  stale_copy: string[];
  recommended_fixes: string[];
};

type MasterResp = any;

function classify(score: number) {
  if (score >= 90) return { label: "READY", tone: "good" as const };
  if (score >= 60) return { label: "PARTIAL", tone: "warn" as const };
  return { label: "NOT_READY", tone: "danger" as const };
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const c = classify(value);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-[180px]">
        <Progress value={value} className="h-1.5 flex-1" />
        <Badge variant={c.tone === "good" ? "default" : c.tone === "warn" ? "secondary" : "destructive"}>
          {value}% · {c.label}
        </Badge>
      </div>
    </div>
  );
}

export default function LiftorMasterReconciliationPanel() {
  const lost = useQuery<LostResp>({
    queryKey: ["liftor-lost-feature-detector"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("liftor-lost-feature-detector", { body: {} });
      if (error) throw error;
      return data as LostResp;
    },
    staleTime: 60_000,
  });

  const master = useQuery<MasterResp>({
    queryKey: ["command-centre-master-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("command-centre-master-status", { body: {} });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const acceptance = useQuery({
    queryKey: ["command-centre-acceptance-test"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("command-centre-acceptance-test", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const lostScore = lost.data?.score ?? 0;
  const acceptanceScore = acceptance.data?.score ?? acceptance.data?.readiness_score ?? 0;
  const ccVisibility = lost.data
    ? Math.max(0, 100 - Math.min(100, (lost.data.hidden_pages.length + lost.data.modules_without_next_action.length) * 5))
    : 0;
  const businessMatrix = lost.data
    ? Math.max(0, 100 - Math.min(100, lost.data.missing_business_scope.length * 8))
    : 0;
  const manualCoverage = lost.data
    ? Math.max(0, 100 - Math.min(100, lost.data.lost_features.length * 4))
    : 0;
  const competitorParity = Math.round(
    (lostScore + ccVisibility + businessMatrix + manualCoverage + acceptanceScore) / 5
  );

  const overall = classify(competitorParity);

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Liftor Master Reconciliation
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Manual coverage · Command Centre visibility · per-business matrix · competitor parity. Read-only audit.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> No send · No publish · No provider mutation
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall reconciliation</span>
            <Badge variant={overall.tone === "good" ? "default" : overall.tone === "warn" ? "secondary" : "destructive"}>
              {competitorParity}% · {overall.label}
            </Badge>
          </div>
          <ScoreRow label="Manual coverage" value={manualCoverage} />
          <ScoreRow label="Command Centre visibility" value={ccVisibility} />
          <ScoreRow label="Per-business matrix" value={businessMatrix} />
          <ScoreRow label="Lost-feature score" value={lostScore} />
          <ScoreRow label="CC acceptance" value={acceptanceScore} />
        </div>

        <div className="grid gap-2 md:grid-cols-3 text-xs">
          <Stat icon={AlertTriangle} label="Lost features" value={lost.data?.lost_features.length ?? 0} tone="warn" />
          <Stat icon={AlertTriangle} label="Hidden pages" value={lost.data?.hidden_pages.length ?? 0} tone="warn" />
          <Stat icon={AlertTriangle} label="Missing gates" value={lost.data?.missing_gates.length ?? 0} tone="danger" />
          <Stat icon={AlertTriangle} label="Duplicate modules" value={lost.data?.duplicate_modules.length ?? 0} tone="warn" />
          <Stat icon={AlertTriangle} label="Businesses missing setup" value={lost.data?.missing_business_scope.length ?? 0} tone="warn" />
          <Stat icon={CheckCircle2} label="Stale copy hits" value={lost.data?.stale_copy.length ?? 0} tone="default" />
        </div>

        {lost.data?.recommended_fixes?.length ? (
          <div className="rounded-md border border-border/60 p-3">
            <div className="text-sm font-medium mb-1.5 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Next fixes
            </div>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
              {lost.data.recommended_fixes.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No reconciliation gaps detected.</div>
        )}

        <div className="text-[11px] text-muted-foreground">
          Classification: Core Liftor · {overall.label} · Command Centre · {classify(ccVisibility).label} · Parity · {classify(competitorParity).label} · Multi-business · {classify(businessMatrix).label}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: number; tone?: "default" | "warn" | "danger" }) {
  const variant = tone === "danger" && value > 0 ? "destructive" : tone === "warn" && value > 0 ? "secondary" : "outline";
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5">
      <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3 w-3" /> {label}</span>
      <Badge variant={variant as any}>{value}</Badge>
    </div>
  );
}