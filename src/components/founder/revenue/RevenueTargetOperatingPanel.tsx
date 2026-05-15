import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, TrendingUp, AlertTriangle, ShieldCheck, Activity } from "lucide-react";

const TARGET_TYPES = [
  "new_subscriptions","recurring_revenue","one_off_sales","total_revenue","gross_margin",
  "retained_customers","upsells","renewals","proposal_acceptances","demo_bookings",
  "lead_generation","social_growth","partnership_revenue",
];

const paceColor: Record<string, string> = {
  ahead: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  on_track: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  slightly_behind: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  behind: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
};

export const RevenueTargetOperatingPanel = () => {
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [targets, setTargets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [monitor, setMonitor] = useState<any>(null);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    target_name: "Monthly new subscriptions",
    target_type: "new_subscriptions",
    target_amount: 1000,
    target_count: "" as string | number,
    currency: "GBP",
    period_start: monthStart,
    period_end: monthEnd,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      const list = (data ?? []) as any[];
      setBusinesses(list);
      const neon = list.find((b) => /neon\s*candy/i.test(b.name));
      setBusinessId(neon?.id ?? list[0]?.id ?? "");
    })();
  }, []);

  const refresh = async () => {
    if (!businessId) return;
    const [{ data: t }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("business_revenue_targets").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("revenue_target_activity_plans").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("revenue_goal_progress_snapshots").select("*").eq("business_id", businessId).order("snapshot_date", { ascending: false }).limit(20),
    ]);
    setTargets(t ?? []);
    setPlans(p ?? []);
    setSnapshots(s ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const planTarget = async (dry: boolean) => {
    if (!businessId) return;
    setBusy(true);
    try {
      const body: any = {
        business_id: businessId,
        ...form,
        target_count: form.target_count === "" ? null : Number(form.target_count),
        dry_run: dry,
      };
      if (!dry) body.confirmation_phrase = "CREATE REVENUE TARGET PLAN";
      const { data, error } = await supabase.functions.invoke("revenue-target-plan", { body });
      if (error) throw error;
      setPreview(data);
      toast.success(dry ? "Dry-run plan ready" : "Revenue target + plan created");
      if (!dry) refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const runMonitor = async (dry: boolean) => {
    if (!businessId) return;
    setBusy(true);
    try {
      const body: any = { business_id: businessId, dry_run: dry };
      if (!dry) body.confirmation_phrase = "CREATE REVENUE GOAL ACTIONS";
      const { data, error } = await supabase.functions.invoke("revenue-goal-monitor", { body });
      if (error) throw error;
      setMonitor(data);
      toast.success(dry ? "Pace dry-run ready" : "Snapshots written");
      if (!dry) refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const latestPlan = plans[0];
  const latestSnap = snapshots[0];

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Revenue Target Operating Mode
          <Badge variant="outline" className="ml-2">internal-only</Badge>
          <Badge variant="outline" className="ml-1 border-emerald-500/30 text-emerald-300">no auto external action</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Active targets</Label>
            <div className="text-sm text-muted-foreground pt-2">{targets.filter(t => t.status === "active").length} active · {targets.length} total</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 border-t border-border/30 pt-3">
          <div>
            <Label>Target name</Label>
            <Input value={form.target_name} onChange={(e) => setForm({ ...form, target_name: e.target.value })} />
          </div>
          <div>
            <Label>Target type</Label>
            <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TARGET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div>
            <Label>Target amount</Label>
            <Input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Target count (optional)</Label>
            <Input type="number" value={form.target_count as any} onChange={(e) => setForm({ ...form, target_count: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Period start</Label>
              <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy || !businessId} onClick={() => planTarget(true)}>Dry-run plan</Button>
          <Button size="sm" disabled={busy || !businessId} onClick={() => planTarget(false)}>Create target + plan</Button>
          <Button size="sm" variant="outline" disabled={busy || !businessId} onClick={() => runMonitor(true)}>Dry-run pace monitor</Button>
          <Button size="sm" disabled={busy || !businessId} onClick={() => runMonitor(false)}>Write progress snapshot</Button>
        </div>

        {preview?.plan && (
          <div className="rounded border border-border/40 p-3 text-sm space-y-1">
            <div className="font-medium flex items-center gap-2"><Activity className="h-4 w-4" /> Activity required to hit target</div>
            <div>Required customers: <span className="font-mono">{preview.plan.required_customers}</span></div>
            <div>Prospects: <span className="font-mono">{preview.plan.required_prospects}</span> · Outreach: <span className="font-mono">{preview.plan.required_outreach_actions}</span> · Social: <span className="font-mono">{preview.plan.required_social_actions}</span></div>
            <div>Proposals: <span className="font-mono">{preview.plan.required_proposals}</span> · Demos: <span className="font-mono">{preview.plan.required_demos}</span> · Upsells: <span className="font-mono">{preview.plan.required_upsells}</span></div>
            {(preview.plan.risk_flags ?? []).length > 0 && (
              <div className="text-amber-300 flex items-start gap-2 pt-1"><AlertTriangle className="h-4 w-4 mt-0.5" /><div>{preview.plan.risk_flags.join(" · ")}</div></div>
            )}
          </div>
        )}

        {latestPlan && (
          <div className="rounded border border-border/40 p-3 text-sm">
            <div className="font-medium mb-1">Latest saved plan</div>
            <div className="grid md:grid-cols-3 gap-2 text-xs">
              <div>Customers needed: <b>{latestPlan.required_customers}</b></div>
              <div>Outreach actions: <b>{latestPlan.required_outreach_actions}</b></div>
              <div>Proposals: <b>{latestPlan.required_proposals}</b></div>
              <div>Demos: <b>{latestPlan.required_demos}</b></div>
              <div>Upsells: <b>{latestPlan.required_upsells}</b></div>
              <div>Status: <b>{latestPlan.plan_status}</b></div>
            </div>
          </div>
        )}

        {latestSnap && (
          <div className="rounded border border-border/40 p-3 text-sm space-y-1">
            <div className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Latest pace snapshot</div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={paceColor[latestSnap.pace_status ?? ""] ?? ""}>{latestSnap.pace_status}</Badge>
              <span>{latestSnap.percentage_complete}% complete</span>
              <span>· actual {latestSnap.actual_amount} / target {latestSnap.target_amount}</span>
              <span>· forecast {latestSnap.forecast_amount}</span>
              <span>· shortfall {latestSnap.shortfall_amount}</span>
            </div>
            {latestSnap.recommended_adjustment && (
              <div className="text-muted-foreground text-xs">Recommendation: {latestSnap.recommended_adjustment}</div>
            )}
          </div>
        )}

        {monitor?.recommendations?.length > 0 && (
          <div className="rounded border border-border/40 p-3 text-sm">
            <div className="font-medium mb-1">Pace monitor recommendations</div>
            {monitor.recommendations.map((r: any) => (
              <div key={r.target_id} className="text-xs py-1 border-t border-border/30 first:border-t-0">
                <Badge className={paceColor[r.pace_status] ?? ""}>{r.pace_status}</Badge> <span className="ml-2 font-medium">{r.target_name}</span>
                <ul className="list-disc ml-5 mt-1 text-muted-foreground">
                  {r.recommendations.map((x: string, i: number) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border/30">
          <ShieldCheck className="h-3 w-3" /> Revenue Goal Agent works internally only. No emails, no posts, no DMs, no Apollo, no Smartlead pushes, no money movement, no filings without explicit founder approval.
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueTargetOperatingPanel;