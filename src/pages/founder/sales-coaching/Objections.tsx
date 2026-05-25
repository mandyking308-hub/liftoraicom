import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCLayout, SCSection, SCEmpty } from "./_shared";

type WLR = { outcome: string; objections: any; reason: string | null; recommended_change: string | null };

export default function SalesCoachingObjections() {
  const [rows, setRows] = useState<WLR[]>([]);
  useEffect(() => {
    supabase.from("sales_win_loss_reviews").select("outcome,objections,reason,recommended_change").limit(1000)
      .then(r => setRows((r.data as WLR[]) || []));
  }, []);

  const tally: Record<string, { total: number; lost: number; suggestions: Set<string> }> = {};
  rows.forEach(r => {
    (Array.isArray(r.objections) ? r.objections : []).forEach((o: any) => {
      const k = typeof o === "string" ? o : o?.text || JSON.stringify(o);
      if (!tally[k]) tally[k] = { total: 0, lost: 0, suggestions: new Set() };
      tally[k].total++;
      if (r.outcome === "lost") tally[k].lost++;
      if (r.recommended_change) tally[k].suggestions.add(r.recommended_change);
    });
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1].total - a[1].total);

  return (
    <SCLayout title="Objections" subtitle="Every objection logged across deals, with loss impact and recommended responses.">
      <SCSection title="Objection register">
        {sorted.length === 0 ? <SCEmpty title="No objections recorded" hint="Objections appear here as win/loss reviews are logged from sales conversations." /> : (
          <div className="space-y-2">
            {sorted.map(([k, v]) => (
              <div key={k} className="p-3 rounded border border-border/50 text-xs space-y-1">
                <div className="flex justify-between font-medium"><span>{k}</span><span className="tabular-nums text-muted-foreground">{v.lost}/{v.total} lost</span></div>
                {v.suggestions.size > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Suggested responses: {[...v.suggestions].slice(0, 3).join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SCSection>
    </SCLayout>
  );
}