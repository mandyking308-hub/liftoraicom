import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function QuoteToCashCard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    const sb: any = supabase as any;
    const head = { count: "exact" as const, head: true };
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const safe = (p:any)=>Promise.resolve(p).then(r=>r, ()=>({count:0, data:[]}));
    Promise.all([
      safe(sb.from("qtc_quotes").select("id", head).eq("quote_status","approval_required")),
      safe(sb.from("qtc_invoices").select("id", head).eq("invoice_status","draft")),
      safe(sb.from("qtc_invoices").select("id", head).eq("invoice_status","approval_required")),
      safe(sb.from("qtc_invoices").select("id", head).eq("invoice_status","overdue")),
      safe(sb.from("qtc_payments").select("id", head).eq("payment_status","succeeded")),
      safe(sb.from("qtc_revenue_confirmations").select("revenue_amount").gte("confirmed_at", today.toISOString())),
      safe(sb.from("qtc_revenue_confirmations").select("revenue_amount").gte("confirmed_at", monthStart)),
    ]).then(([q, idr, ia, io, ps, rt, rm]) => setD({
      quotesApproval: q.count ?? 0,
      invoicesDrafted: idr.count ?? 0,
      invoicesApproval: ia.count ?? 0,
      overdue: io.count ?? 0,
      payments: ps.count ?? 0,
      revenueToday: (rt.data||[]).reduce((s:number,r:any)=>s+Number(r.revenue_amount||0),0),
      revenueMonth: (rm.data||[]).reduce((s:number,r:any)=>s+Number(r.revenue_amount||0),0),
    }));
  }, []);

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt size={14} className="text-primary" />
          Quote-to-Cash Engine
          <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live preparation</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Send / charge approval-gated
          </Badge>
          <Link to="/founder/quote-to-cash" className="ml-auto text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
            Open <ArrowRight size={11} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!d ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Cell label="Quotes awaiting approval" value={d.quotesApproval} tone={d.quotesApproval>0?"warn":"good"} />
            <Cell label="Invoices drafted" value={d.invoicesDrafted} />
            <Cell label="Invoices awaiting approval" value={d.invoicesApproval} tone={d.invoicesApproval>0?"warn":"good"} />
            <Cell label="Overdue invoices" value={d.overdue} tone={d.overdue>0?"bad":"good"} />
            <Cell label="Payments received" value={d.payments} tone="good" />
            <Cell label="Confirmed revenue today" value={`$${Math.round(d.revenueToday).toLocaleString()}`} tone="good" />
            <Cell label="Confirmed revenue month" value={`$${Math.round(d.revenueMonth).toLocaleString()}`} tone="good" />
            <Cell label="Revenue blocked by approval" value={d.quotesApproval + d.invoicesApproval} tone={(d.quotesApproval + d.invoicesApproval)>0?"warn":"good"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Cell({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default"|"good"|"warn"|"bad" }) {
  const toneCls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="p-2 rounded border border-border/50">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}