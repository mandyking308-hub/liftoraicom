import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, TagBadge } from "./_shared";
import { listPlans, fmtMoney } from "@/lib/collectionsEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function CollectionsPaymentPlans() {
  const { data: rows = [] } = useQuery({ queryKey: ["col-plans"], queryFn: listPlans });
  return (
    <FounderLayout>
      <ColLayout title="Payment Plans" subtitle="Proposed instalment plans for customers in difficulty. Plans only become active after founder approval.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No payment plans proposed.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(p => (
                  <div key={p.id} className="p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-sm">{p.invoice_reference ?? "—"}</span>
                    <span className="text-muted-foreground">{p.business_name ?? "—"}</span>
                    <span className="tabular-nums">{fmtMoney(Number(p.total_amount), p.currency)} · {p.instalment_count}× {p.cadence}</span>
                    {p.first_instalment_date && <span className="text-muted-foreground">from {p.first_instalment_date}</span>}
                    <span className="ml-auto" />
                    <TagBadge label={p.plan_status} tone={p.plan_status === "active" || p.plan_status === "completed" ? "ok" : p.plan_status === "defaulted" || p.plan_status === "cancelled" ? "bad" : "warn"} />
                    {p.requires_approval && p.plan_status === "proposed" && <TagBadge label="awaiting approval" tone="warn" />}
                    {p.is_test_data && <TagBadge label={`test:${p.trace_id ?? ""}`} tone="info" />}
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