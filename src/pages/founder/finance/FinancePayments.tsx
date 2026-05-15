import { useEffect, useState } from "react";
import RevenueOperationsPanel from "@/components/founder/finance/RevenueOperationsPanel";
import { Plus } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Payment = {
  id: string; invoice_id: string; amount_received: number;
  received_date: string; method: string; reference: string;
};
type Invoice = { id: string; invoice_number: string; business_name: string; status: string };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const FinancePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ invoice_id: "", amount_received: "0", method: "bank", reference: "" });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [p, i] = await Promise.all([
      supabase.from("payments").select("*").order("received_date", { ascending: false }),
      supabase.from("invoices").select("id, invoice_number, business_name, status").in("status", ["SENT", "OVERDUE", "PARTIALLY_PAID", "PAID"]).order("issued_date", { ascending: false }),
    ]);
    setPayments((p.data as Payment[]) ?? []);
    setInvoices((i.data as Invoice[]) ?? []);
    setLoading(false);
  }

  async function record() {
    if (!form.invoice_id) { toast.error("Select an invoice"); return; }
    const amt = Number(form.amount_received);
    if (!amt || amt <= 0) { toast.error("Amount must be greater than 0"); return; }
    const { error } = await supabase.from("payments").insert([{
      invoice_id: form.invoice_id,
      amount_received: amt,
      method: form.method as "bank" | "stripe" | "cash" | "other",
      reference: form.reference,
    }]);
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    setForm({ invoice_id: "", amount_received: "0", method: "bank", reference: "" });
    toast.success("Payment recorded");
    void load();
  }

  const total = payments.reduce((s, p) => s + Number(p.amount_received), 0);
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Recorded payments. Partial payments mark the invoice as PARTIALLY_PAID; once cumulative payments cover the expected amount, the invoice auto-marks as PAID.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground tabular-nums">{payments.length} payments · {fmt(total)}</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Record Payment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Invoice</Label>
                    <Select value={form.invoice_id} onValueChange={(v) => setForm({ ...form, invoice_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                      <SelectContent>
                        {invoices.map((i) => <SelectItem key={i.id} value={i.id}>{i.invoice_number} — {i.business_name || "Unassigned"} ({i.status})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount received</Label><Input type="number" value={form.amount_received} onChange={(e) => setForm({ ...form, amount_received: e.target.value })} /></div>
                  <div>
                    <Label>Method</Label>
                    <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reference (optional)</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Bank ref / Stripe ID" /></div>
                </div>
                <DialogFooter><Button onClick={record}>Record</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="tech-card">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : payments.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {payments.map((p) => {
                  const inv = invoiceMap.get(p.invoice_id);
                  return (
                    <div key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium font-mono text-sm">{inv?.invoice_number ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv?.business_name || "Unknown"} · Received {p.received_date} · {p.method}
                          {p.reference && ` · ${p.reference}`}
                        </p>
                      </div>
                      <div className="text-base font-semibold tabular-nums">{fmt(Number(p.amount_received))}</div>
                      <Badge variant="outline" className="capitalize">{p.method}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <RevenueOperationsPanel />
      </div>
    </FounderLayout>
  );
};

export default FinancePayments;
