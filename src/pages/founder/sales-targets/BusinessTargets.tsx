import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty, fmtMoney } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { reverseEngineerActivity } from "@/lib/salesTargetMath";

export default function BusinessTargets() {
  const sb: any = supabase as any;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    target_name: "Monthly revenue target",
    target_period: "monthly",
    target_revenue_amount: 10000,
    target_currency: "GBP",
    target_start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    target_end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    target_type: "revenue",
    aov: 500,
    leadRate: 0.3,
    callRate: 0.4,
    closeRate: 0.2,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["st-business-targets"],
    queryFn: async () => (await sb.from("sales_revenue_targets").select("*, sales_activity_targets(*)").order("created_at", { ascending: false })).data ?? [],
  });

  const save = async () => {
    const { data: tgt, error } = await sb.from("sales_revenue_targets").insert({
      target_name: form.target_name,
      target_period: form.target_period,
      target_revenue_amount: form.target_revenue_amount,
      target_currency: form.target_currency,
      target_start_date: form.target_start_date,
      target_end_date: form.target_end_date,
      target_type: form.target_type,
      active: true,
    }).select("*").single();
    if (error) { toast.error(error.message); return; }
    const req = reverseEngineerActivity(Number(form.target_revenue_amount), {
      assumed_lead_to_call_rate: form.leadRate,
      assumed_call_to_proposal_rate: form.callRate,
      assumed_proposal_to_close_rate: form.closeRate,
      assumed_average_order_value: form.aov,
    }, form.target_start_date, form.target_end_date);
    await sb.from("sales_activity_targets").insert({
      revenue_target_id: tgt.id,
      required_leads: req.required_leads,
      required_conversations: req.required_conversations,
      required_calls: req.required_calls,
      required_proposals: req.required_proposals,
      required_followups: req.required_followups,
      required_closes: req.required_closes,
      required_upgrades: req.required_upgrades,
      assumed_lead_to_call_rate: form.leadRate,
      assumed_call_to_proposal_rate: form.callRate,
      assumed_proposal_to_close_rate: form.closeRate,
      assumed_average_order_value: form.aov,
    });
    toast.success("Target saved · activity plan reverse-engineered");
    qc.invalidateQueries({ queryKey: ["st-business-targets"] });
    qc.invalidateQueries({ queryKey: ["st-cockpit"] });
    qc.invalidateQueries({ queryKey: ["st-activity"] });
  };

  const toggleActive = async (id: string, active: boolean) => {
    await sb.from("sales_revenue_targets").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["st-business-targets"] });
    qc.invalidateQueries({ queryKey: ["st-cockpit"] });
  };

  const preview = reverseEngineerActivity(Number(form.target_revenue_amount), {
    assumed_lead_to_call_rate: form.leadRate,
    assumed_call_to_proposal_rate: form.callRate,
    assumed_proposal_to_close_rate: form.closeRate,
    assumed_average_order_value: form.aov,
  }, form.target_start_date, form.target_end_date);

  return (
    <STLayout title="Business Targets" subtitle="Set revenue targets per business and period. Liftor reverse-engineers the activity required to hit them.">
      <STSection title="New target" description="Internal planning only — saving does not trigger any external customer contact.">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <Field label="Target name"><Input value={form.target_name} onChange={e => setForm({ ...form, target_name: e.target.value })} /></Field>
          <Field label="Period">
            <Select value={form.target_period} onValueChange={v => setForm({ ...form, target_period: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["daily", "weekly", "monthly", "quarterly", "annual"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.target_type} onValueChange={v => setForm({ ...form, target_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["revenue", "profit", "pipeline", "closed_won", "subscription_mrr", "booked_calls"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Revenue amount"><Input type="number" value={form.target_revenue_amount} onChange={e => setForm({ ...form, target_revenue_amount: Number(e.target.value) })} /></Field>
          <Field label="Currency"><Input value={form.target_currency} onChange={e => setForm({ ...form, target_currency: e.target.value.toUpperCase().slice(0, 3) })} /></Field>
          <div />
          <Field label="Start date"><Input type="date" value={form.target_start_date} onChange={e => setForm({ ...form, target_start_date: e.target.value })} /></Field>
          <Field label="End date"><Input type="date" value={form.target_end_date} onChange={e => setForm({ ...form, target_end_date: e.target.value })} /></Field>
          <div />
          <Field label="Avg order value"><Input type="number" value={form.aov} onChange={e => setForm({ ...form, aov: Number(e.target.value) })} /></Field>
          <Field label="Lead → call rate"><Input type="number" step="0.01" value={form.leadRate} onChange={e => setForm({ ...form, leadRate: Number(e.target.value) })} /></Field>
          <Field label="Call → proposal rate"><Input type="number" step="0.01" value={form.callRate} onChange={e => setForm({ ...form, callRate: Number(e.target.value) })} /></Field>
          <Field label="Proposal → close rate"><Input type="number" step="0.01" value={form.closeRate} onChange={e => setForm({ ...form, closeRate: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <Mini label="Closes" value={preview.required_closes} />
          <Mini label="Proposals" value={preview.required_proposals} />
          <Mini label="Calls" value={preview.required_calls} />
          <Mini label="Leads" value={preview.required_leads} />
          <Mini label="Daily calls" value={preview.daily_calls} />
          <Mini label="Days" value={preview.days_in_period} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={save}>Save target & activity plan</Button>
        </div>
      </STSection>

      <STSection title="All targets">
        {targets.length === 0 ? <STEmpty title="No targets yet" /> : (
          <div className="space-y-2">
            {targets.map((t: any) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 p-3 rounded border border-border/50 text-xs">
                <div className="font-medium text-sm">{t.target_name}</div>
                <Badge variant="outline">{t.target_period}</Badge>
                <Badge variant="outline">{t.target_type}</Badge>
                <span className="text-muted-foreground">{t.target_start_date} → {t.target_end_date}</span>
                <span className="font-semibold">{fmtMoney(Number(t.target_revenue_amount), t.target_currency)}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-muted-foreground">Active</span>
                  <Switch checked={t.active} onCheckedChange={(v) => toggleActive(t.id, v)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </STSection>
    </STLayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>;
}
function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded border border-border/50 p-2 text-center"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm font-semibold">{value}</div></div>;
}