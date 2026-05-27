import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, TagBadge, riskTone } from "./_shared";
import { listOverdue, fmtMoney } from "@/lib/collectionsEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function CollectionsOverdue() {
  const { data: rows = [] } = useQuery({ queryKey: ["col-overdue"], queryFn: listOverdue });
  return (
    <FounderLayout>
      <ColLayout title="Overdue Invoices" subtitle="All invoices past due across every Liftor-managed business. Recovery actions remain in draft until founder approves.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No overdue invoices.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-sm">{r.invoice_reference}</span>
                    <span className="text-muted-foreground">{r.business_name ?? "—"} · {r.customer_label ?? "Unknown customer"}</span>
                    <span className="ml-auto tabular-nums">{fmtMoney(Number(r.amount_outstanding), r.currency)}</span>
                    <span className="text-muted-foreground">{r.days_overdue}d overdue</span>
                    <TagBadge label={r.risk_tier} tone={riskTone(r.risk_tier)} />
                    <TagBadge label={r.collection_status} tone={r.collection_status === "recovered" ? "ok" : r.collection_status === "written_off" ? "muted" : "warn"} />
                    {r.founder_review_required && <TagBadge label="founder review" tone="warn" />}
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