import { useEffect, useState } from "react";
import { ExitLayout, ExitSection, ArchetypeBadge, StatusBadge, CategoryBadge, shortId, fetchBusinesses } from "./_shared";
import { Badge } from "@/components/ui/badge";
import {
  fetchTemplates, fetchValues, recommendedFor,
  type ExitMetricTemplate, type BusinessExitMetricValue,
} from "@/lib/exitMetricsEngine";

export default function ExitDataRoom() {
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
    <ExitLayout title="Data room checklist"
      subtitle="Per-business checklist of buyer-grade evidence. Internal only. Sharing the data room requires explicit approval.">
      <div className="space-y-3">
        {rows.map(b => {
          const arche = (b.archetype ?? "other").toLowerCase();
          const relevant = recommendedFor(arche, templates);
          const bizVals = values.filter(v => v.business_id === b.id);
          const ready = relevant.filter(t => {
            const v = bizVals.find(x => x.metric_template_id === t.id);
            return v && (v.metric_status === "confirmed" || v.metric_status === "strong") && !!v.evidence_source;
          }).length;
          const pct = relevant.length ? Math.round((ready / relevant.length) * 100) : 0;
          return (
            <ExitSection key={b.id ?? "none"}
              title={`${b.name}`}
              description={`${ready}/${relevant.length} buyer-grade evidence items captured`}
              actions={
                <div className="flex items-center gap-2">
                  <ArchetypeBadge code={arche} />
                  <Badge variant="outline" className={`text-[10px] ${pct >= 80 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : pct >= 50 ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                    {pct}% data-room ready
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{shortId(b.id)}</span>
                </div>
              }>
              {relevant.length === 0 ? (
                <p className="text-xs text-muted-foreground">No template assigned yet — Archetype Classifier must run.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                    <tr><th className="text-left p-1">Metric</th><th className="text-left p-1">Category</th><th className="text-left p-1">Status</th><th className="text-left p-1">Evidence</th><th className="text-left p-1">Period</th></tr>
                  </thead>
                  <tbody>
                    {relevant.map(t => {
                      const v = bizVals.find(x => x.metric_template_id === t.id);
                      return (
                        <tr key={t.id} className="border-b border-border/20">
                          <td className="p-1">{t.metric_name}</td>
                          <td className="p-1"><CategoryBadge c={t.metric_category} /></td>
                          <td className="p-1">{v ? <StatusBadge s={v.metric_status} /> : <StatusBadge s="missing" />}</td>
                          <td className="p-1 text-muted-foreground">{v?.evidence_source ?? <span className="text-red-400">no evidence</span>}</td>
                          <td className="p-1 text-muted-foreground">{v?.period_start ?? "—"} → {v?.period_end ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </ExitSection>
          );
        })}
      </div>
    </ExitLayout>
  );
}