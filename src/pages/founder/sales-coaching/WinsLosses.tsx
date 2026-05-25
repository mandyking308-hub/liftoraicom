import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCLayout, SCSection, SCEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";

type WLR = { id: string; outcome: string; reason: string | null; recommended_change: string | null; objections: any; winning_factors: any; losing_factors: any; price_issue: boolean; trust_issue: boolean; timing_issue: boolean; product_fit_issue: boolean; competitor_issue: boolean; created_at: string };

const outcomeTone: Record<string, string> = {
  won: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  lost: "bg-red-500/15 text-red-400 border-red-500/30",
  delayed: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  no_decision: "bg-muted text-muted-foreground",
  escalated: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function SalesCoachingWinsLosses() {
  const [rows, setRows] = useState<WLR[]>([]);
  useEffect(() => {
    supabase.from("sales_win_loss_reviews").select("*").order("created_at", { ascending: false }).limit(200)
      .then(r => setRows((r.data as WLR[]) || []));
  }, []);

  return (
    <SCLayout title="Wins & Losses" subtitle="Every outcome reviewed, with winning factors, losing factors, issue tags, and recommended change.">
      {rows.length === 0 ? <SCEmpty title="No reviews recorded" hint="Reviews are created after each close attempt by the Customer Sales Engine." /> : (
        <div className="space-y-3">
          {rows.map(r => {
            const flags = [
              r.price_issue && "price",
              r.trust_issue && "trust",
              r.timing_issue && "timing",
              r.product_fit_issue && "fit",
              r.competitor_issue && "competitor",
            ].filter(Boolean) as string[];
            return (
              <SCSection key={r.id} title={r.reason || "(no reason)"} actions={<Badge variant="outline" className={`text-[10px] ${outcomeTone[r.outcome] || ""}`}>{r.outcome}</Badge>}>
                <div className="text-xs space-y-2">
                  {flags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">{flags.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}</div>
                  )}
                  {Array.isArray(r.winning_factors) && r.winning_factors.length > 0 && (
                    <p><span className="text-emerald-400">Won by:</span> {r.winning_factors.map((x: any) => typeof x === "string" ? x : x?.text || "").join(" · ")}</p>
                  )}
                  {Array.isArray(r.losing_factors) && r.losing_factors.length > 0 && (
                    <p><span className="text-red-400">Lost by:</span> {r.losing_factors.map((x: any) => typeof x === "string" ? x : x?.text || "").join(" · ")}</p>
                  )}
                  {r.recommended_change && <p className="text-yellow-300">Change: {r.recommended_change}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              </SCSection>
            );
          })}
        </div>
      )}
    </SCLayout>
  );
}