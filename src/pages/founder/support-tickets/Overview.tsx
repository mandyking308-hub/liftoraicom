import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STLayout, STSection, STStat } from "./_shared";
import { computeSupportSnapshot, type SupportSnapshot } from "@/lib/supportTickets";

export default function SupportOverview() {
  const [snap, setSnap] = useState<SupportSnapshot | null>(null);
  useEffect(() => { computeSupportSnapshot().then(setSnap); }, []);

  if (!snap) return <STLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating support load…</p></STLayout>;

  return (
    <STLayout title="Overview" subtitle="Track issues, severity, deadlines, sentiment, repeat cases, and when to escalate. Replies are drafted internally and need founder approval before send.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <STStat label="Open tickets" value={snap.total_open} />
        <STStat label="Critical" value={snap.critical} tone={snap.critical > 0 ? "bad" : "good"} />
        <STStat label="High" value={snap.high} tone={snap.high > 0 ? "warn" : "good"} />
        <STStat label="Escalated" value={snap.escalated} tone={snap.escalated > 0 ? "bad" : "good"} />
      </div>

      <STSection title="Support SLA Agent" description="Triages tickets, drafts replies from verified knowledge, watches SLA deadlines, escalates risks, flags upgrade/churn signals.">
        <p className="text-sm">{snap.recommended_action}</p>
      </STSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <STStat label="SLA overdue" value={snap.sla_overdue} tone={snap.sla_overdue > 0 ? "bad" : "good"} />
        <STStat label="SLA at risk (1h)" value={snap.sla_at_risk} tone={snap.sla_at_risk > 0 ? "warn" : "good"} />
        <STStat label="Vulnerable/angry" value={snap.vulnerable_or_angry} tone={snap.vulnerable_or_angry > 0 ? "bad" : "good"} />
        <STStat label="Awaiting customer" value={snap.awaiting_customer} hint={`+ ${snap.awaiting_internal} awaiting internal`} />
      </div>

      <STSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Queue", "/founder/support-tickets/queue"],
            ["SLA board", "/founder/support-tickets/sla"],
            ["Escalations", "/founder/support-tickets/escalations"],
            ["Knowledge", "/founder/support-tickets/knowledge"],
            ["Settings", "/founder/support-tickets/settings"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </STSection>
    </STLayout>
  );
}