import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, TrendingDown, ShieldCheck, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function riskVariant(r: string) {
  if (r === "high" || r === "critical") return "destructive";
  if (r === "low") return "outline";
  return "secondary";
}

export default function LearningOptimisationEnginePanel() {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const { data: signals } = useQuery({
    queryKey: ["business_learning_signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_learning_signals")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recs, refetch: refetchRecs } = useQuery({
    queryKey: ["optimisation_recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimisation_recommendations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const positives = (signals ?? []).filter((s: any) => s.positive_signal).length;
  const negatives = (signals ?? []).filter((s: any) => s.negative_signal).length;
  const pending = (recs ?? []).filter((r: any) => r.status === "pending").length;

  async function runPreview(persist = false) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimisation-engine-preview", {
        body: { persist },
      });
      if (error) throw error;
      setPreview(data);
      if (persist) await refetchRecs();
    } catch (e) {
      setPreview({ error: String((e as any)?.message || e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain size={16} className="text-primary" />
          Learning &amp; Optimisation Engine
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> Auto-apply OFF
          </Badge>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => runPreview(false)}>
            <Play size={12} className="mr-1" /> Preview
          </Button>
          <Button size="sm" disabled={busy} onClick={() => runPreview(true)}>
            Generate &amp; save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Signals (50)" value={signals?.length ?? 0} />
          <Stat label="Positive" value={positives} icon={<TrendingUp size={12} className="text-emerald-400" />} />
          <Stat label="Negative" value={negatives} icon={<TrendingDown size={12} className="text-destructive" />} />
          <Stat label="Pending review" value={pending} />
        </div>

        <div>
          <div className="text-xs font-medium mb-2 text-muted-foreground">Recent learning signals</div>
          <div className="space-y-1 max-h-56 overflow-auto">
            {(signals ?? []).slice(0, 12).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-xs border border-border/40 rounded-md px-2 py-1">
                <div className="flex items-center gap-2 min-w-0">
                  {s.positive_signal ? (
                    <TrendingUp size={12} className="text-emerald-400 shrink-0" />
                  ) : s.negative_signal ? (
                    <TrendingDown size={12} className="text-destructive shrink-0" />
                  ) : null}
                  <span className="font-mono truncate">{s.signal_type}</span>
                  {s.agent_key && <Badge variant="outline" className="text-[9px]">{s.agent_key}</Badge>}
                </div>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(s.captured_at), { addSuffix: true })}
                </span>
              </div>
            ))}
            {(signals ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground italic">No signals captured yet.</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-2 text-muted-foreground">Recommendations (founder approval required)</div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {(recs ?? []).map((r: any) => (
              <div key={r.id} className="border border-border/40 rounded-md p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant={riskVariant(r.risk_level)} className="text-[10px]">{r.risk_level}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  </div>
                </div>
                {r.summary && <div className="text-xs text-muted-foreground">{r.summary}</div>}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{r.recommendation_type}</span>
                  {r.confidence != null && <span>confidence {Math.round(Number(r.confidence) * 100)}%</span>}
                </div>
              </div>
            ))}
            {(recs ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground italic">No recommendations yet — run preview.</div>
            )}
          </div>
        </div>

        {preview && (
          <div className="text-[11px] bg-muted/30 rounded-md p-2 max-h-48 overflow-auto font-mono">
            <pre>{JSON.stringify(preview, null, 2)}</pre>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground">
          Read-only analysis. No campaigns, providers, or compliance settings are mutated. Recommendations require founder approval before any change.
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="border border-border/40 rounded-md px-2 py-1">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}