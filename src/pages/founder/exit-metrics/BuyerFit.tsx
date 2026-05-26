import { useEffect, useState } from "react";
import { ExitLayout, ExitSection, ArchetypeBadge, ScoreBar, shortId, fetchBusinesses } from "./_shared";
import { Badge } from "@/components/ui/badge";
import {
  fetchTemplates, fetchValues, computeReadiness, ARCHETYPE_META,
  type ExitMetricTemplate, type BusinessExitMetricValue,
} from "@/lib/exitMetricsEngine";

/** Heuristic buyer-type suggestions by archetype — internal only. */
const BUYER_HINTS: Record<string, string[]> = {
  saas:        ["Strategic SaaS acquirers", "PE roll-ups", "Micro-PE / search funds"],
  marketplace: ["Strategic marketplace operators", "Growth equity", "Vertical roll-ups"],
  ecommerce:   ["Aggregators (D2C / Amazon)", "Strategic retailers", "Holdco operators"],
  service:     ["Roll-up consolidators", "Larger agencies", "PE-backed services platforms"],
  media:       ["Media networks", "IP / catalogue buyers", "Licensing partners"],
  lead_gen:    ["Industry buyers", "Performance-marketing roll-ups", "Strategic insurers/lenders"],
  course:      ["EdTech operators", "Community-platform acquirers", "Creator holdcos"],
  other:       ["TBD — classify archetype first"],
};

function fitTier(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: "Approachable (with approval)", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (score >= 60) return { label: "Pre-approach prep", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
  if (score >= 40) return { label: "Fill gaps first", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" };
  return { label: "Do not contact buyers", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
}

export default function ExitBuyerFit() {
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
    <ExitLayout title="Buyer-fit readiness"
      subtitle="Suggests which buyer types each business would suit and whether it is ready to be approached. Suggestions are internal — no buyer/investor contact without approval.">
      <ExitSection title={`Buyer fit (${rows.length})`} description="Approach status is computed from readiness. Real outreach goes through Approval Queue.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Archetype</th>
                <th className="text-left p-2">Readiness</th>
                <th className="text-left p-2">Approach status</th>
                <th className="text-left p-2">Likely buyer types (internal hint)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => {
                const arche = (b.archetype ?? "other").toLowerCase();
                const r = computeReadiness(b.id, arche, templates, values);
                const tier = fitTier(r.total_exit_readiness_score);
                const buyers = BUYER_HINTS[arche] ?? BUYER_HINTS.other;
                return (
                  <tr key={b.id ?? "none"} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{b.name}<div className="text-[10px] text-muted-foreground">{shortId(b.id)}</div></td>
                    <td className="p-2"><ArchetypeBadge code={arche} /></td>
                    <td className="p-2"><ScoreBar value={r.total_exit_readiness_score} /></td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${tier.cls}`}>{tier.label}</Badge></td>
                    <td className="p-2 text-muted-foreground">{buyers.join(" · ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ExitSection>

      <ExitSection title="Why archetype matters" description="Applying the wrong valuation model destroys credibility. The Exit Metrics Agent must use the right metric set per archetype.">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          {Object.entries(ARCHETYPE_META).filter(([k]) => k !== "other").map(([k, m]) => (
            <div key={k} className="border border-border/50 rounded p-2">
              <ArchetypeBadge code={k} />
              <p className="mt-1 text-muted-foreground">{(BUYER_HINTS[k] ?? []).join(" · ")}</p>
            </div>
          ))}
        </div>
      </ExitSection>
    </ExitLayout>
  );
}