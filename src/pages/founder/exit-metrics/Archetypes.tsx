import { useEffect, useMemo, useState } from "react";
import { ExitLayout, ExitSection, ArchetypeBadge, CategoryBadge } from "./_shared";
import {
  fetchTemplates, ARCHETYPE_META,
  type ExitMetricTemplate,
} from "@/lib/exitMetricsEngine";

export default function ExitArchetypes() {
  const [templates, setTemplates] = useState<ExitMetricTemplate[]>([]);
  useEffect(() => { fetchTemplates().then(setTemplates).catch(() => {}); }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, ExitMetricTemplate[]>();
    for (const t of templates) {
      const arr = m.get(t.archetype_code) ?? [];
      arr.push(t); m.set(t.archetype_code, arr);
    }
    return Array.from(m.entries()).sort();
  }, [templates]);

  return (
    <ExitLayout title="Archetype-specific scorecards"
      subtitle="Each archetype is valued by different metrics. The Exit Metrics Agent must select the correct template — never apply the wrong valuation model.">
      <div className="grid md:grid-cols-2 gap-3">
        {grouped.map(([arche, metrics]) => (
          <ExitSection key={arche}
            title={ARCHETYPE_META[arche]?.label ?? arche}
            description={`${metrics.length} metric${metrics.length === 1 ? "" : "s"} buyers care about for this archetype.`}
            actions={<ArchetypeBadge code={arche} />}>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr><th className="text-left p-1">Metric</th><th className="text-left p-1">Category</th><th className="text-right p-1">Importance</th></tr>
              </thead>
              <tbody>
                {metrics.sort((a, b) => b.buyer_importance_score - a.buyer_importance_score).map(t => (
                  <tr key={t.id} className="border-b border-border/20">
                    <td className="p-1">{t.metric_name}<div className="text-[10px] text-muted-foreground">{t.description}</div></td>
                    <td className="p-1"><CategoryBadge c={t.metric_category} /></td>
                    <td className="p-1 text-right font-mono">{t.buyer_importance_score}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ExitSection>
        ))}
      </div>
    </ExitLayout>
  );
}