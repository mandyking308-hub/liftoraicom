import { useEffect, useState } from "react";
import { PPLLayout, PPLSection, PPLEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PeopleQuality() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [ops, setOps] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("human_operator_quality_reviews")
      .select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("human_operators").select("id,name").then(({ data }: any) => {
      const m: Record<string, any> = {};
      (data ?? []).forEach((o: any) => { m[o.id] = o; });
      setOps(m);
    });
  }, []);

  const scoreTone = (n: number | null | undefined) =>
    n == null ? "" : n >= 8 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : n >= 5 ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <PPLLayout title="Quality review board" subtitle="Track quality, timeliness and accuracy per operator. The Human Oversight Agent flags consistent under-performance and suggests escalation, retraining or replacement.">
      <PPLSection title="Reviews">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PPLEmpty title="No quality reviews yet" hint="Reviews are created after each delivery cycle or on a fixed cadence. Scores feed into operator retention decisions." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{ops[r.operator_id]?.name || "Unknown operator"}</span>
                    <span className="text-muted-foreground">
                      {r.review_period_start ? new Date(r.review_period_start).toLocaleDateString() : "—"}
                      {" → "}
                      {r.review_period_end ? new Date(r.review_period_end).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={scoreTone(r.quality_score)}>Quality {r.quality_score ?? "—"}</Badge>
                    <Badge variant="outline" className={scoreTone(r.timeliness_score)}>Timeliness {r.timeliness_score ?? "—"}</Badge>
                    <Badge variant="outline" className={scoreTone(r.accuracy_score)}>Accuracy {r.accuracy_score ?? "—"}</Badge>
                  </div>
                  {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                  {r.recommended_action && <p><span className="text-foreground">Recommended: </span><span className="text-muted-foreground">{r.recommended_action}</span></p>}
                </div>
              ))}
            </div>
          )}
      </PPLSection>
    </PPLLayout>
  );
}