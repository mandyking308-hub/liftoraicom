import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AssetAIAnalysisPanel({ assetId, assetName }: { assetId: string; assetName: string }) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: briefing } = useQuery<any>({
    queryKey: ["io_asset_briefing", assetId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_ai_briefings")
        .select("*")
        .eq("kind", "asset")
        .eq("portfolio_asset_id", assetId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: recs = [] } = useQuery<any[]>({
    queryKey: ["io_asset_recs", assetId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ma_ai_recommendations")
        .select("*")
        .eq("portfolio_asset_id", assetId)
        .order("urgency_score", { ascending: false });
      return data ?? [];
    },
  });

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("ma-intelligence-orchestrator", {
        body: { mode: "asset_analysis", asset_id: assetId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("AI analysis complete");
      qc.invalidateQueries({ queryKey: ["io_asset_briefing", assetId] });
    } catch (e: any) {
      const msg = e?.message ?? "AI failed";
      if (msg.includes("rate")) toast.error("AI rate limit — try again shortly.");
      else if (msg.includes("credits") || msg.includes("Payment")) toast.error("AI credits exhausted. Add credits at Settings → Workspace → Usage.");
      else toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const b = (briefing?.body as any) ?? null;

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> AI Asset Analysis
            <Badge variant="outline" className="ml-2 gap-1 text-[10px]"><Lock className="h-3 w-3" /> Advisory only</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Reasons over this asset's buyers, signals, data room, valuation context and execution targets. No external action is taken.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={running} onClick={run}>
          <Sparkles className="h-3 w-3 mr-1" /> {running ? "Analysing…" : briefing ? "Re-run analysis" : "Run analysis"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!b ? (
          <p className="text-muted-foreground">No analysis yet for {assetName}. Click "Run analysis" to generate one.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Decision: {b.recommended_decision}</Badge>
              <Badge variant="outline">Confidence {b.confidence_score}%</Badge>
              <Badge variant="outline">Evidence: {b.evidence_strength}</Badge>
              <span className="text-muted-foreground">Generated {briefing.generated_at ? new Date(briefing.generated_at).toLocaleString() : "—"}</span>
            </div>
            {b.becoming && <Field label="What this is becoming" value={b.becoming} />}
            {b.likely_buyer_universe && <Field label="Likely buyer universe" value={b.likely_buyer_universe} />}
            {b.exit_readiness_position && <Field label="Exit readiness position" value={b.exit_readiness_position} />}
            {b.biggest_blocker_to_value && <Field label="Biggest blocker to value" value={b.biggest_blocker_to_value} />}
            {b.reasoning && <Field label="Reasoning" value={b.reasoning} />}
            {Array.isArray(b.next_targets) && b.next_targets.length > 0 && (
              <List label="Next targets" items={b.next_targets} />
            )}
            {Array.isArray(b.agents_actions_this_month) && b.agents_actions_this_month.length > 0 && (
              <List label="Agent actions this month" items={b.agents_actions_this_month} />
            )}
            {Array.isArray(b.missing_information) && b.missing_information.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-1 text-amber-400 text-xs font-medium mb-1">
                  <AlertTriangle className="h-3 w-3" /> Missing information
                </div>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {b.missing_information.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {recs.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Open recommendations for this asset</div>
            <div className="space-y-2">
              {recs.slice(0, 6).map((r) => (
                <div key={r.id} className="rounded border border-border/50 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.recommendation_type}</Badge>
                    <Badge variant="outline">risk {r.risk_level}</Badge>
                    <Badge variant="outline">{r.status}</Badge>
                    {r.required_human_approval && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> approval required</Badge>}
                    <span className="text-muted-foreground ml-auto">conf {r.confidence_score} · urg {r.urgency_score}</span>
                  </div>
                  <div className="font-medium">{r.summary}</div>
                  {r.reasoning && <div className="text-muted-foreground">{r.reasoning}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap mt-0.5">{value}</div>
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <ul className="list-disc list-inside space-y-0.5">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}