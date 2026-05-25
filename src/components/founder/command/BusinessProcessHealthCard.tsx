import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Pillar = "sales" | "quote_to_cash" | "delivery" | "onboarding" | "support" | "finance" | "compliance" | "capacity";
type Status = "live" | "watch" | "risk" | "idle";

const TONE: Record<Status, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  watch: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  risk: "bg-red-500/15 text-red-400 border-red-500/30",
  idle: "bg-secondary/40 text-muted-foreground border-border/40",
};

const PILLAR_LABELS: Record<Pillar, string> = {
  sales: "Sales",
  quote_to_cash: "Quote-to-cash",
  delivery: "Delivery",
  onboarding: "Onboarding",
  support: "Support",
  finance: "Finance",
  compliance: "Compliance/Privacy",
  capacity: "Capacity",
};

interface BizRow {
  id: string;
  name: string;
  pillars: Record<Pillar, Status>;
  next_action: string;
}

function bucket(n: number, thresholds: { watch: number; risk: number }): Status {
  if (n >= thresholds.risk) return "risk";
  if (n >= thresholds.watch) return "watch";
  return n === 0 ? "live" : "live";
}

export default function BusinessProcessHealthCard() {
  const { data: rows = [] } = useQuery<BizRow[]>({
    queryKey: ["cc-business-process-health-v1"],
    refetchInterval: 60000,
    queryFn: async () => {
      const sb: any = supabase as any;
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [biz, deals, invoices, deliv, onb, support, complaints, vendors, privacy, capacity, bottlenecks] = await Promise.all([
        sb.from("businesses").select("id,name,status"),
        sb.from("deals").select("business_name,status").catch(() => ({ data: [] })),
        sb.from("invoices").select("business_id,status").catch(() => ({ data: [] })),
        sb.from("delivery_tasks").select("business_id,task_status").catch(() => ({ data: [] })),
        sb.from("onboarding_journeys").select("business_id,journey_status").catch(() => ({ data: [] })),
        sb.from("support_tickets").select("business_id,sla_status,ticket_status").catch(() => ({ data: [] })),
        sb.from("complaints").select("business_id,complaint_status").catch(() => ({ data: [] })),
        sb.from("vendor_contracts").select("business_id,contract_status").catch(() => ({ data: [] })),
        sb.from("privacy_requests").select("business_id,request_status").catch(() => ({ data: [] })),
        sb.from("capacity_plans").select("business_id,capacity_status").catch(() => ({ data: [] })),
        sb.from("bottleneck_alerts").select("business_id,severity,status").catch(() => ({ data: [] })),
      ].map((p: any) => (p?.catch ? p.catch(() => ({ data: [] })) : p)));

      const businesses = (biz?.data ?? []) as any[];

      return businesses.map((b: any) => {
        const dealsOpen = (deals.data ?? []).filter((d: any) => d.business_name === b.name && !["closed_won", "closed_lost"].includes(d.status)).length;
        const invOverdue = (invoices.data ?? []).filter((i: any) => i.business_id === b.id && ["overdue", "unpaid_past_due"].includes(i.status)).length;
        const delivBlocked = (deliv.data ?? []).filter((t: any) => t.business_id === b.id && ["blocked", "at_risk"].includes(t.task_status)).length;
        const onbStuck = (onb.data ?? []).filter((o: any) => o.business_id === b.id && ["stuck", "blocked"].includes(o.journey_status)).length;
        const supSlaRisk = (support.data ?? []).filter((s: any) => s.business_id === b.id && s.sla_status === "at_risk").length;
        const supBreached = (support.data ?? []).filter((s: any) => s.business_id === b.id && s.sla_status === "breached").length;
        const cmpOpen = (complaints.data ?? []).filter((c: any) => c.business_id === b.id && ["open", "investigating"].includes(c.complaint_status)).length;
        const privOpen = (privacy.data ?? []).filter((p: any) => p.business_id === b.id && !["completed", "rejected"].includes(p.request_status)).length;
        const capRows = (capacity.data ?? []).filter((c: any) => c.business_id === b.id);
        const capOver = capRows.filter((c: any) => c.capacity_status === "over_capacity").length;
        const capFull = capRows.filter((c: any) => c.capacity_status === "full").length;
        const btCritical = (bottlenecks.data ?? []).filter((bt: any) => bt.business_id === b.id && bt.status === "open" && bt.severity === "critical").length;

        const pillars: Record<Pillar, Status> = {
          sales: dealsOpen === 0 ? "idle" : "live",
          quote_to_cash: invOverdue > 2 ? "risk" : invOverdue > 0 ? "watch" : "live",
          delivery: delivBlocked > 0 ? (delivBlocked > 2 ? "risk" : "watch") : "live",
          onboarding: onbStuck > 0 ? "watch" : "live",
          support: supBreached > 0 ? "risk" : supSlaRisk > 0 ? "watch" : "live",
          finance: invOverdue > 0 ? "watch" : "live",
          compliance: privOpen > 0 || cmpOpen > 0 ? "watch" : "live",
          capacity: capOver > 0 || btCritical > 0 ? "risk" : capFull > 0 ? "watch" : "live",
        };

        let next_action = "All process pillars live. Continue daily operating loop.";
        if (pillars.capacity === "risk") next_action = "Capacity over limit — review bottlenecks & approve capacity actions.";
        else if (pillars.support === "risk") next_action = `${supBreached} SLA breach(es) — escalate support.`;
        else if (pillars.quote_to_cash === "risk") next_action = `${invOverdue} overdue invoice(s) — chase or escalate.`;
        else if (pillars.delivery === "risk") next_action = `${delivBlocked} delivery blockers — unblock to protect timeline.`;
        else if (pillars.compliance === "watch") next_action = `${privOpen + cmpOpen} privacy/complaint item(s) open.`;
        else if (pillars.onboarding === "watch") next_action = `${onbStuck} onboarding journey(s) stuck.`;
        else if (pillars.support === "watch") next_action = `${supSlaRisk} SLA at risk — action before breach.`;

        return { id: b.id, name: b.name, pillars, next_action };
      });
    },
  });

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          Business Process Health
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No businesses yet — process pillars activate as ventures launch.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-border/40 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{r.name}</p>
              <Link to="/founder/capacity" className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                Process spine <ArrowRight size={11} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(r.pillars) as Pillar[]).map((p) => (
                <Badge key={p} variant="outline" className={`${TONE[r.pillars[p]]} text-[10px]`}>
                  {PILLAR_LABELS[p]}: {r.pillars[p]}
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Next: {r.next_action}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}