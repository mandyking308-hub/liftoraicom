import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listLatestPaceAll, listSalesTargetsAll } from "@/lib/commercialPace";

type Snap = { biz: string; mtd: number; today: number; yesterday: number; mrr: number; arr: number; failed: number; refunds: number; new_subs: number; renewed: number; pace: string };

export default function MoneyOvernightCard() {
  const [rows, setRows] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: bizs }, { data: events }, targets, pace] = await Promise.all([
          supabase.from("businesses").select("id, name").limit(200),
          (supabase.from as any)("business_revenue_events").select("business_id, event_type, amount, occurred_at").gte("occurred_at", new Date(Date.now() - 35 * 86400000).toISOString()),
          listSalesTargetsAll(),
          listLatestPaceAll(),
        ]);
        const businesses = (bizs as any[]) || [];
        const evs = (events as any[]) || [];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfYday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        const isRev = (t: string) => ["payment_succeeded", "subscription_created", "subscription_renewed", "invoice_paid"].includes(t);
        const snaps: Snap[] = businesses.map((b) => {
          const mine = evs.filter((e) => e.business_id === b.id);
          let mtd = 0, today = 0, yesterday = 0, mrr = 0, failed = 0, refunds = 0, new_subs = 0, renewed = 0;
          for (const r of mine) {
            const amt = Number(r.amount) || 0;
            if (isRev(r.event_type)) {
              if (r.occurred_at >= startOfMonth) mtd += amt;
              if (r.occurred_at >= startOfDay) today += amt;
              else if (r.occurred_at >= startOfYday) yesterday += amt;
              if (["subscription_created", "subscription_renewed"].includes(r.event_type)) mrr += amt;
            }
            if (r.event_type === "subscription_created") new_subs++;
            if (r.event_type === "subscription_renewed") renewed++;
            if (r.event_type === "refund") refunds++;
            if (["subscription_failed", "invoice_failed"].includes(r.event_type)) failed++;
          }
          const p = (pace as any[]).find((x: any) => x.business_id === b.id);
          return { biz: b.name, mtd, today, yesterday, mrr, arr: mrr * 12, failed, refunds, new_subs, renewed, pace: p?.pace_status ?? "not_ready" };
        });
        setRows(snaps.sort((a, b) => b.mtd - a.mtd));
      } catch { setRows([]); }
      setLoading(false);
    })();
  }, []);

  const tot = rows.reduce((a, b) => ({
    mtd: a.mtd + b.mtd, today: a.today + b.today, yesterday: a.yesterday + b.yesterday,
    mrr: a.mrr + b.mrr, arr: a.arr + b.arr, failed: a.failed + b.failed, refunds: a.refunds + b.refunds,
    new_subs: a.new_subs + b.new_subs, renewed: a.renewed + b.renewed,
  }), { mtd: 0, today: 0, yesterday: 0, mrr: 0, arr: 0, failed: 0, refunds: 0, new_subs: 0, renewed: 0 });
  const fmt = (n: number) => Math.round(n).toLocaleString();
  const behind = rows.filter((r) => r.pace === "behind").map((r) => r.biz);
  const topBiz = rows[0]?.biz ?? "—";
  const nextAction = behind.length
    ? `Push pace on ${behind.slice(0, 3).join(", ")} today. Drafts only — no external sending without founder approval.`
    : tot.mtd === 0
      ? "No revenue events recorded yet. Connect Stripe or log manual events in /founder/money."
      : "Maintain pace and protect margin.";

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="border-emerald-500/40">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Money Overnight</CardTitle>
          <Button asChild size="sm" variant="outline"><Link to="/founder/money">Open Money view</Link></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <Stat label="Last night" v={fmt(tot.yesterday)} />
                <Stat label="Today" v={fmt(tot.today)} />
                <Stat label="Month-to-date" v={fmt(tot.mtd)} />
                <Stat label="MRR (30d)" v={fmt(tot.mrr)} />
                <Stat label="ARR" v={fmt(tot.arr)} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <Stat label="New subs" v={String(tot.new_subs)} />
                <Stat label="Renewed" v={String(tot.renewed)} />
                <Stat label="Failed payments" v={String(tot.failed)} tone={tot.failed ? "warn" : ""} />
                <Stat label="Refunds" v={String(tot.refunds)} />
                <Stat label="Top business" v={topBiz} />
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className={behind.length ? "text-amber-500" : "text-muted-foreground"}>
                  {behind.length} behind pace
                </Badge>
                <p className="text-muted-foreground">{nextAction}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, v, tone }: { label: string; v: string; tone?: string }) {
  return (
    <div className="rounded border border-border/50 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${tone === "warn" ? "text-amber-500" : ""}`}>{v}</div>
    </div>
  );
}