import { useEffect, useState } from "react";
import RevenueOperationsPanel from "@/components/founder/finance/RevenueOperationsPanel";
import TreasuryCashflowControlPanel from "@/components/founder/finance/TreasuryCashflowControlPanel";
import ComplaintsDisputesRecoveryPanel from "@/components/founder/customer/ComplaintsDisputesRecoveryPanel";
import { Link } from "react-router-dom";
import {
  Target, TrendingUp, Banknote, GitBranch, FileText, AlertTriangle,
  Plus, RefreshCw, PoundSterling,
} from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  business_name: string;
  monthly_target: number;
  pipeline_target: number;
  pipeline_value: number;
  closed_value: number;
  collected_value: number;
  outstanding_value: number;
  overdue_value: number;
  progress_pct: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [chasing, setChasing] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [tva, outstanding, overdue] = await Promise.all([
      supabase.rpc("finance_target_vs_actual", { _business_name: null }),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "SENT"),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "OVERDUE"),
    ]);
    setRows((tva.data as Row[]) ?? []);
    setOutstandingCount(outstanding.count ?? 0);
    setOverdueCount(overdue.count ?? 0);
    setLoading(false);
  }

  async function runChasing() {
    setChasing(true);
    const { data, error } = await supabase.functions.invoke("finance-chase-overdue", { body: {} });
    setChasing(false);
    if (error) {
      toast.error("Chasing failed: " + error.message);
      return;
    }
    const s = (data as { summary?: Record<string, number> })?.summary ?? {};
    toast.success(`Chased ${s.checked ?? 0} invoices · ${s.reminders ?? 0} reminders · ${s.escalations ?? 0} escalations · ${s.critical ?? 0} critical`);
    void load();
  }

  // Aggregate totals across businesses
  const totals = rows.reduce(
    (acc, r) => ({
      monthly_target: acc.monthly_target + Number(r.monthly_target || 0),
      pipeline_value: acc.pipeline_value + Number(r.pipeline_value || 0),
      closed_value: acc.closed_value + Number(r.closed_value || 0),
      collected_value: acc.collected_value + Number(r.collected_value || 0),
      outstanding_value: acc.outstanding_value + Number(r.outstanding_value || 0),
      overdue_value: acc.overdue_value + Number(r.overdue_value || 0),
    }),
    { monthly_target: 0, pipeline_value: 0, closed_value: 0, collected_value: 0, outstanding_value: 0, overdue_value: 0 },
  );

  const stats = [
    { label: "Monthly Target", value: fmt(totals.monthly_target), icon: Target },
    { label: "Revenue Closed", value: fmt(totals.closed_value), icon: TrendingUp },
    { label: "Revenue Collected", value: fmt(totals.collected_value), icon: Banknote },
    { label: "Pipeline Value", value: fmt(totals.pipeline_value), icon: GitBranch },
    { label: "Outstanding Invoices", value: `${outstandingCount} · ${fmt(totals.outstanding_value)}`, icon: FileText },
    { label: "Overdue Invoices", value: `${overdueCount} · ${fmt(totals.overdue_value)}`, icon: AlertTriangle },
  ];

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial System</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Revenue targets, deals, invoices and cash flow across all businesses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={runChasing} disabled={chasing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${chasing ? "animate-spin" : ""}`} />
              Run Chasing
            </Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/finance/targets"><Target className="mr-2 h-4 w-4" />Targets</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/finance/deals"><GitBranch className="mr-2 h-4 w-4" />Deals</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/finance/invoices"><FileText className="mr-2 h-4 w-4" />Invoices</Link></Button>
            <Button asChild size="sm"><Link to="/founder/finance/payments"><PoundSterling className="mr-2 h-4 w-4" />Payments</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="tech-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2 text-muted-foreground">
                  <span className="text-xs uppercase tracking-wider">{s.label}</span>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-xl font-semibold tabular-nums">{loading ? "—" : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Target vs Actual by Business (this month)</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet. Add a revenue target or deal to get started.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const pct = Math.min(100, Number(r.progress_pct || 0));
                  return (
                    <div key={r.business_name || "unassigned"} className="rounded-lg border border-border/50 p-3">
                      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                        <p className="font-medium">{r.business_name || "Unassigned"}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground tabular-nums">
                          <span>Target {fmt(Number(r.monthly_target))}</span>
                          <span>Pipeline {fmt(Number(r.pipeline_value))}</span>
                          <span>Closed {fmt(Number(r.closed_value))}</span>
                          <span className="text-foreground">Collected {fmt(Number(r.collected_value))}</span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                        <span>{pct.toFixed(1)}% of target collected</span>
                        {Number(r.overdue_value) > 0 && (
                          <Badge variant="destructive" className="text-[10px]">Overdue {fmt(Number(r.overdue_value))}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Financial Rules</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Invoices are auto-created in DRAFT when a deal moves to WON.</li>
              <li>Payments must link to invoices. Once cumulative payments cover the invoice mid-amount, status auto-flips to PAID.</li>
              <li>Past-due SENT invoices are auto-flipped to OVERDUE; chasing logs reminders at 3d, escalations at 7d, critical at 14d.</li>
              <li>All amounts shown as estimates ("non-binding estimate") on every invoice.</li>
            </ul>
          </CardContent>
        </Card>
        <RevenueOperationsPanel />
        <TreasuryCashflowControlPanel />
        <ComplaintsDisputesRecoveryPanel />
      </div>
    </FounderLayout>
  );
};

export default FinanceDashboard;
