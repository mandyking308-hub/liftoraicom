import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCLayout, SCSection, SCStat, SCEmpty } from "./_shared";

type Event = { event_type: string; event_value: number | null; source_agent: string | null; product_id: string | null; offer_id: string | null };
type WLR = { outcome: string; objections: any; reason: string | null; price_issue: boolean; trust_issue: boolean; timing_issue: boolean; product_fit_issue: boolean; competitor_issue: boolean };
type SP = { script_section: string; close_rate: number; conversion_rate: number; recommended_status: string; usage_count: number };

const FUNNEL_ORDER = ["lead_created", "call_booked", "call_completed", "proposal_sent", "follow_up_sent", "close_attempted", "closed_won"];

export default function SalesCoachingDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [wlr, setWlr] = useState<WLR[]>([]);
  const [scripts, setScripts] = useState<SP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [e, w, s] = await Promise.all([
        supabase.from("sales_conversion_events").select("event_type,event_value,source_agent,product_id,offer_id").limit(1000),
        supabase.from("sales_win_loss_reviews").select("outcome,objections,reason,price_issue,trust_issue,timing_issue,product_fit_issue,competitor_issue").limit(500),
        supabase.from("sales_script_performance").select("script_section,close_rate,conversion_rate,recommended_status,usage_count").limit(500),
      ]);
      setEvents((e.data as Event[]) || []);
      setWlr((w.data as WLR[]) || []);
      setScripts((s.data as SP[]) || []);
      setLoading(false);
    })();
  }, []);

  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });

  const won = counts["closed_won"] || 0;
  const lost = counts["closed_lost"] || 0;
  const leads = counts["lead_created"] || 0;
  const closeRate = leads ? Math.round((won / leads) * 100) : 0;

  // biggest drop-off
  let biggestDrop = "—";
  let dropPct = 0;
  for (let i = 1; i < FUNNEL_ORDER.length; i++) {
    const prev = counts[FUNNEL_ORDER[i - 1]] || 0;
    const cur = counts[FUNNEL_ORDER[i]] || 0;
    if (prev > 0) {
      const drop = ((prev - cur) / prev) * 100;
      if (drop > dropPct) { dropPct = drop; biggestDrop = `${FUNNEL_ORDER[i - 1]} → ${FUNNEL_ORDER[i]}`; }
    }
  }

  // top objections
  const objMap: Record<string, number> = {};
  wlr.forEach(r => (Array.isArray(r.objections) ? r.objections : []).forEach((o: any) => {
    const k = typeof o === "string" ? o : o?.text || JSON.stringify(o);
    objMap[k] = (objMap[k] || 0) + 1;
  }));
  const topObjections = Object.entries(objMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const bestScript = [...scripts].sort((a, b) => (b.close_rate || 0) - (a.close_rate || 0))[0];
  const worstScript = [...scripts].filter(s => (s.usage_count || 0) > 0).sort((a, b) => (a.close_rate || 0) - (b.close_rate || 0))[0];

  return (
    <SCLayout title="Coaching Dashboard" subtitle="Funnel, drop-off, objections, scripts, and agent performance. Learns from every conversation, proposal and close attempt.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCStat label="Leads" value={leads} />
        <SCStat label="Closed won" value={won} tone="good" />
        <SCStat label="Closed lost" value={lost} tone={lost > won ? "bad" : "default"} />
        <SCStat label="Close rate" value={`${closeRate}%`} tone={closeRate >= 20 ? "good" : closeRate >= 10 ? "warn" : "bad"} hint="closed_won / leads" />
      </div>

      <SCSection title="Conversion funnel" description="Counts by stage across all tracked events.">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <div className="space-y-2">
            {FUNNEL_ORDER.map(stage => {
              const c = counts[stage] || 0;
              const max = Math.max(...FUNNEL_ORDER.map(s => counts[s] || 0), 1);
              const pct = Math.round((c / max) * 100);
              return (
                <div key={stage} className="flex items-center gap-2 text-xs">
                  <div className="w-36 text-muted-foreground">{stage}</div>
                  <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
                    <div className="h-full bg-primary/60" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-10 text-right tabular-nums">{c}</div>
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground pt-2">Biggest drop-off: <span className="text-yellow-300">{biggestDrop}</span> ({Math.round(dropPct)}%)</p>
          </div>
        )}
      </SCSection>

      <div className="grid md:grid-cols-2 gap-3">
        <SCSection title="Top objections" description="From win/loss reviews.">
          {topObjections.length === 0 ? <SCEmpty title="No objections logged yet" /> : (
            <ul className="text-xs space-y-1">
              {topObjections.map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-border/40 py-1">
                  <span>{k}</span><span className="text-muted-foreground tabular-nums">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </SCSection>

        <SCSection title="Scripts" description="Best / weakest performer by close rate.">
          {scripts.length === 0 ? <SCEmpty title="No script performance recorded yet" /> : (
            <div className="text-xs space-y-2">
              <div className="p-2 rounded border border-emerald-500/30 bg-emerald-500/5">
                <p className="text-[10px] uppercase text-emerald-400">Best</p>
                <p className="font-medium">{bestScript?.script_section || "—"}</p>
                <p className="text-muted-foreground">close {Math.round((bestScript?.close_rate || 0) * 100)}% · used {bestScript?.usage_count || 0}×</p>
              </div>
              <div className="p-2 rounded border border-red-500/30 bg-red-500/5">
                <p className="text-[10px] uppercase text-red-400">Weakest</p>
                <p className="font-medium">{worstScript?.script_section || "—"}</p>
                <p className="text-muted-foreground">close {Math.round((worstScript?.close_rate || 0) * 100)}% · used {worstScript?.usage_count || 0}×</p>
              </div>
            </div>
          )}
        </SCSection>
      </div>

      <SCSection title="Reasons for lost deals" description="Issue tags across win/loss reviews.">
        {wlr.length === 0 ? <SCEmpty title="No win/loss reviews yet" /> : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {[
              ["Price", wlr.filter(r => r.price_issue).length],
              ["Trust", wlr.filter(r => r.trust_issue).length],
              ["Timing", wlr.filter(r => r.timing_issue).length],
              ["Product fit", wlr.filter(r => r.product_fit_issue).length],
              ["Competitor", wlr.filter(r => r.competitor_issue).length],
            ].map(([k, v]) => (
              <div key={k as string} className="p-2 rounded border border-border/50 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
                <p className="text-lg font-bold">{v as number}</p>
              </div>
            ))}
          </div>
        )}
      </SCSection>
    </SCLayout>
  );
}