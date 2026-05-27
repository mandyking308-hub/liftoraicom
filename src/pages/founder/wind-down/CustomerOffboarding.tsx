import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, TagBadge } from "./_shared";
import { listCustomerOffboarding, fmtMoney } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownCustomerOffboarding() {
  const { data: items = [] } = useQuery({ queryKey: ["wd-customers"], queryFn: listCustomerOffboarding });
  return (
    <FounderLayout>
      <WdLayout title="Customer offboarding" subtitle="Every customer relationship affected. Notices, data exports and refunds never fire automatically.">
        <div className="space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">No customer offboarding tasks.</p>}
          {items.map(c => (
            <Card key={c.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{c.customer_label}</span>
                  <TagBadge label={c.obligation_type} tone="info" />
                  {c.refund_due > 0 && <TagBadge label={`refund ${fmtMoney(c.refund_due, c.currency)}`} tone="warn" />}
                  <TagBadge label={`notice: ${c.notice_status}`} tone={c.notice_status === "sent" ? "ok" : "warn"} />
                  <TagBadge label={`export: ${c.data_export_status}`} tone={c.data_export_status === "delivered" ? "ok" : "warn"} />
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </WdLayout>
    </FounderLayout>
  );
}