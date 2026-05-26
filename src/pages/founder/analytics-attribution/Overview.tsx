import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AALayout, AASection, AAStat, fmtMoney } from "./_shared";
import {
  fetchSources, fetchEvents, fetchModels, summarize, diagnose,
  type AttributionSource, type AttributionEvent, type AttributionModel,
} from "@/lib/attributionEngine";

export default function AAOverview() {
  const [sources, setSources] = useState<AttributionSource[]>([]);
  const [events, setEvents] = useState<AttributionEvent[]>([]);
  const [models, setModels] = useState<AttributionModel[]>([]);
  useEffect(() => {
    fetchSources().then(setSources).catch(() => {});
    fetchEvents().then(setEvents).catch(() => {});
    fetchModels().then(setModels).catch(() => {});
  }, []);
  const sum = summarize(sources, events, models);
  const diags = diagnose(sources, events, models);
  return (
    <AALayout title="Analytics / Attribution Engine"
      subtitle="Where leads, sales, customers and revenue came from. Internal analytics runs live. Tracking script changes, pixel installs, customer contact and data exports remain approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <AAStat label="Sources" value={sum.sources_active} hint={`${sum.sources_total} total`} />
        <AAStat label="Events" value={sum.events_total} hint={`${sum.businesses_tracked} businesses`} />
        <AAStat label="Leads" value={sum.leads} />
        <AAStat label="Sales" value={sum.sales} />
        <AAStat label="Revenue (confirmed)" value={fmtMoney(sum.revenue)} />
        <AAStat label="Unknown source" value={`${sum.unknown_pct.toFixed(1)}%`} hint={`${sum.unknown_events} events`} />
      </div>

      <AASection title="Attribution Agent — diagnostics"
        description="Unknown attribution, missing sources/models, and channel reallocation hints. Agent never edits tracking or exports data."
        actions={<Link to="/founder/analytics-attribution/sources" className="text-xs text-primary hover:underline">Sources →</Link>}>
        {diags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No attribution warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {diags.map((d, i) => (
              <li key={`${d.id}-${i}`} className="flex items-start gap-2">
                <span className={d.severity === "block" ? "text-destructive" : d.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{d.message}</span>
              </li>
            ))}
          </ul>
        )}
      </AASection>
    </AALayout>
  );
}