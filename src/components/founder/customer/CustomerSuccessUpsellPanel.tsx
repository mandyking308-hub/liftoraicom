import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShieldAlert } from "lucide-react";

export default function CustomerSuccessUpsellPanel({ businessId }: { businessId?: string | null }) {
  const { data } = useQuery({
    queryKey: ['customer-success-upsell', businessId ?? null],
    queryFn: async () => {
      let plansQ = supabase.from('customer_success_plans').select('id, plan_status, customer_goal, risks, next_best_actions, follow_up_due_at, business_id').limit(200);
      let recsQ = supabase.from('customer_upsell_recommendations').select('id, recommendation_status, fit_score, reason, customer_need_matched, suggested_timing, business_id').limit(200);
      let pkgQ = supabase.from('customer_package_catalog').select('id, package_name, package_type, active, business_id').limit(100);
      if (businessId) { plansQ = plansQ.eq('business_id', businessId); recsQ = recsQ.eq('business_id', businessId); pkgQ = pkgQ.eq('business_id', businessId); }
      const [plans, recs, pkgs] = await Promise.all([plansQ, recsQ, pkgQ]);
      return { plans: plans.data ?? [], recs: recs.data ?? [], pkgs: pkgs.data ?? [] };
    },
    staleTime: 30_000,
  });

  const plans = data?.plans ?? [];
  const recs = data?.recs ?? [];
  const pkgs = data?.pkgs ?? [];
  const activePlans = plans.filter((p: any) => p.plan_status === 'active').length;
  const atRisk = plans.filter((p: any) => Array.isArray(p.risks) && p.risks.length > 0).length;
  const followUpDue = plans.filter((p: any) => p.follow_up_due_at && new Date(p.follow_up_due_at) <= new Date()).length;
  const pending = recs.filter((r: any) => r.recommendation_status === 'pending').length;
  const approved = recs.filter((r: any) => r.recommendation_status === 'approved').length;

  const Tile = ({ label, value }: any) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-customer-success">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><TrendingUp size={14} className="text-primary" /> Customer Success & Upsell Engine</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]"><ShieldAlert size={10} className="mr-1" /> No auto-send · Founder approval required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Tile label="Active success plans" value={activePlans} />
          <Tile label="Customers at risk" value={atRisk} />
          <Tile label="Follow-ups due" value={followUpDue} />
          <Tile label="Packages in catalog" value={pkgs.length} />
          <Tile label="Upsell recommendations" value={recs.length} />
          <Tile label="Pending approval" value={pending} />
          <Tile label="Approved" value={approved} />
          <Tile label="Retention risks" value={atRisk} />
        </div>
        <div className="text-xs font-medium mb-1">Top upsell opportunities</div>
        {recs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No recommendations yet.</p>
        ) : recs.slice(0, 5).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between text-[11px] border-b border-border/30 py-1">
            <span className="truncate">{r.customer_need_matched ?? r.reason ?? 'Recommendation'}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{r.suggested_timing ?? '—'}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{r.fit_score != null ? `${Math.round(Number(r.fit_score)*100)}%` : '—'}</Badge>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${r.recommendation_status === 'approved' ? 'border-green-500/40 text-green-300' : 'border-yellow-500/40 text-yellow-300'}`}>{r.recommendation_status}</Badge>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground mt-3">Customer Success Agent runs preview-only. Pricing changes, invoices and external messages all require founder approval.</p>
      </CardContent>
    </Card>
  );
}