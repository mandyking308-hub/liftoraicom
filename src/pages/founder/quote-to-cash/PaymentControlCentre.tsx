import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QTCLayout, QTCSection, QTCEmpty } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Download, FileDown, Lock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------- types ----------
type Pay = {
  id: string;
  business_id: string | null;
  business_name_snapshot: string | null;
  brand_name: string | null;
  website_url: string | null;
  saleable_asset_group: string | null;
  legal_entity: string | null;
  revenue_owner_entity: string | null;
  payment_status: string;
  amount: number | null;
  gross_amount: number | null;
  tax_amount: number | null;
  stripe_fee_amount: number | null;
  net_amount: number | null;
  refund_amount: number | null;
  currency: string | null;
  customer_country: string | null;
  customer_state_region: string | null;
  tax_type: string | null;
  tax_jurisdiction: string | null;
  tax_reporting_period: string | null;
  tax_collected: number | null;
  tax_remittance_status: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_subscription_id: string | null;
  webhook_confirmation_source: string | null;
  stripe_test_mode: boolean | null;
  is_test_data: boolean | null;
  confirmed_revenue: boolean | null;
  sale_ready: boolean | null;
  temporary_payout_account_used: boolean | null;
  temporary_payout_reason: string | null;
  transfer_required_to_primary_account: boolean | null;
  payout_account_status: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reconciliation_notes: string | null;
  contact_id: string | null;
  received_at: string | null;
  created_at: string;
};

type Hook = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  processing_status: string;
  processing_error: string | null;
  received_at: string;
  processed_at: string | null;
  payload: any;
};

const fmt = (n: number | null | undefined, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: (cur || "USD").toUpperCase() }).format(Number(n ?? 0));

