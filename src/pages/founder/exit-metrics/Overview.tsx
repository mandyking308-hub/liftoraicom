import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExitLayout, ExitSection, ExitStat, fetchBusinesses } from "./_shared";
import {
  fetchTemplates, fetchValues, fetchScores, summarize, diagnose,
  type ExitMetricTemplate, type BusinessExitMetricValue, type ExitReadinessScore,
} from "@/lib/exitMetricsEngine";

export default function ExitOverview() {
  const [templates, setTemplates] = useState<ExitMetricTemplate[]>([]);
  const [values, setValues] = useState<BusinessExitMetricValue[]>([]);
  const [scores, setScores] = useState<ExitReadinessScore[]>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string | null; name: string; archetype: string | null }>>([]);
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
    fetchValues().then(setValues).catch(() => {});
    fetchScores().then(setScores).catch(() => {});
    fetchBusinesses().then(setBusinesses).catch(() => {});
  }, []);
  const sum = summarize(templates, values, scores);
  const diags = diagnose(templates, values, scores, businesses);

  return (
    <ExitLayout title="Business-Type Exit Metrics Engine"
      subtitle="Values each business by the metrics buyers of its archetype care about. SaaS, marketplace, eCommerce, service, media, lead-gen and course/community each have distinct exit metrics. Internal valuation is live. Buyer, investor, adviser contact, data-room sharing and any sale-process activation require approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <ExitStat label="Avg readiness" value={`${sum.avg_readiness}%`} hint={`${sum.scored_businesses} scored`} />
        <ExitStat label="Exit-ready" value={sum.exit_ready} hint="≥ 80%" />
        <ExitStat label="Not ready" value={sum.not_ready} hint="< 40%" />
        <ExitStat label="Businesses tracked" value={sum.businesses_tracked} />
        <ExitStat label="Missing values" value={sum.values_missing} hint={`${sum.values_estimated} estimated`} />
        <ExitStat label="Strong values" value={sum.values_strong} hint={`${sum.templates_total} templates`} />
      </div>

      <ExitSection title="Exit Metrics Agent — diagnostics"
        description="Selects correct exit metrics by archetype, flags missing metrics, recommends improvements, links to buyer/acquirer logic, prevents wrong valuation model. Agent never contacts buyers, advisers or shares the data room."
        actions={<Link to="/founder/exit-metrics/readiness" className="text-xs text-primary hover:underline">Readiness scorecards →</Link>}>
        {diags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No exit-metric warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {diags.slice(0, 80).map((d, i) => (
              <li key={`${d.id}-${i}`} className="flex items-start gap-2">
                <span className={d.severity === "block" ? "text-destructive" : d.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </ExitSection>

      <ExitSection title="Integrations">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          {[
            { to: "/founder/portfolio-exit", label: "Portfolio Exit — valuation & exit prep" },
            { to: "/founder/business-archetypes/classifier", label: "Archetype Classifier — which template to use" },
            { to: "/founder/adviser-pack", label: "Finance / Adviser Pack — evidence sources" },
            { to: "/founder/revenue-autopilot", label: "Revenue Autopilot — revenue & retention feeds" },
            { to: "/founder/marketplace", label: "Marketplace — GMV / liquidity feeds" },
            { to: "/founder/command-centre", label: "Command Centre — surfaced readiness tile" },
          ].map(l => (
            <Link key={l.to} to={l.to} className="border border-border/50 rounded p-2 hover:bg-secondary">{l.label}</Link>
          ))}
        </div>
      </ExitSection>
    </ExitLayout>
  );
}