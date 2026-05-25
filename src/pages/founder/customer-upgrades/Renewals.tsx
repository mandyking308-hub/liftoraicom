import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CULayout, CUSection, CUEmpty, OPP_STATUS_TONE, fmtMoney } from "./_shared";
import { Badge } from "@/components/ui/badge";

export default function Renewals() {
  const sb: any = supabase as any;
  const { data: opps = [] } = useQuery({
    queryKey: ["cu-renewals"],
    queryFn: async () => (await sb.from("customer_upgrade_opportunities").select("*").in("opportunity_type", ["renewal", "subscription_upgrade", "reactivation"]).order("due_at", { ascending: true, nullsFirst: false }).order("urgency_score", { ascending: false }).limit(200)).data ?? [],
  });

  const now = Date.now();
  const buckets = {
    overdue: opps.filter((o: any) => o.due_at && new Date(o.due_at).getTime() < now && !["won", "lost", "parked"].includes(o.status)),
    next30: opps.filter((o: any) => o.due_at && new Date(o.due_at).getTime() >= now && new Date(o.due_at).getTime() <= now + 30 * 86400000),
    later: opps.filter((o: any) => o.due_at && new Date(o.due_at).getTime() > now + 30 * 86400000),
    undated: opps.filter((o: any) => !o.due_at),
  };

  return (
    <CULayout title="Renewals & Subscription Upgrades" subtitle="Renewal-window opportunities. Confirmed renewal revenue only after verified subscription/contract event.">
      {Object.entries(buckets).map(([k, items]) => (
        <CUSection key={k} title={k} description={`${items.length} item(s)`}>
          {items.length === 0 ? <CUEmpty title="Nothing here" /> : (
            <div className="space-y-2">
              {items.map((o: any) => (
                <div key={o.id} className="flex flex-wrap items-center gap-2 p-3 rounded border border-border/50 text-xs">
                  <Badge variant="outline">{o.opportunity_type}</Badge>
                  <Badge variant="outline" className={OPP_STATUS_TONE[o.status] ?? ""}>{o.status}</Badge>
                  <span className="font-semibold">{fmtMoney(Number(o.estimated_value || 0), o.currency)}</span>
                  {o.due_at && <span className="text-muted-foreground">due {new Date(o.due_at).toLocaleDateString()}</span>}
                  <span className="text-muted-foreground">Urg {(Number(o.urgency_score) * 100).toFixed(0)}%</span>
                  <span className="ml-auto text-muted-foreground line-clamp-1 max-w-[40ch]">{o.trigger_reason}</span>
                </div>
              ))}
            </div>
          )}
        </CUSection>
      ))}
    </CULayout>
  );
}