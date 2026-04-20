import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Invoice = {
  id: string; invoice_number: string; business_name: string;
  amount_min: number; amount_max: number; currency: string;
  issued_date: string; due_date: string; status: string; deal_id: string | null;
  notes: string;
};

const STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "PAID") return "default";
  if (s === "OVERDUE") return "destructive";
  if (s === "SENT") return "outline";
  return "secondary";
};

const FinanceInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("invoices").select("*").order("issued_date", { ascending: false });
    setInvoices((data as Invoice[]) ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("invoices").update({ status: status as "DRAFT" | "SENT" | "PAID" | "OVERDUE" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
    void load();
  }

  const visible = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter);
  const total = visible.reduce((sum, i) => sum + (Number(i.amount_min) + Number(i.amount_max)) / 2, 0);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              All invoices reflect non-binding estimates. Auto-created in DRAFT when a deal moves to WON.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground tabular-nums">{visible.length} invoices · {fmt(total)}</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="tech-card">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No invoices match this filter.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {visible.map((i) => {
                  const mid = (Number(i.amount_min) + Number(i.amount_max)) / 2;
                  const overdueDays = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={i.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium font-mono text-sm">{i.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.business_name || "Unassigned"} · Issued {i.issued_date} · Due {i.due_date}
                          {i.status === "OVERDUE" && overdueDays > 0 && ` · ${overdueDays}d overdue`}
                        </p>
                      </div>
                      <div className="text-sm tabular-nums hidden md:block">
                        {fmt(Number(i.amount_min))}–{fmt(Number(i.amount_max))}
                        <span className="text-muted-foreground"> · est. {fmt(mid)}</span>
                      </div>
                      <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default FinanceInvoices;
