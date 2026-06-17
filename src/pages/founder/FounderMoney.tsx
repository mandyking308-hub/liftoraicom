import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listLatestPaceAll, listSalesTargetsAll, loadCurrentRevenueRollup, calculatePace, savePaceCalculation,
} from "@/lib/commercialPace";

type Biz = { id: string; name: string };
type Row = {
  id: string; name: string;
  target?: any;
  pace?: any;
  rollup: { mtd: number; today: number; yesterday: number; mrr: number; arr: number; failed_payments: number; refunds: number; new_subs: number; renewed_subs: number; churned_subs: number };
};

export default function FounderMoney() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [form, setForm] = useState({ business_id: "", amount: "", event_type: "payment_succeeded", currency: "GBP", customer_reference: "" });

  async function refresh() {
    setLoading(true);
    try {
      const [{ data: bizs }, targets, pace, stripe] = await Promise.all([
        supabase.from("businesses").select("id, name").limit(200),
        listSalesTargetsAll(),
        listLatestPaceAll(),
        (supabase.from as any)("stripe_webhook_events").select("id", { count: "exact", head: true }).limit(1),
      ]);
      setStripeConnected(((stripe as any)?.count ?? 0) > 0);
      const businesses = (bizs as Biz[]) || [];
      const out: Row[] = [];
      for (const b of businesses) {
        const t = (targets as any[]).find((x: any) => x.business_id === b.id);
        const p = (pace as any[]).find((x: any) => x.business_id === b.id);
        const rollup = await loadCurrentRevenueRollup(b.id);
        out.push({ id: b.id, name: b.name, target: t, pace: p, rollup });
      }
      setRows(out.sort((a, b) => b.rollup.mtd - a.rollup.mtd));
    } catch { setRows([]); }
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  async function logManualEvent() {
    if (!form.business_id || !form.amount) { toast.error("Pick a business and amount."); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from as any)("business_revenue_events").insert({
        business_id: form.business_id,
        source: "manual",
        event_type: form.event_type,
        amount: Number(form.amount),
        currency: form.currency,
        customer_reference: form.customer_reference || null,
        occurred_at: new Date().toISOString(),
        created_by: user?.id ?? null,
      });
      toast.success("Revenue event recorded.");
      setForm({ ...form, amount: "", customer_reference: "" });
      void refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed to record event."); }
  }

  async function recalcPace(r: Row) {
    if (!r.target) { toast.error("Set a sales target first in the Setup Tunnel → Sales target & revenue pace."); return; }
    const p = calculatePace(r.target, r.rollup.mtd, r.rollup.mrr, r.rollup.arr);
    await savePaceCalculation(r.id, r.name, r.target.id, p);
    toast.success(`Recalculated. ${p.pace_status.toUpperCase()} · ${p.recommended_daily_action}`);
    void refresh();
  }

  const tot = rows.reduce((a, r) => ({
    mtd: a.mtd + r.rollup.mtd, mrr: a.mrr + r.rollup.mrr, arr: a.arr + r.rollup.arr,
    yesterday: a.yesterday + r.rollup.yesterday, today: a.today + r.rollup.today,
    failed: a.failed + r.rollup.failed_payments, refunds: a.refunds + r.rollup.refunds,
    new_subs: a.new_subs + r.rollup.new_subs, renewed: a.renewed + r.rollup.renewed_subs, churned: a.churned + r.rollup.churned_subs,
  }), { mtd: 0, mrr: 0, arr: 0, yesterday: 0, today: 0, failed: 0, refunds: 0, new_subs: 0, renewed: 0, churned: 0 });
  const fmt = (n: number) => Math.round(n).toLocaleString();
  const attention = rows.filter((r) => r.pace?.pace_status === "behind" || r.rollup.failed_payments > 0);

  return (
    <FounderLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Money — Founder Morning View</h1>
          <p className="text-sm text-muted-foreground mt-1">Founder/admin only. No external sending. Stripe data is read-only if connected; manual events are allowed.</p>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Overnight totals</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <Stat label="Last night" v={fmt(tot.yesterday)} />
            <Stat label="Today" v={fmt(tot.today)} />
            <Stat label="Month-to-date" v={fmt(tot.mtd)} />
            <Stat label="MRR (30d)" v={fmt(tot.mrr)} />
            <Stat label="ARR" v={fmt(tot.arr)} />
            <Stat label="New subs" v={String(tot.new_subs)} />
            <Stat label="Renewed" v={String(tot.renewed)} />
            <Stat label="Churned" v={String(tot.churned)} />
            <Stat label="Failed payments" v={String(tot.failed)} tone={tot.failed ? "warn" : ""} />
            <Stat label="Refunds" v={String(tot.refunds)} />
          </CardContent>
        </Card>

        {stripeConnected === false && (
          <Card className="border-amber-500/40">
            <CardContent className="py-3 text-xs text-amber-500">
              Stripe / payment feed not connected. Liftor will not fake revenue. Log manual events below for testing, or connect Stripe via /founder/quote-to-cash/payment-control-centre when founder approves.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Business-by-business revenue & pace</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {loading && <p className="text-muted-foreground">Loading…</p>}
            {!loading && rows.length === 0 && <p className="text-muted-foreground">No businesses yet.</p>}
            {rows.map((r) => (
              <div key={r.id} className="border border-border/40 rounded p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <div className="md:col-span-2">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-muted-foreground">{r.target ? `Target ${r.target.currency} ${fmt(Number(r.target.target_monthly_revenue))}/mo` : "No target set"}</div>
                </div>
                <div>MTD: <strong>{fmt(r.rollup.mtd)}</strong></div>
                <div>MRR: <strong>{fmt(r.rollup.mrr)}</strong></div>
                <div>
                  <Badge variant="outline" className={paceTone(r.pace?.pace_status)}>{r.pace?.pace_status ?? "not_ready"}</Badge>
                </div>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="outline" onClick={() => recalcPace(r)}>Recalc</Button>
                  <Button asChild size="sm" variant="ghost"><Link to={`/founder/business-setup-tunnel?mode=existing`}>Edit target</Link></Button>
                </div>
                {r.pace?.recommended_daily_action && (
                  <div className="md:col-span-6 text-muted-foreground border-t border-border/40 pt-1">
                    Next action: {r.pace.recommended_daily_action}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attention required</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {attention.length === 0 ? <p className="text-muted-foreground">Nothing flagged.</p>
              : attention.map((r) => (
                <div key={r.id}>• <strong>{r.name}</strong> — {r.pace?.pace_status === "behind" ? "behind pace" : ""}{r.rollup.failed_payments > 0 ? ` · ${r.rollup.failed_payments} failed payment(s)` : ""}</div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Record manual revenue event (testing / reconciliation)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs items-end">
            <div className="md:col-span-2">
              <Label>Business</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })}>
                <option value="">Select…</option>
                {rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                {["payment_succeeded", "subscription_created", "subscription_renewed", "subscription_failed", "invoice_paid", "invoice_failed", "refund", "churn", "manual_adjustment"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <div>
              <Label>Customer ref</Label>
              <Input value={form.customer_reference} onChange={(e) => setForm({ ...form, customer_reference: e.target.value })} />
            </div>
            <div className="md:col-span-6">
              <Button size="sm" onClick={logManualEvent}>Record event</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/founder/business-setup-tunnel">Open setup tunnel</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/founder/daily-operator">Daily operator</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/founder/copilot">Ask Liftor</Link></Button>
        </div>
      </div>
    </FounderLayout>
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

function paceTone(s?: string): string {
  if (s === "ahead") return "text-emerald-500";
  if (s === "on_track") return "text-emerald-500";
  if (s === "behind") return "text-amber-500";
  return "text-muted-foreground";
}