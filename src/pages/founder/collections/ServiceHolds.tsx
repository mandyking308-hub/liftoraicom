import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, TagBadge } from "./_shared";
import { listServiceHolds, listWriteoffs, fmtMoney } from "@/lib/collectionsEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CollectionsServiceHolds() {
  const { data: holds = [] } = useQuery({ queryKey: ["col-holds"], queryFn: listServiceHolds });
  const { data: writeoffs = [] } = useQuery({ queryKey: ["col-writeoffs"], queryFn: listWriteoffs });
  return (
    <FounderLayout>
      <ColLayout title="Service Holds & Write-offs" subtitle="Recommendations to pause service or write off unrecoverable debt. Founder decision required for every record; nothing executes automatically.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Service-hold recommendations</CardTitle></CardHeader>
          <CardContent className="p-0">
            {holds.length === 0 ? <p className="p-4 text-xs text-muted-foreground">None recommended.</p> : (
              <div className="divide-y divide-border/40">
                {holds.map(h => (
                  <div key={h.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{h.customer_label ?? "Unknown"} · {h.business_name ?? "—"}</span>
                      <TagBadge label={h.hold_scope} tone="info" />
                      <TagBadge label={`risk ${h.risk_score}`} tone={h.risk_score >= 70 ? "bad" : h.risk_score >= 40 ? "warn" : "ok"} />
                      <TagBadge label={h.hold_status} tone={h.hold_status === "executed" ? "bad" : h.hold_status === "approved" ? "warn" : h.hold_status === "rejected" || h.hold_status === "reversed" ? "muted" : "warn"} />
                      {h.founder_decision && <TagBadge label={`founder: ${h.founder_decision}`} tone="info" />}
                      {!h.executed && h.hold_status !== "rejected" && <TagBadge label="no auto-execution" tone="info" />}
                      {h.is_test_data && <TagBadge label={`test:${h.trace_id ?? ""}`} tone="info" />}
                    </div>
                    <p className="text-muted-foreground">{h.justification}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Write-off / continue-recovery decisions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {writeoffs.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No write-off decisions logged.</p> : (
              <div className="divide-y divide-border/40">
                {writeoffs.map(w => (
                  <div key={w.id} className="p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-sm">{w.invoice_reference ?? "—"}</span>
                    <span className="text-muted-foreground">{w.business_name ?? "—"}</span>
                    <span className="tabular-nums">{fmtMoney(Number(w.amount), w.currency)}</span>
                    <span className="text-muted-foreground italic max-w-md truncate">{w.reason}</span>
                    <span className="ml-auto" />
                    <TagBadge label={w.recommendation} tone={w.recommendation === "write_off" ? "bad" : w.recommendation === "legal_referral" ? "warn" : "info"} />
                    <TagBadge label={w.founder_decision ?? "pending"} tone={w.founder_decision === "approve" ? "ok" : w.founder_decision === "reject" ? "muted" : "warn"} />
                    {!w.applied && <TagBadge label="not applied" tone="info" />}
                    {w.is_test_data && <TagBadge label={`test:${w.trace_id ?? ""}`} tone="info" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ColLayout>
    </FounderLayout>
  );
}