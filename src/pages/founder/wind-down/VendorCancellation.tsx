import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, TagBadge } from "./_shared";
import { listVendorCancellations, fmtMoney } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownVendorCancellation() {
  const { data: items = [] } = useQuery({ queryKey: ["wd-vendors"], queryFn: listVendorCancellations });
  const totalBurn = items.reduce((a,v)=>a+Number(v.monthly_cost||0),0);
  return (
    <FounderLayout>
      <WdLayout title="Vendor / subscription cancellation" subtitle={`Monthly burn at risk: ${fmtMoney(totalBurn)}. Cancellations require founder approval and respect notice periods.`}>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">No vendor cancellation tasks.</p>}
          {items.map(v => (
            <Card key={v.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{v.vendor_name}</span>
                  {v.service && <span className="text-muted-foreground">· {v.service}</span>}
                  <TagBadge label={fmtMoney(v.monthly_cost, v.currency) + "/mo"} tone="info" />
                  <TagBadge label={`${v.notice_period_days}d notice`} tone="muted" />
                  {v.earliest_cancel_date && <TagBadge label={`earliest ${v.earliest_cancel_date}`} tone="muted" />}
                  <TagBadge label={v.cancellation_status} tone={v.cancellation_status === "cancelled" ? "ok" : "warn"} />
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </WdLayout>
    </FounderLayout>
  );
}