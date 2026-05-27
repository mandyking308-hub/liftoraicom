import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, TagBadge } from "./_shared";
import { listFailed, fmtMoney } from "@/lib/collectionsEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function CollectionsFailedPayments() {
  const { data: rows = [] } = useQuery({ queryKey: ["col-failed"], queryFn: listFailed });
  return (
    <FounderLayout>
      <ColLayout title="Failed Payments" subtitle="Subscription and one-off payment failures. No retry, no provider call without explicit founder approval.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No failed payments.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-sm">{r.invoice_reference ?? "—"}</span>
                    <span className="text-muted-foreground">{r.business_name ?? "—"} · {r.provider ?? "unknown"} · {r.failure_code ?? "n/a"}</span>
                    <span className="text-muted-foreground italic max-w-md truncate">{r.failure_reason}</span>
                    <span className="ml-auto tabular-nums">{fmtMoney(Number(r.amount), r.currency)}</span>
                    <TagBadge label={`attempt ${r.attempt_count}`} />
                    <TagBadge label={r.retry_recommendation} tone={r.retry_recommendation === "founder_review" ? "warn" : "info"} />
                    <TagBadge label={r.recovery_status} tone={r.recovery_status === "recovered" ? "ok" : r.recovery_status === "abandoned" ? "muted" : "warn"} />
                    {r.approved_to_retry ? <TagBadge label="retry approved" tone="ok" /> : <TagBadge label="retry blocked" tone="warn" />}
                    {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
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