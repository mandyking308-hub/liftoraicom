import { useEffect, useState } from "react";
import { ExitLayout, ExitSection, ArchetypeBadge, ScoreBar, shortId, fetchBusinesses } from "./_shared";
import {
  fetchTemplates, fetchValues, computeReadiness,
  type ExitMetricTemplate, type BusinessExitMetricValue,
} from "@/lib/exitMetricsEngine";

const COLS: Array<{ key: keyof ReturnType<typeof computeReadiness>; label: string }> = [
  { key: "revenue_quality_score", label: "Revenue quality" },
  { key: "growth_score",          label: "Growth" },
  { key: "margin_score",          label: "Margin" },
  { key: "defensibility_score",   label: "Defensibility" },
  { key: "operations_score",      label: "Operations" },
  { key: "compliance_score",      label: "Compliance" },
  { key: "buyer_fit_score",       label: "Buyer fit" },
  { key: "data_room_score",       label: "Data room" },
];

export default function ExitReadiness() {
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
    <ExitLayout title="Exit readiness scorecards"
      subtitle="Eight-axis readiness per business: revenue quality, growth, margin, defensibility, operations, compliance, buyer fit, data room. Numbers are internal — no buyer/adviser sharing without approval.">
      <ExitSection title={`Scorecards (${rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Archetype</th>
                {COLS.map(c => <th key={c.key} className="text-left p-2">{c.label}</th>)}
                <th className="text-left p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => {
                const arche = (b.archetype ?? "other").toLowerCase();
                const r = computeReadiness(b.id, arche, templates, values);
                return (
                  <tr key={b.id ?? "none"} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{b.name}<div className="text-[10px] text-muted-foreground">{shortId(b.id)}</div></td>
                    <td className="p-2"><ArchetypeBadge code={arche} /></td>
                    {COLS.map(c => (
                      <td key={c.key} className="p-2"><ScoreBar value={r[c.key] as number | null} /></td>
                    ))}
                    <td className="p-2"><ScoreBar value={r.total_exit_readiness_score} /></td>
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