// ---------- page ----------
export default function PaymentControlCentre() {
  const [pays, setPays] = useState<Pay[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [stripeCfg, setStripeCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [{ data: p }, { data: h }, cfg] = await Promise.all([
      supabase.from("qtc_payments").select("*").order("created_at", { ascending: false }).limit(5000),
      supabase.from("stripe_webhook_events").select("*").order("received_at", { ascending: false }).limit(100),
      supabase.functions.invoke("stripe-config-status", { body: {} }),
    ]);
    setPays((p as Pay[]) || []);
    setHooks((h as Hook[]) || []);
    setStripeCfg((cfg?.data as any) ?? null);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const real = useMemo(() => pays.filter(p => !p.is_test_data), [pays]);
  const stripeReady = !!(stripeCfg?.secret_key_configured && stripeCfg?.webhook_secret_configured && stripeCfg?.mode === "test");

  return (
    <QTCLayout
      title="Payment Control Centre"
      subtitle="Founder view of revenue, exceptions, tax, temporary payouts, and Stripe webhook health — labelled by business so each venture is sale-ready."
      actions={
        <Badge variant="outline" className={`text-[10px] ${stripeReady ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
          <Lock size={9} className="mr-1" /> Stripe {stripeCfg?.mode ?? "unknown"} mode · live charging locked
        </Badge>
      }
    >
      <Tabs defaultValue="revenue">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="revenue">Revenue by business</TabsTrigger>
          <TabsTrigger value="exceptions">Payment exceptions</TabsTrigger>
          <TabsTrigger value="tax">Tax collection</TabsTrigger>
          <TabsTrigger value="payouts">Temporary payouts</TabsTrigger>
          <TabsTrigger value="webhooks">Stripe webhook health</TabsTrigger>
          <TabsTrigger value="saleability">Saleability pack</TabsTrigger>
          <TabsTrigger value="golive">Go-live readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <RevenueByBusiness real={real} loading={loading} />
        </TabsContent>
        <TabsContent value="exceptions" className="mt-4">
          <PaymentExceptions pays={pays} hooks={hooks} />
        </TabsContent>
        <TabsContent value="tax" className="mt-4">
          <TaxCollection pays={real} />
        </TabsContent>
        <TabsContent value="payouts" className="mt-4">
          <TemporaryPayouts pays={pays} reload={reload} />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-4">
          <WebhookHealth hooks={hooks} />
        </TabsContent>
        <TabsContent value="saleability" className="mt-4">
          <SaleabilityPack real={real} />
        </TabsContent>
        <TabsContent value="golive" className="mt-4">
          <GoLiveChecklist stripeCfg={stripeCfg} pays={pays} hooks={hooks} />
        </TabsContent>
      </Tabs>
    </QTCLayout>
  );
}

// ---------- Revenue by business ----------
type BizAgg = {
  business_id: string;
  business_name: string;
  brand_name: string;
  website_url: string;
  saleable_asset_group: string;
  legal_entity: string;
  revenue_owner_entity: string;
  active_subscriptions: number;
  gross: number;
  tax: number;
  refunds: number;
  stripe_fees: number;
  net: number;
  confirmed: number;
  sale_ready_revenue: number;
  test_excluded: number;
  temporary_payout: boolean;
  transfer_pending: boolean;
  missing_fields: string[];
  currency: string;
};

function aggregate(real: Pay[], allPays: Pay[]): BizAgg[] {
  const groups = new Map<string, Pay[]>();
  for (const p of real) {
    const key = p.business_id ?? `__no_business__`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const testByBusiness = new Map<string, number>();
  for (const p of allPays.filter(x => x.is_test_data)) {
    const k = p.business_id ?? "__no_business__";
    testByBusiness.set(k, (testByBusiness.get(k) ?? 0) + Number(p.gross_amount ?? 0));
  }

  return Array.from(groups.entries()).map(([bid, rows]) => {
    const subs = new Set(rows.filter(r => r.stripe_subscription_id).map(r => r.stripe_subscription_id));
    const gross = rows.reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);
    const tax = rows.reduce((s, r) => s + Number(r.tax_amount ?? 0), 0);
    const refunds = rows.reduce((s, r) => s + Number(r.refund_amount ?? 0), 0);
    const fees = rows.reduce((s, r) => s + Number(r.stripe_fee_amount ?? 0), 0);
    const net = rows.reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
    const confirmed = rows.filter(r => r.confirmed_revenue).reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);
    const saleRdy = rows.filter(r => r.sale_ready).reduce((s, r) => s + Number(r.gross_amount ?? 0), 0);
    const first = rows[0];
    const missing: string[] = [];
    if (!bid || bid === "__no_business__") missing.push("business_id");
    if (rows.some(r => !r.legal_entity)) missing.push("legal_entity");
    if (rows.some(r => !r.saleable_asset_group)) missing.push("saleable_asset_group");

    return {
      business_id: bid,
      business_name: first?.business_name_snapshot ?? "—",
      brand_name: first?.brand_name ?? "—",
      website_url: first?.website_url ?? "",
      saleable_asset_group: first?.saleable_asset_group ?? "—",
      legal_entity: first?.legal_entity ?? "—",
      revenue_owner_entity: first?.revenue_owner_entity ?? "—",
      active_subscriptions: subs.size,
      gross, tax, refunds, stripe_fees: fees, net, confirmed, sale_ready_revenue: saleRdy,
      test_excluded: testByBusiness.get(bid) ?? 0,
      temporary_payout: rows.some(r => r.temporary_payout_account_used),
      transfer_pending: rows.some(r => r.transfer_required_to_primary_account),
      missing_fields: missing,
      currency: first?.currency ?? "USD",
    };
  }).sort((a, b) => b.gross - a.gross);
}

function RevenueByBusiness({ real, loading }: { real: Pay[]; loading: boolean }) {
  const aggs = useMemo(() => aggregate(real, real), [real]);

  const exportCsv = () => {
    const headers = ["business_id","business","brand","website","saleable_asset_group","legal_entity","revenue_owner_entity","active_subs","gross","tax","refunds","stripe_fees","net","confirmed","sale_ready_revenue","temp_payout","transfer_pending","missing"];
    const rows = aggs.map(a => [a.business_id, a.business_name, a.brand_name, a.website_url, a.saleable_asset_group, a.legal_entity, a.revenue_owner_entity, a.active_subscriptions, a.gross, a.tax, a.refunds, a.stripe_fees, a.net, a.confirmed, a.sale_ready_revenue, a.temporary_payout, a.transfer_pending, a.missing_fields.join("|")]);
    downloadCsv("revenue_by_business.csv", [headers, ...rows]);
  };

  return (
    <QTCSection title={`Revenue by business (${aggs.length})`} description="Test data excluded from totals. Temporary payouts visible but not auto-sale-ready." actions={<Button size="sm" variant="outline" onClick={exportCsv}><Download size={12} className="mr-1" />CSV</Button>}>
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
       aggs.length === 0 ? <QTCEmpty title="No real revenue yet" hint="Create a Stripe test checkout from any business to populate this view." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="p-2">Business</th>
                <th className="p-2">Legal / Group</th>
                <th className="p-2 text-right">Subs</th>
                <th className="p-2 text-right">Gross</th>
                <th className="p-2 text-right">Tax</th>
                <th className="p-2 text-right">Refunds</th>
                <th className="p-2 text-right">Stripe fees</th>
                <th className="p-2 text-right">Net</th>
                <th className="p-2 text-right">Sale-ready</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {aggs.map(a => (
                <tr key={a.business_id} className="border-t border-border/40 align-top">
                  <td className="p-2">
                    <div className="font-medium">{a.business_name}</div>
                    <div className="text-[10px] text-muted-foreground">{a.brand_name} · {a.website_url}</div>
                  </td>
                  <td className="p-2 text-[11px]">
                    <div>{a.legal_entity}</div>
                    <div className="text-muted-foreground">{a.saleable_asset_group}</div>
                  </td>
                  <td className="p-2 text-right">{a.active_subscriptions}</td>
                  <td className="p-2 text-right">{fmt(a.gross, a.currency)}</td>
                  <td className="p-2 text-right">{fmt(a.tax, a.currency)}</td>
                  <td className="p-2 text-right">{fmt(a.refunds, a.currency)}</td>
                  <td className="p-2 text-right">{fmt(a.stripe_fees, a.currency)}</td>
                  <td className="p-2 text-right font-semibold">{fmt(a.net, a.currency)}</td>
                  <td className="p-2 text-right">{fmt(a.sale_ready_revenue, a.currency)}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {a.missing_fields.length === 0
                        ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">clean</Badge>
                        : <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">missing {a.missing_fields.join(", ")}</Badge>}
                      {a.temporary_payout && <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">temp payout</Badge>}
                      {a.transfer_pending && <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">transfer pending</Badge>}
                      {a.test_excluded > 0 && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{fmt(a.test_excluded, a.currency)} test excluded</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </QTCSection>
  );
}

// ---------- Exceptions ----------
type Exc = { business: string; payment_id: string; stripe: string; issue: string; fix: string; severity: "high" | "med" | "low" };

function buildExceptions(pays: Pay[], hooks: Hook[]): Exc[] {
  const out: Exc[] = [];
  for (const p of pays) {
    const biz = p.business_name_snapshot ?? p.business_id ?? "—";
    const stripeIds = [p.stripe_checkout_session_id && `cs:${p.stripe_checkout_session_id}`, p.stripe_payment_intent_id && `pi:${p.stripe_payment_intent_id}`, p.stripe_invoice_id && `in:${p.stripe_invoice_id}`].filter(Boolean).join(" ");
    if (!p.business_id) out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "missing business_id", fix: "Attach payment to a business", severity: "high" });
    if (!p.legal_entity) out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "missing legal_entity", fix: "Set legal_entity (default GSM_LLC)", severity: "high" });
    if (!p.saleable_asset_group) out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "missing saleable_asset_group", fix: "Tag the business with a saleable asset group", severity: "med" });
    if (p.temporary_payout_account_used) out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "temporary payout account used", fix: "Reconcile and mark in Temporary payouts tab", severity: "med" });
    if (p.transfer_required_to_primary_account) out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "transfer to GSM primary pending", fix: "Move funds to primary account, then mark reconciled", severity: "high" });
    if ((p.payment_status === "succeeded") && (p.tax_amount == null || Number(p.tax_amount) === 0) && !p.tax_type)
      out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "tax amount missing", fix: "Confirm zero-rated or capture tax from Stripe Tax", severity: "low" });
    if (p.payment_status === "succeeded" && !p.webhook_confirmation_source && !p.is_test_data)
      out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "manually marked succeeded — no Stripe verification", fix: "Verify via Stripe webhook or document override reason", severity: "high" });
    if (!p.sale_ready && !p.is_test_data)
      out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "not sale_ready", fix: "Resolve missing fields and reconcile payout", severity: "med" });
    if (p.is_test_data)
      out.push({ business: biz, payment_id: p.id, stripe: stripeIds, issue: "test payment excluded from revenue", fix: "No action — test data is excluded by design", severity: "low" });
  }
  // webhook health exceptions
  const seen = new Map<string, number>();
  for (const h of hooks) seen.set(h.stripe_event_id, (seen.get(h.stripe_event_id) ?? 0) + 1);
  for (const h of hooks) {
    if (h.processing_status === "error") out.push({ business: "—", payment_id: h.id, stripe: h.stripe_event_id, issue: `webhook error: ${h.processing_error ?? "unknown"}`, fix: "Inspect edge function logs and replay event", severity: "high" });
    if ((seen.get(h.stripe_event_id) ?? 0) > 1) out.push({ business: "—", payment_id: h.id, stripe: h.stripe_event_id, issue: "duplicate webhook event row", fix: "Idempotency held — review duplicate", severity: "low" });
    if (!h.processed_at && h.processing_status !== "error") out.push({ business: "—", payment_id: h.id, stripe: h.stripe_event_id, issue: "unprocessed webhook event", fix: "Retry handler", severity: "med" });
  }
  return out;
}

function PaymentExceptions({ pays, hooks }: { pays: Pay[]; hooks: Hook[] }) {
  const exc = useMemo(() => buildExceptions(pays, hooks), [pays, hooks]);
  const exportCsv = () => downloadCsv("payment_exceptions.csv", [["business","payment_id","stripe","issue","fix","severity"], ...exc.map(e => [e.business, e.payment_id, e.stripe, e.issue, e.fix, e.severity])]);
  return (
    <QTCSection title={`Payment exceptions (${exc.length})`} description="Every issue blocking sale-readiness, in one list." actions={<Button size="sm" variant="outline" onClick={exportCsv}><Download size={12} className="mr-1" />CSV</Button>}>
      {exc.length === 0 ? <QTCEmpty title="No exceptions" hint="Every payment row is labelled and verified." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr><th className="p-2">Business</th><th className="p-2">Payment</th><th className="p-2">Stripe</th><th className="p-2">Issue</th><th className="p-2">Recommended fix</th><th className="p-2">Severity</th></tr>
            </thead>
            <tbody>
              {exc.map((e, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="p-2">{e.business}</td>
                  <td className="p-2 font-mono text-[10px]">{e.payment_id.slice(0,8)}</td>
                  <td className="p-2 font-mono text-[10px] break-all">{e.stripe}</td>
                  <td className="p-2">{e.issue}</td>
                  <td className="p-2 text-muted-foreground">{e.fix}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={`text-[10px] ${e.severity === "high" ? "bg-red-500/15 text-red-400 border-red-500/30" : e.severity === "med" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>{e.severity}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </QTCSection>
  );
}

// ---------- Tax ----------
function TaxCollection({ pays }: { pays: Pay[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, { business: string; country: string; region: string; tax_type: string; tax_jurisdiction: string; period: string; collected: number; remittance: string }>();
    for (const p of pays) {
      const k = [p.business_id, p.customer_country, p.customer_state_region, p.tax_type, p.tax_jurisdiction, p.tax_reporting_period].join("|");
      const cur = m.get(k) ?? {
        business: p.business_name_snapshot ?? "—",
        country: p.customer_country ?? "—",
        region: p.customer_state_region ?? "—",
        tax_type: p.tax_type ?? "—",
        tax_jurisdiction: p.tax_jurisdiction ?? "—",
        period: p.tax_reporting_period ?? "—",
        collected: 0,
        remittance: p.tax_remittance_status ?? "not_remitted",
      };
      cur.collected += Number(p.tax_collected ?? p.tax_amount ?? 0);
      m.set(k, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.collected - a.collected);
  }, [pays]);

  const exportCsv = () => downloadCsv("tax_collection.csv", [["business","country","region","tax_type","jurisdiction","period","collected","remittance_status"], ...groups.map(g => [g.business, g.country, g.region, g.tax_type, g.tax_jurisdiction, g.period, g.collected, g.remittance])]);

  return (
    <QTCSection title={`Tax collection (${groups.length} groups)`} description="Reporting only — Liftor does not file or remit tax automatically." actions={<Button size="sm" variant="outline" onClick={exportCsv}><Download size={12} className="mr-1" />CSV</Button>}>
      {groups.length === 0 ? <QTCEmpty title="No tax collected yet" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left"><tr>
              <th className="p-2">Business</th><th className="p-2">Country</th><th className="p-2">Region</th><th className="p-2">Tax type</th><th className="p-2">Jurisdiction</th><th className="p-2">Period</th><th className="p-2 text-right">Collected</th><th className="p-2">Remittance</th>
            </tr></thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="p-2">{g.business}</td><td className="p-2">{g.country}</td><td className="p-2">{g.region}</td><td className="p-2">{g.tax_type}</td><td className="p-2">{g.tax_jurisdiction}</td><td className="p-2">{g.period}</td>
                  <td className="p-2 text-right">{fmt(g.collected)}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">{g.remittance}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </QTCSection>
  );
}

// ---------- Temporary payouts ----------
function TemporaryPayouts({ pays, reload }: { pays: Pay[]; reload: () => void }) {
  const rows = useMemo(() => pays.filter(p => p.temporary_payout_account_used), [pays]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const totals = useMemo(() => ({
    gross: rows.reduce((s, r) => s + Number(r.gross_amount ?? 0), 0),
    tax: rows.reduce((s, r) => s + Number(r.tax_amount ?? 0), 0),
    net: rows.reduce((s, r) => s + Number(r.net_amount ?? 0), 0),
  }), [rows]);

  const mark = async (payment_id: string, reconciled: boolean) => {
    const { error } = await supabase.functions.invoke("qtc-mark-reconciled", { body: { payment_id, reconciled, notes } });
    if (error) toast.error(error.message); else { toast.success(reconciled ? "Marked reconciled" : "Unmarked"); setOpenId(null); setNotes(""); reload(); }
  };

  return (
    <QTCSection title={`Temporary payout ledger (${rows.length})`} description="Rows paid into temporary accounts. Funds must be transferred to the GSM primary account before they count as sale-ready.">
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <Card className="tech-card"><CardContent className="py-3"><p className="text-muted-foreground">Gross via temp</p><p className="text-lg font-bold">{fmt(totals.gross)}</p></CardContent></Card>
        <Card className="tech-card"><CardContent className="py-3"><p className="text-muted-foreground">Tax inside temp</p><p className="text-lg font-bold">{fmt(totals.tax)}</p></CardContent></Card>
        <Card className="tech-card"><CardContent className="py-3"><p className="text-muted-foreground">Net to transfer</p><p className="text-lg font-bold text-orange-400">{fmt(totals.net)}</p></CardContent></Card>
      </div>
      {rows.length === 0 ? <QTCEmpty title="No temporary payouts" /> : (
        <div className="space-y-2 text-xs">
          {rows.map(p => (
            <div key={p.id} className="p-3 rounded border border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{p.business_name_snapshot ?? p.business_id}</p>
                  <p className="text-[10px] text-muted-foreground">{p.brand_name} · {fmt(p.gross_amount, p.currency ?? undefined)} · payout status: {p.payout_account_status ?? "n/a"}</p>
                  {p.temporary_payout_reason && <p className="text-[10px] text-muted-foreground italic">reason: {p.temporary_payout_reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {p.reconciled_at
                    ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">reconciled {new Date(p.reconciled_at).toLocaleDateString()}</Badge>
                    : <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">pending</Badge>}
                  {p.transfer_required_to_primary_account && <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">transfer required</Badge>}
                  {!p.sale_ready && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">not sale-ready</Badge>}
                  <Button size="sm" variant="outline" onClick={() => { setOpenId(p.id); setNotes(p.reconciliation_notes ?? ""); }}>{p.reconciled_at ? "Update / unmark" : "Mark reconciled"}</Button>
                </div>
              </div>
              {p.reconciliation_notes && <p className="text-[10px] text-muted-foreground mt-1">notes: {p.reconciliation_notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setNotes(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark payment as reconciled</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Marks the temporary payout as reconciled and writes an audit record. This does not override sale_ready — that's still controlled by the qtc_payments trigger.</p>
          <Textarea placeholder="Reconciliation notes (transfer reference, bank statement line, etc.)" value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" rows={4} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => openId && mark(openId, false)}>Unmark reconciled</Button>
            <Button onClick={() => openId && mark(openId, true)}>Mark reconciled</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </QTCSection>
  );
}

// ---------- Webhook health ----------
function WebhookHealth({ hooks }: { hooks: Hook[] }) {
  const seen = new Map<string, number>();
  for (const h of hooks) seen.set(h.stripe_event_id, (seen.get(h.stripe_event_id) ?? 0) + 1);
  return (
    <QTCSection title={`Stripe webhook health (${hooks.length})`} description="Last 100 verified webhook events.">
      {hooks.length === 0 ? <QTCEmpty title="No webhook events yet" hint="Trigger a test Stripe event to populate this view." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left"><tr>
              <th className="p-2">Type</th><th className="p-2">Event ID</th><th className="p-2">Status</th><th className="p-2">Mode</th><th className="p-2">business_id</th><th className="p-2">legal_entity</th><th className="p-2">group</th><th className="p-2">received</th><th className="p-2">processed</th>
            </tr></thead>
            <tbody>
              {hooks.map(h => {
                const meta = h.payload?.data?.object?.metadata ?? {};
                const dup = (seen.get(h.stripe_event_id) ?? 1) > 1;
                return (
                  <tr key={h.id} className="border-t border-border/40 align-top">
                    <td className="p-2 font-mono text-[10px]">{h.event_type}</td>
                    <td className="p-2 font-mono text-[10px]">{h.stripe_event_id}</td>
                    <td className="p-2">
                      <Badge variant="outline" className={`text-[10px] ${h.processing_status === "processed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : h.processing_status === "error" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>{h.processing_status}</Badge>
                      {dup && <Badge variant="outline" className="ml-1 text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">dup</Badge>}
                      {h.processing_error && <p className="text-[10px] text-red-400 mt-1">{h.processing_error}</p>}
                    </td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${h.livemode ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"}`}>{h.livemode ? "LIVE" : "test"}</Badge></td>
                    <td className="p-2">{meta.business_id ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}</td>
                    <td className="p-2">{meta.legal_entity ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}</td>
                    <td className="p-2">{meta.saleable_asset_group ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}</td>
                    <td className="p-2 text-[10px]">{new Date(h.received_at).toLocaleString()}</td>
                    <td className="p-2 text-[10px]">{h.processed_at ? new Date(h.processed_at).toLocaleString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </QTCSection>
  );
}

// ---------- Saleability pack ----------
function SaleabilityPack({ real }: { real: Pay[] }) {
  const aggs = useMemo(() => aggregate(real, real), [real]);
  const [selected, setSelected] = useState<string>("");
  const biz = aggs.find(a => a.business_id === selected) ?? aggs[0];

  useEffect(() => { if (!selected && aggs[0]) setSelected(aggs[0].business_id); }, [aggs, selected]);

  if (!biz) return <QTCSection title="Saleability pack"><QTCEmpty title="No businesses to summarise yet" /></QTCSection>;

  const rows = real.filter(p => p.business_id === biz.business_id);
  const subs = new Set(rows.filter(r => r.stripe_subscription_id).map(r => r.stripe_subscription_id));
  const customerCount = new Set(rows.map(r => r.contact_id).filter(Boolean)).size;
  const mrr = rows.filter(r => r.stripe_subscription_id).reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
  const exceptions = buildExceptions(rows, []);
  const fixList = Array.from(new Set(exceptions.filter(e => e.severity !== "low").map(e => e.issue)));
  const saleReadyFlag = biz.missing_fields.length === 0 && !biz.transfer_pending && fixList.length === 0;

  const exportCsv = () => downloadCsv(`saleability_${biz.business_id}.csv`, [
    ["field","value"],
    ["business", biz.business_name],
    ["brand", biz.brand_name],
    ["website", biz.website_url],
    ["legal_entity", biz.legal_entity],
    ["saleable_asset_group", biz.saleable_asset_group],
    ["customers", customerCount],
    ["active_subscriptions", subs.size],
    ["mrr_estimate", mrr],
    ["gross", biz.gross],
    ["tax", biz.tax],
    ["refunds", biz.refunds],
    ["stripe_fees", biz.stripe_fees],
    ["net", biz.net],
    ["confirmed_revenue", biz.confirmed],
    ["sale_ready_revenue", biz.sale_ready_revenue],
    ["temporary_payout_exposure", biz.temporary_payout ? "yes" : "no"],
    ["exceptions_to_fix", fixList.join("; ") || "none"],
    ["sale_ready", saleReadyFlag ? "yes" : "no"],
  ]);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`Saleability Pack — ${biz.business_name}`, 14, 18);
    doc.setFontSize(9); doc.setTextColor(120); doc.text(`${biz.brand_name} · ${biz.website_url}`, 14, 24);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 30,
      styles: { fontSize: 8 },
      head: [["Field", "Value"]],
      body: [
        ["Legal entity", biz.legal_entity],
        ["Saleable asset group", biz.saleable_asset_group],
        ["Revenue owner", biz.revenue_owner_entity],
        ["Customers", String(customerCount)],
        ["Active subscriptions", String(subs.size)],
        ["MRR (subscription net, lifetime)", fmt(mrr, biz.currency)],
        ["Gross revenue", fmt(biz.gross, biz.currency)],
        ["Tax collected", fmt(biz.tax, biz.currency)],
        ["Refunds", fmt(biz.refunds, biz.currency)],
        ["Stripe fees", fmt(biz.stripe_fees, biz.currency)],
        ["Net revenue", fmt(biz.net, biz.currency)],
        ["Confirmed revenue", fmt(biz.confirmed, biz.currency)],
        ["Sale-ready revenue", fmt(biz.sale_ready_revenue, biz.currency)],
        ["Temporary payout exposure", biz.temporary_payout ? "yes" : "no"],
        ["Transfer to GSM primary pending", biz.transfer_pending ? "yes" : "no"],
        ["Sale-ready", saleReadyFlag ? "YES" : "NO"],
      ],
    });
    if (fixList.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        styles: { fontSize: 8 },
        head: [["Must fix before sale due diligence"]],
        body: fixList.map(f => [f]),
      });
    }
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text("Liftor AI · Generated from Quote-to-Cash Payment Control Centre. Stripe test mode. Not a financial statement.", 14, 285);
    doc.save(`saleability_${biz.business_name.replace(/\W+/g, "_")}.pdf`);
  };

  return (
    <QTCSection
      title="Saleability pack per business"
      description="On-screen summary, CSV and PDF for sale due diligence."
      actions={
        <div className="flex gap-2">
          <select value={selected} onChange={e => setSelected(e.target.value)} className="text-xs bg-background border border-border/50 rounded px-2 py-1">
            {aggs.map(a => <option key={a.business_id} value={a.business_id}>{a.business_name}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download size={12} className="mr-1" />CSV</Button>
          <Button size="sm" variant="outline" onClick={exportPdf}><FileDown size={12} className="mr-1" />PDF</Button>
        </div>
      }
    >
      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <Card className="tech-card">
          <CardContent className="py-3 space-y-1">
            <p className="font-semibold text-sm">{biz.business_name}</p>
            <p className="text-muted-foreground">{biz.brand_name} · {biz.website_url}</p>
            <p>Legal entity: <span className="font-mono">{biz.legal_entity}</span></p>
            <p>Saleable asset group: <span className="font-mono">{biz.saleable_asset_group}</span></p>
            <p>Customers: <span className="font-mono">{customerCount}</span> · Subscriptions: <span className="font-mono">{subs.size}</span></p>
            <p>MRR (subscription net, lifetime): <span className="font-mono">{fmt(mrr, biz.currency)}</span></p>
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardContent className="py-3 space-y-1 text-[11px]">
            <Row label="Gross">{fmt(biz.gross, biz.currency)}</Row>
            <Row label="Tax">{fmt(biz.tax, biz.currency)}</Row>
            <Row label="Refunds">{fmt(biz.refunds, biz.currency)}</Row>
            <Row label="Stripe fees">{fmt(biz.stripe_fees, biz.currency)}</Row>
            <Row label="Net"><strong>{fmt(biz.net, biz.currency)}</strong></Row>
            <Row label="Confirmed">{fmt(biz.confirmed, biz.currency)}</Row>
            <Row label="Sale-ready">{fmt(biz.sale_ready_revenue, biz.currency)}</Row>
            <Row label="Temp payout exposure">{biz.temporary_payout ? "yes" : "no"}</Row>
            <Row label="Sale-ready">
              {saleReadyFlag
                ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">YES</Badge>
                : <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">NO</Badge>}
            </Row>
          </CardContent>
        </Card>
      </div>
      {fixList.length > 0 && (
        <Card className="tech-card mt-3 border-red-500/30">
          <CardContent className="py-3 text-xs">
            <p className="font-semibold mb-2 text-red-400">Must fix before sale due diligence</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {fixList.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </QTCSection>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground">{label}</span><span>{children}</span></div>;
}

// ---------- Go-live checklist ----------
function GoLiveChecklist({ stripeCfg, pays, hooks }: { stripeCfg: any; pays: Pay[]; hooks: Hook[] }) {
  const realPays = pays.filter(p => !p.is_test_data);
  const meta = (h: Hook) => h.payload?.data?.object?.metadata ?? {};
  const verifiedHooks = hooks.filter(h => h.processing_status === "processed");
  const exceptions = buildExceptions(pays, hooks).filter(e => e.severity === "high");

  const items: { ok: boolean; label: string; detail?: string; warnOnly?: boolean }[] = [
    { ok: !!stripeCfg?.secret_key_configured && stripeCfg?.mode === "test", label: "Stripe test secret key configured", detail: stripeCfg?.secret_key_configured ? `mode ${stripeCfg.mode}` : "missing" },
    { ok: !!stripeCfg?.webhook_secret_configured, label: "Stripe webhook secret configured" },
    { ok: hooks.length > 0, label: "Webhook endpoint registered & receiving events", detail: `${hooks.length} events logged`, warnOnly: true },
    { ok: hooks.some(h => ["checkout.session.completed","payment_intent.succeeded","invoice.paid","customer.subscription.created","customer.subscription.updated","customer.subscription.deleted","invoice.payment_failed","charge.refunded"].includes(h.event_type)), label: "Required Stripe events subscribed", warnOnly: true },
    { ok: pays.some(p => p.stripe_checkout_session_id), label: "Test checkout session created", warnOnly: true },
    { ok: verifiedHooks.length > 0, label: "Test webhook received and processed", warnOnly: true },
    { ok: pays.some(p => p.webhook_confirmation_source), label: "Test payment updated qtc_payments", warnOnly: true },
    { ok: pays.some(p => p.confirmed_revenue && p.webhook_confirmation_source), label: "Test revenue confirmation created (Stripe-verified)", warnOnly: true },
    { ok: hooks.every(h => meta(h).business_id), label: "business_id preserved through Stripe metadata" },
    { ok: hooks.every(h => meta(h).legal_entity), label: "legal_entity preserved through Stripe metadata" },
    { ok: hooks.every(h => meta(h).saleable_asset_group), label: "saleable_asset_group preserved through Stripe metadata", warnOnly: true },
    { ok: realPays.every(p => p.tax_amount != null), label: "Tax amount captured or explicitly zero on every real payment" },
    { ok: realPays.every(p => !p.temporary_payout_account_used || p.reconciled_at), label: "Temporary payout warnings acknowledged / reconciled", warnOnly: true },
    { ok: stripeCfg?.mode !== "live", label: "No live mode until founder approval (sk_live_ blocked server-side)" },
    { ok: false, label: "Primary GSM bank account added", detail: "Add and verify the GSM_LLC primary payout account in Stripe", warnOnly: true },
    { ok: true, label: "Founder approval gate active", detail: "qtc_payments.founder_approval_required preserved" },
    { ok: exceptions.length === 0, label: "No unresolved high-severity payment exceptions", detail: `${exceptions.length} high-severity open` },
  ];

  return (
    <QTCSection title="Go-live readiness checklist" description="Each item must be green before live charging is unlocked.">
      <ul className="space-y-1 text-xs">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 p-2 rounded border border-border/40">
            {it.ok ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" /> : it.warnOnly ? <AlertTriangle size={14} className="text-yellow-400 mt-0.5" /> : <XCircle size={14} className="text-red-400 mt-0.5" />}
            <div className="flex-1">
              <p>{it.label}</p>
              {it.detail && <p className="text-[10px] text-muted-foreground">{it.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-3">Live charging stays locked until the founder explicitly switches the Stripe key to sk_live_ and flips the approval gate. This page does not perform that switch.</p>
      <div className="flex gap-2 mt-3 text-xs">
        <Link className="underline" to="/founder/quote-to-cash">Overview</Link>
        <Link className="underline" to="/founder/quote-to-cash/settings">Settings</Link>
        <Link className="underline" to="/founder/quote-to-cash/payment-architecture-readiness">Architecture readiness</Link>
        <Link className="underline" to="/founder/quote-to-cash/payments">Payments</Link>
        <Link className="underline" to="/founder/quote-to-cash/revenue-confirmation">Revenue confirmation</Link>
      </div>
    </QTCSection>
  );
}

// ---------- helpers ----------
function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csv = rows.map(r => r.map(v => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
