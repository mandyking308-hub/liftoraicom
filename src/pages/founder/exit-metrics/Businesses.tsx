import { useEffect, useState } from "react";
import { ExitLayout, ExitSection, ArchetypeBadge, StatusBadge, ScoreBar, shortId, fetchBusinesses } from "./_shared";
import {
  fetchTemplates, fetchValues, computeReadiness, recommendedFor,
  type ExitMetricTemplate, type BusinessExitMetricValue,
} from "@/lib/exitMetricsEngine";

export default function ExitBusinesses() {
  const [templates, setTemplates] = useState<ExitMetricTemplate[]>([]);
  const [values, setValues] = useState<BusinessExitMetricValue[]>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string | null; name: string; archetype: string | null }>>([]);
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
    fetchValues().then(setValues).catch(() => {});
    fetchBusinesses().then(setBusinesses).catch(() => {});
  }, []);

  const rows = businesses.length > 0 ? businesses : [{ id: null, name: "Unassigned", archetype: null }];

  return (
    <ExitLayout title="Exit metrics by business"
      subtitle="Per business: archetype, applicable metric template, current values, readiness score. Internal view only.">
      <ExitSection title={`Businesses (${rows.length})`} description="Click any business to see its archetype scorecard.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Archetype</th>
                <th className="text-right p-2">Metrics</th>
                <th className="text-right p-2">Missing</th>
                <th className="text-right p-2">Strong</th>
                <th className="text-left p-2">Readiness</th>
                <th className="text-left p-2">Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => {
                const arche = (b.archetype ?? "other").toLowerCase();
                const relevant = recommendedFor(arche, templates);
                const r = computeReadiness(b.id, arche, templates, values);
                const bizVals = values.filter(v => v.business_id === b.id && relevant.some(t => t.id === v.metric_template_id));
                const strong = bizVals.filter(v => v.metric_status === "strong").length;
                return (
                  <tr key={b.id ?? "none"} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{b.name}<div className="text-[10px] text-muted-foreground">{shortId(b.id)}</div></td>
                    <td className="p-2"><ArchetypeBadge code={arche} /></td>
                    <td className="p-2 text-right">{relevant.length}</td>
                    <td className={`p-2 text-right ${r.relevant_missing > 0 ? "text-yellow-300" : ""}`}>{r.relevant_missing}</td>
                    <td className="p-2 text-right">{strong}</td>
                    <td className="p-2"><ScoreBar value={r.total_exit_readiness_score} /></td>
                    <td className="p-2 text-primary/90">{r.recommended_action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ExitSection>
    </ExitLayout>
  );
}