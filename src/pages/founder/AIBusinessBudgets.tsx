import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PoundSterling, AlertTriangle, ShieldAlert, Pencil, Bot, Megaphone, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatGBP } from "@/services/aiUsageLogger";
import {
  CONSERVATIVE_DEFAULTS,
  getBusinessBudgetUsage,
  ensureBusinessBudget,
  type BudgetStatus,
  type BudgetUsage,
} from "@/services/aiBudgetService";

type Business = { id: string; name: string };

function statusColor(s: BudgetStatus) {
  switch (s) {
    case "safe": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "watch": return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "near_limit": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "exceeded": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "blocked": return "bg-red-500/15 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

const FIELDS = [
  ["daily_ai_budget", "Daily budget"],
  ["weekly_ai_budget", "Weekly budget"],
  ["monthly_ai_budget", "Monthly budget"],
  ["campaign_ai_budget", "Per-campaign budget"],
  ["max_cost_per_lead", "Max £ per lead"],
  ["max_cost_per_opportunity", "Max £ per opportunity"],
  ["max_cost_per_customer", "Max £ per customer"],
  ["max_cost_per_content_asset", "Max £ per content asset"],
  ["max_cost_per_agent_per_day", "Max £ per agent/day"],
] as const;

export default function AIBusinessBudgets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null);

  const businessesQ = useQuery({
    queryKey: ["budget-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Business[];
    },
  });

  const budgetsQ = useQuery({
    queryKey: ["ai-business-budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_business_budgets").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const usageQ = useQuery({
    queryKey: ["ai-budget-usage", businessesQ.data?.map((b) => b.id).join(",")],
    enabled: !!businessesQ.data?.length,
    queryFn: async () => {
      const result: Record<string, BudgetUsage> = {};
      await Promise.all(
        (businessesQ.data ?? []).map(async (b) => {
          try { result[b.id] = await getBusinessBudgetUsage(b.id); } catch {}
        }),
      );
      return result;
    },
  });

  const ensureMutation = useMutation({
    mutationFn: async (business_id: string) => {
      const r = await ensureBusinessBudget(business_id);
      if (r.created) toast({ title: "Conservative defaults applied" });
      return r.row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-business-budgets"] });
      qc.invalidateQueries({ queryKey: ["ai-budget-usage"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await supabase
          .from("ai_business_budgets")
          .update(row)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_business_budgets").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Budget saved" });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["ai-business-budgets"] });
      qc.invalidateQueries({ queryKey: ["ai-budget-usage"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const budgetsByBiz = new Map<string, any>(
    (budgetsQ.data ?? []).map((b: any) => [b.business_id, b]),
  );

  function openEdit(business_id: string) {
    const existing = budgetsByBiz.get(business_id);
    setEditing(existing ?? { business_id, ...CONSERVATIVE_DEFAULTS });
  }

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Business Budgets" description="Per-business AI budgets, caps and stop-loss settings." /><div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <PoundSterling className="h-6 w-6 text-primary" /> Business AI Budgets
          </h1>
          <p className="text-sm text-muted-foreground">
            Per-business AI spend caps. Businesses without a budget run on conservative defaults
            and are flagged below.
          </p>
        </header>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(businessesQ.data ?? []).map((b) => {
            const cfg = budgetsByBiz.get(b.id);
            const usage = usageQ.data?.[b.id];
            return (
              <Card key={b.id} className="tech-card">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {!cfg && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                          Budget not configured
                        </Badge>
                      )}
                      {usage && (
                        <Badge className={statusColor(usage.status)}>
                          {usage.status.replace("_", " ")}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {!cfg && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => ensureMutation.mutate(b.id)}
                    >
                      Apply conservative defaults
                    </Button>
                  )}
                  {usage && (
                    <>
                      <UsageRow
                        label="Today" used={usage.spend_today}
                        cap={cfg?.daily_ai_budget} pct={usage.pct_daily}
                      />
                      <UsageRow
                        label="This week" used={usage.spend_week}
                        cap={cfg?.weekly_ai_budget} pct={usage.pct_weekly}
                      />
                      <UsageRow
                        label="This month" used={usage.spend_month}
                        cap={cfg?.monthly_ai_budget} pct={usage.pct_monthly}
                      />
                      <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Projected month-end</span>
                          <span>{formatGBP(usage.projected_month_end)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bot className="h-3 w-3" />
                          Top agent: {usage.top_agent?.agent_id?.slice(0, 8) ?? "—"}
                          {usage.top_agent && ` (${formatGBP(usage.top_agent.spend)})`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-3 w-3" />
                          Top campaign: {usage.top_campaign?.campaign_id?.slice(0, 8) ?? "—"}
                          {usage.top_campaign && ` (${formatGBP(usage.top_campaign.spend)})`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="h-3 w-3" />
                          Open alerts: {usage.alert_count_open}
                        </div>
                        {usage.status_reason && (
                          <div className="flex items-start gap-2 pt-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5" />
                            {usage.status_reason}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!businessesQ.isLoading && (businessesQ.data ?? []).length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              No businesses found.
            </CardContent></Card>
          )}
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit AI budget</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(([k, label]) => (
                  <div key={k}>
                    <Label>{label} ({editing.currency ?? "GBP"})</Label>
                    <Input
                      type="number" step="0.01"
                      value={editing[k] ?? ""}
                      onChange={(e) =>
                        setEditing({ ...editing, [k]: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </div>
                ))}
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={editing.currency ?? "GBP"}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editing.active !== false}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editing.stop_when_budget_exceeded}
                    onCheckedChange={(v) => setEditing({ ...editing, stop_when_budget_exceeded: v })}
                  />
                  <Label>Stop when exceeded</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editing.require_founder_approval_when_exceeded}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, require_founder_approval_when_exceeded: v })
                    }
                  />
                  <Label>Founder approval when exceeded</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                Save budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
}

function UsageRow({
  label, used, cap, pct,
}: { label: string; used: number; cap: number | null | undefined; pct: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {formatGBP(used)}
          {cap != null && <span className="text-muted-foreground"> / {formatGBP(cap)}</span>}
        </span>
      </div>
      <Progress value={Math.min(100, pct ?? 0)} className="h-1.5" />
    </div>
  );
}