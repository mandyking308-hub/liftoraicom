import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CULayout, CUSection, fmtMoney } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Layers, Repeat, ListChecks, Send, Flame, ClipboardCheck } from "lucide-react";

function Tile({ to, icon: Icon, label, value, hint }: any) {
  return (
    <Link to={to} className="group block rounded-lg border border-border/60 bg-background/40 p-3 hover:border-primary/60 transition">
      <div className="flex items-start justify-between"><Icon size={14} className="text-primary" /><ArrowRight size={12} className="opacity-60 group-hover:opacity-100" /></div>
      <p className="mt-1.5 text-2xl font-bold leading-none">{value ?? 0}</p>
      <p className="text-[11px] mt-1">{label}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </Link>
  );
}

export default function CustomerUpgradesHub() {
  const sb: any = supabase as any;
  const { data } = useQuery({
    queryKey: ["cu-hub"],
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [opps, hot, approval, ladders, rules, wonOpps] = await Promise.all([
        sb.from("customer_upgrade_opportunities").select("id", head).in("status", ["new", "watch"]),
        sb.from("customer_upgrade_opportunities").select("id", head).gte("urgency_score", 0.7).in("status", ["new", "watch", "approval_required"]),
        sb.from("customer_upgrade_opportunities").select("id", head).eq("status", "approval_required"),
        sb.from("product_upgrade_ladders").select("id", head).eq("active", true),
        sb.from("customer_upgrade_rules").select("id", head).eq("active", true),
        sb.from("customer_upgrade_opportunities").select("estimated_value,currency,status"),
      ].map((p: any) => p.catch(() => ({ count: 0, data: [] }))));
      const won = (wonOpps.data ?? []).filter((o: any) => o.status === "won");
      const pipeline = (wonOpps.data ?? []).filter((o: any) => !["won", "lost", "parked"].includes(o.status));
      return {
        opps: opps.count ?? 0,
        hot: hot.count ?? 0,
        approval: approval.count ?? 0,
        ladders: ladders.count ?? 0,
        rules: rules.count ?? 0,
        wonValue: won.reduce((s: number, o: any) => s + Number(o.estimated_value || 0), 0),
        pipelineValue: pipeline.reduce((s: number, o: any) => s + Number(o.estimated_value || 0), 0),
      };
    },
  });

  return (
    <CULayout
      title="Customer Upgrade + Upsell Engine"
      subtitle="Identify upgrades, cross-sells, renewals and add-ons. Internal analysis runs live. External customer contact stays approval-gated."
    >
      <CUSection title="Operating snapshot">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile to="/founder/customer-upgrades/opportunities" icon={TrendingUp} label="Open opportunities" value={data?.opps} />
          <Tile to="/founder/customer-upgrades/opportunities" icon={Flame} label="Hot (urgency ≥ 0.7)" value={data?.hot} />
          <Tile to="/founder/customer-upgrades/follow-up" icon={ClipboardCheck} label="Awaiting approval" value={data?.approval} hint="external send locked" />
          <Tile to="/founder/customer-upgrades/product-ladders" icon={Layers} label="Active ladders" value={data?.ladders} />
          <Tile to="/founder/customer-upgrades/upgrade-rules" icon={ListChecks} label="Active rules" value={data?.rules} />
          <Tile to="/founder/customer-upgrades/renewals" icon={Repeat} label="Renewal queue" value={"→"} />
          <Tile to="/founder/customer-upgrades/opportunities" icon={Send} label="Pipeline value" value={fmtMoney(data?.pipelineValue ?? 0)} />
          <Tile to="/founder/customer-upgrades/opportunities" icon={TrendingUp} label="Won (verified)" value={fmtMoney(data?.wonValue ?? 0)} hint="payment/contract confirmed" />
        </div>
      </CUSection>

      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-3 text-[11px] text-yellow-100">
          Liftor will not invent upgrade prices, invent claims, or push upgrades to customers with open complaints. External upgrade messages, payment links, subscription changes and contract changes remain locked until approved. Confirmed upgrade revenue requires verified payment, subscription event or signed contract.
        </CardContent>
      </Card>
    </CULayout>
  );
}