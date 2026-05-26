import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { fetchAuditEvents, summarizeAudit, seedAuditTestEvents } from "@/lib/globalAuditLedger";
import { AuditLayout, AuditStat, sensitivityBadge, categoryBadge } from "./_shared";
import { useState } from "react";
import { toast } from "sonner";

export default function AuditOverview() {
  const q = useQuery({ queryKey: ["audit-overview"], queryFn: () => fetchAuditEvents({ limit: 500, include_test: true }) });
  const sum = q.data ? summarizeAudit(q.data) : null;
  const [busy, setBusy] = useState(false);
  return (
    <AuditLayout title="Global Audit Ledger" subtitle="One append-only audit trail across every business, agent and module. Secrets are redacted before write; deletion is not available from this UI; external export requires founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <AuditStat label="Events 24h" value={sum?.events_today ?? "—"} />
        <AuditStat label="High sensitivity" value={sum?.high_sensitivity_today ?? 0} tone={(sum?.high_sensitivity_today ?? 0) > 0 ? "warn" : "ok"} />
        <AuditStat label="External side-effect" value={sum?.external_side_effect_today ?? 0} tone={(sum?.external_side_effect_today ?? 0) > 0 ? "warn" : "ok"} />
        <AuditStat label="Blocked external" value={sum?.blocked_external_today ?? 0} tone={(sum?.blocked_external_today ?? 0) > 0 ? "bad" : "ok"} />
        <AuditStat label="Access changes" value={sum?.access_changes_today ?? 0} tone={(sum?.access_changes_today ?? 0) > 0 ? "warn" : "ok"} />
        <AuditStat label="Config changes" value={sum?.configuration_changes_today ?? 0} />
      </div>

      <Card className="tech-card p-4">
        <p className="text-xs text-muted-foreground">Recommended review</p>
        <p className="text-sm">{sum?.recommended_review ?? "Loading…"}</p>
      </Card>

      <Card className="tech-card p-4 space-y-2">
        <p className="text-xs text-muted-foreground">Top modules (24h)</p>
        <div className="flex flex-wrap gap-2">
          {(sum?.top_modules ?? []).map(m => (
            <Badge key={m.source_module} variant="outline" className="text-[11px]">{m.source_module} · {m.count}</Badge>
          ))}
          {!sum?.top_modules.length && <span className="text-xs text-muted-foreground">No activity yet.</span>}
        </div>
      </Card>

      <Card className="tech-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">LIVE_INTERNAL_TEST</h3>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">test data only</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Append a small batch of test events (AI / approval / blocked external / config / access / fake provider webhook / blocked document share). All rows are flagged <code>is_test_data=true</code> and produce no external action.</p>
        <Button
          variant="outline" size="sm" disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await seedAuditTestEvents();
            setBusy(false);
            if (r.ok) toast.success(`Seeded ${r.ids.length} test audit events`);
            else toast.error(`Some failed: ${r.errors.join("; ")}`);
            q.refetch();
          }}
        >Seed LIVE_INTERNAL_TEST events</Button>
      </Card>

      <Card className="tech-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Latest events</h3>
          <Link to="/founder/audit-ledger/events" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <div className="space-y-2">
          {(q.data ?? []).slice(0, 15).map(e => (
            <div key={e.id} className="border border-border/40 rounded p-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${categoryBadge(e.event_category)}`}>{e.event_category}</Badge>
                <Badge variant="outline" className={`text-[10px] ${sensitivityBadge(e.sensitivity_level)}`}>{e.sensitivity_level}</Badge>
                {e.is_test_data && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}
                {e.external_side_effect && <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">external</Badge>}
                <code className="text-[10px]">{e.source_module}</code>
                <span className="text-[10px] text-muted-foreground ml-auto">{e.created_at.slice(0,19).replace("T"," ")}</span>
              </div>
              <p className="mt-1">{e.action_summary}</p>
              <p className="text-[10px] text-muted-foreground">{e.actor_type}{e.actor_label ? ` · ${e.actor_label}` : ""}{e.trace_id ? ` · trace ${e.trace_id}` : ""}</p>
            </div>
          ))}
          {!q.data?.length && <p className="text-xs text-muted-foreground">No audit events yet.</p>}
        </div>
      </Card>
    </AuditLayout>
  );
}