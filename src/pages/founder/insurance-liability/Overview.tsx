import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InsLayout, InsSection, InsStat, fmtMoney } from "./_shared";
import {
  fetchPolicies, fetchGaps, fetchEvents, summarize, diagnose, adviserQuestions,
  type InsurancePolicy, type InsuranceGap, type LiabilityEvent,
} from "@/lib/insuranceLiabilityEngine";

export default function InsuranceOverview() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [gaps, setGaps] = useState<InsuranceGap[]>([]);
  const [events, setEvents] = useState<LiabilityEvent[]>([]);
  useEffect(() => {
    fetchPolicies().then(setPolicies).catch(() => {});
    fetchGaps().then(setGaps).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
  }, []);
  const sum = summarize(policies, gaps, events);
  const diags = diagnose(policies, gaps, events);
  const qs = adviserQuestions(policies, gaps, events);

  return (
    <InsLayout title="Insurance / Liability Matrix"
      subtitle="Maps insurance needs across all businesses. Tracks policies, cover, renewals, gaps and liability events. Internal mapping is live. Buying or changing cover, sending declarations, adviser/insurer communications and legal decisions all require approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <InsStat label="Active policies" value={sum.policies_active} hint={`${sum.policies_total} total`} />
        <InsStat label="Missing / expired" value={sum.policies_missing + sum.policies_expired} hint={`${sum.policies_review} need review`} />
        <InsStat label="Renewals 60d" value={sum.renew_soon} hint={`${sum.renew_overdue} overdue`} />
        <InsStat label="Open gaps" value={sum.gaps_open} hint={`${sum.gaps_critical} critical`} />
        <InsStat label="Liability events" value={sum.events_open} hint={`${sum.events_insurance_relevant} insurance-relevant`} />
        <InsStat label="Active cover" value={fmtMoney(sum.cover_active_total)} />
      </div>

      <InsSection title="Insurance / Liability Agent — diagnostics"
        description="Maps insurance needs, flags gaps, watches renewals, links incidents to policy relevance, prepares adviser questions. Agent never buys, changes or contacts insurers/advisers."
        actions={<Link to="/founder/insurance-liability/gaps" className="text-xs text-primary hover:underline">Gap dashboard →</Link>}>
        {diags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No insurance warnings.</p>
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
      </InsSection>

      <InsSection title="Adviser questions prepared"
        description="Auto-drafted questions to take to the broker / legal adviser. Nothing is sent. Approval required before contact.">
        {qs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No outstanding adviser questions.</p>
        ) : (
          <ol className="text-xs space-y-1 list-decimal pl-4">
            {qs.slice(0, 40).map((q, i) => <li key={i}>{q}</li>)}
          </ol>
        )}
      </InsSection>

      <InsSection title="Integrations">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          {[
            { to: "/founder/portfolio-risk", label: "Portfolio Risk — uninsured exposure scoring" },
            { to: "/founder/incidents", label: "Incidents — link incidents to liability events" },
            { to: "/founder/complaints", label: "Complaints — flag insurance-relevant complaints" },
            { to: "/founder/entity-map", label: "Entity Map — entity-level cover mapping" },
            { to: "/founder/adviser-pack", label: "Adviser Pack — broker / legal question pack" },
            { to: "/founder/command-centre", label: "Command Centre — surfaced risk tile" },
          ].map(l => (
            <Link key={l.to} to={l.to} className="border border-border/50 rounded p-2 hover:bg-secondary">{l.label}</Link>
          ))}
        </div>
      </InsSection>
    </InsLayout>
  );
}