import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QTCLayout, QTCSection, QTCStat } from "./_shared";
import { Link } from "react-router-dom";

export default function QTCOverview() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    const sb: any = supabase as any;
    const head = { count: "exact" as const, head: true };
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const safe = (p:any) => p.catch(()=>({count:0, data:[]}));
    Promise.all([
      safe(sb.from("qtc_quotes").select("id", head).eq("quote_status","approval_required")),
      safe(sb.from("qtc_proposals").select("id", head).eq("proposal_status","approval_required")),
      safe(sb.from("qtc_invoices").select("id", head).eq("invoice_status","draft")),
      safe(sb.from("qtc_invoices").select("id", head).eq("invoice_status","approval_required")),
      safe(sb.from("qtc_invoices").select("id", head).eq("invoice_status","overdue")),
      safe(sb.from("qtc_payments").select("id", head).eq("payment_status","succeeded")),
      safe(sb.from("qtc_revenue_confirmations").select("revenue_amount").gte("confirmed_at", today.toISOString())),
      safe(sb.from("qtc_revenue_confirmations").select("revenue_amount").gte("confirmed_at", monthStart)),
    ]).then(([q, p, idr, ia, io, ps, rt, rm]) => setD({
      quotesApproval: q.count ?? 0,
      proposalsApproval: p.count ?? 0,
      invoicesDrafted: idr.count ?? 0,
      invoicesApproval: ia.count ?? 0,
      overdue: io.count ?? 0,
      paymentsSucceeded: ps.count ?? 0,
      revenueToday: (rt.data||[]).reduce((s:number,r:any)=>s+Number(r.revenue_amount||0),0),
      revenueMonth: (rm.data||[]).reduce((s:number,r:any)=>s+Number(r.revenue_amount||0),0),
    }));
  }, []);

  if (!d) return <QTCLayout title="Overview"><p className="text-xs text-muted-foreground">Loading…</p></QTCLayout>;

  return (
    <QTCLayout title="Quote-to-Cash" subtitle="Lead → quote → proposal → invoice → payment → confirmed revenue → delivery trigger. Drafts run live; sending, charging, signing remain founder-approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QTCStat label="Quotes awaiting approval" value={d.quotesApproval} tone={d.quotesApproval>0?"warn":"good"} />
        <QTCStat label="Proposals awaiting approval" value={d.proposalsApproval} tone={d.proposalsApproval>0?"warn":"good"} />
        <QTCStat label="Invoices drafted" value={d.invoicesDrafted} />
        <QTCStat label="Invoices awaiting approval" value={d.invoicesApproval} tone={d.invoicesApproval>0?"warn":"good"} hint="external send locked" />
        <QTCStat label="Overdue invoices" value={d.overdue} tone={d.overdue>0?"bad":"good"} />
        <QTCStat label="Payments received" value={d.paymentsSucceeded} tone="good" />
        <QTCStat label="Confirmed revenue (today)" value={`$${Math.round(d.revenueToday).toLocaleString()}`} tone="good" />
        <QTCStat label="Confirmed revenue (month)" value={`$${Math.round(d.revenueMonth).toLocaleString()}`} tone="good" />
      </div>

      <QTCSection title="Flow" description="Liftor prepares everything internally. The actual external mutation only fires after founder approval and a configured provider.">
        <ol className="text-xs space-y-1 list-decimal list-inside">
          <li>Lead / Opportunity created in CRM or Customer Sales Engine.</li>
          <li>Quote drafted with pricing, tax, discount, validity, terms.</li>
          <li>Proposal generated from quote (title, body, pricing summary, risk flags).</li>
          <li>Founder approves quote/proposal → status becomes <code>approved</code>.</li>
          <li>Send is gated. Once sent, status moves to <code>sent</code> → <code>accepted</code>.</li>
          <li>Quote acceptance auto-creates an invoice draft (trigger <code>qtc_on_quote_accepted</code>).</li>
          <li>Invoice approved → sent → payment link issued (approval-gated provider call).</li>
          <li>Payment <code>succeeded</code> writes a <code>qtc_revenue_confirmations</code> row and marks the invoice <code>paid</code> (trigger <code>qtc_on_payment_succeeded</code>).</li>
          <li>Confirmed revenue triggers the Delivery / Fulfilment Engine downstream.</li>
        </ol>
      </QTCSection>

      <QTCSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[["Quotes","/founder/quote-to-cash/quotes"],["Proposals","/founder/quote-to-cash/proposals"],["Invoices","/founder/quote-to-cash/invoices"],["Payments","/founder/quote-to-cash/payments"],["Revenue confirmation","/founder/quote-to-cash/revenue-confirmation"],["Settings","/founder/quote-to-cash/settings"]].map(([l,to])=>(
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </QTCSection>
    </QTCLayout>
  );
}