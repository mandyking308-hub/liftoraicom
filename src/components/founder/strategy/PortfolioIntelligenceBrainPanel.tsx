import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Play, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function pri(p: string) {
  if (p === "high" || p === "critical") return "destructive";
  if (p === "low") return "outline";
  return "secondary";
}

export default function PortfolioIntelligenceBrainPanel() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<any>(null);

  const { data: scores, refetch: refetchScores } = useQuery({
    queryKey: ["portfolio_intelligence_scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_intelligence_scores")
        .select("*").order("overall_priority_score", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recs, refetch: refetchRecs } = useQuery({
    queryKey: ["portfolio_strategy_recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_strategy_recommendations")
        .select("*").order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function run(persist: boolean) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("portfolio-intelligence-run", { body: { persist } });
      if (error) throw error;
      setLast(data);
      if (persist) { await refetchScores(); await refetchRecs(); }
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusy(false); }
  }

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain size={16} className="text-primary" />
          Portfolio Intelligence Brain
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> Read-only analysis
          </Badge>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(false)}>
            <Play size={12} className="mr-1" /> Preview
          </Button>
          <Button size="sm" disabled={busy} onClick={() => run(true)}>Run &amp; save</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs font-medium mb-2 text-muted-foreground">Ranked businesses (priority score)</div>
          <div className="space-y-1 max-h-72 overflow-auto">
            {(scores ?? []).map((s: any) => (
              <div key={s.id} className="border border-border/40 rounded-md p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{s.metadata?.name || s.business_id}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">{s.recommended_status || "monitor"}</Badge>
                    <Badge variant="outline" className="text-[10px]">priority {Math.round(Number(s.overall_priority_score))}</Badge>
                  </div>
                </div>
                {s.recommended_action && <div className="text-xs text-muted-foreground">{s.recommended_action}</div>}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-1 text-[10px] text-muted-foreground">
                  <span>growth {Math.round(Number(s.growth_score))}</span>
                  <span>revenue {Math.round(Number(s.revenue_score))}</span>
                  <span>risk {Math.round(Number(s.risk_score))}</span>
                  <span>attention {Math.round(Number(s.attention_score))}</span>
                  <span>readiness {Math.round(Number(s.readiness_score))}</span>
                  <span>opportunity {Math.round(Number(s.opportunity_score))}</span>
                </div>
              </div>
            ))}
            {(scores ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground italic">No scores yet — run the brain.</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
            <TrendingUp size={12} /> Recommendations (founder approval required)
          </div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {(recs ?? []).map((r: any) => (
              <div key={r.id} className="border border-border/40 rounded-md p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{r.recommendation_title}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant={pri(r.priority_level)} className="text-[10px]">{r.priority_level}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.recommendation_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  </div>
                </div>
                {r.recommendation_summary && <div className="text-xs text-muted-foreground">{r.recommendation_summary}</div>}
                {r.confidence != null && (
                  <div className="text-[10px] text-muted-foreground">confidence {Math.round(Number(r.confidence) * 100)}%</div>
                )}
              </div>
            ))}
            {(recs ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground italic">No recommendations yet.</div>
            )}
          </div>
        </div>

        {last && (
          <div className="text-[11px] bg-muted/30 rounded-md p-2 max-h-40 overflow-auto font-mono">
            <pre>{JSON.stringify({ businesses_analysed: last.businesses_analysed, scores_saved: last.scores_saved, recommendations_saved: last.recommendations_saved, auto_apply: last.auto_apply }, null, 2)}</pre>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertTriangle size={10} /> Read-only analysis. No campaigns started, no providers called, no financial movement. All recommendations require founder approval.
        </div>
      </CardContent>
    </Card>
  );
}