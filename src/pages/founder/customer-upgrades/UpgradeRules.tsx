import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CULayout, CUSection, CUEmpty, TRIGGER_TYPES } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function UpgradeRules() {
  const sb: any = supabase as any;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    rule_name: "Renewal due in 30 days",
    trigger_type: "renewal_due" as typeof TRIGGER_TYPES[number],
    condition_json: '{"days_until_renewal_lte": 30}',
    recommended_action: "Draft renewal offer for founder review",
    requires_founder_approval: true,
    priority: 100,
    active: true,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["cu-rules"],
    queryFn: async () => (await sb.from("customer_upgrade_rules").select("*").order("priority", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
  });

  const create = async () => {
    let parsed: any = {};
    try { parsed = JSON.parse(form.condition_json); } catch { toast.error("Condition JSON invalid"); return; }
    const { error } = await sb.from("customer_upgrade_rules").insert({
      rule_name: form.rule_name,
      trigger_type: form.trigger_type,
      condition_json: parsed,
      recommended_action: form.recommended_action,
      requires_founder_approval: form.requires_founder_approval,
      priority: form.priority,
      active: form.active,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Rule added");
    qc.invalidateQueries({ queryKey: ["cu-rules"] });
    qc.invalidateQueries({ queryKey: ["cu-hub"] });
  };

  const toggle = async (id: string, active: boolean) => {
    await sb.from("customer_upgrade_rules").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cu-rules"] });
  };

  return (
    <CULayout title="Upgrade Rules" subtitle="Rules that turn customer signals into upgrade opportunities. Internal evaluation only — no message is sent.">
      <CUSection title="Add rule">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <Field label="Rule name"><Input value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} /></Field>
          <Field label="Trigger type">
            <Select value={form.trigger_type} onValueChange={(v: any) => setForm({ ...form, trigger_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRIGGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Priority"><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} /></Field>
          <div className="md:col-span-3"><Field label="Condition JSON"><Textarea rows={3} value={form.condition_json} onChange={e => setForm({ ...form, condition_json: e.target.value })} /></Field></div>
          <div className="md:col-span-2"><Field label="Recommended action"><Input value={form.recommended_action} onChange={e => setForm({ ...form, recommended_action: e.target.value })} /></Field></div>
          <Field label="Founder approval">
            <div className="h-10 flex items-center"><Switch checked={form.requires_founder_approval} onCheckedChange={(v) => setForm({ ...form, requires_founder_approval: v })} /></div>
          </Field>
        </div>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={create}>Add rule</Button></div>
      </CUSection>

      <CUSection title={`Rules (${rules.length})`}>
        {rules.length === 0 ? <CUEmpty title="No rules defined" /> : (
          <div className="space-y-2">
            {rules.map((r: any) => (
              <div key={r.id} className="rounded border border-border/50 p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{r.rule_name}</span>
                  <Badge variant="outline">{r.trigger_type}</Badge>
                  <Badge variant="outline">prio {r.priority}</Badge>
                  {r.requires_founder_approval && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval required</Badge>}
                  <div className="ml-auto flex items-center gap-2"><span className="text-muted-foreground">Active</span><Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} /></div>
                </div>
                {r.recommended_action && <div><span className="text-muted-foreground">Action: </span>{r.recommended_action}</div>}
                <pre className="text-[10px] p-2 rounded bg-background/40 border border-border/40 overflow-x-auto">{JSON.stringify(r.condition_json, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </CUSection>
    </CULayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <div><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>;
}