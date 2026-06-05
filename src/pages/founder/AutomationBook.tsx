import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AUTOMATION_AREAS, createRunbook, type AutomationArea } from "@/lib/campaignFactoryEngine";

const AREA_LABELS: Record<string, string> = {
  social: "Monthly content planning",
  outreach: "Monthly outreach planning",
  inbox: "Inbox monitoring",
  crm: "CRM updates",
  proposal: "Proposal QA",
  finance: "Finance",
  compliance: "Compliance checks",
  reporting: "Weekly/daily reporting",
  onboarding: "New business onboarding",
};

export default function AutomationBook() {
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [form, setForm] = useState({
    runbook_name: "",
    automation_area: "social" as AutomationArea,
    trigger_type: "monthly" as "daily" | "weekly" | "monthly" | "manual" | "event_based",
    trigger_description: "",
    operator_role_required: "technical_operator",
    failure_modes: "",
    escalation_rules: "",
    external_action_allowed: false,
  });

  const reload = async () => {
    const { data } = await (supabase as any).from("automation_runbooks").select("*").order("automation_area").order("runbook_name");
    setRunbooks(data ?? []);
  };
  useEffect(() => { reload(); }, []);

  const grouped = AUTOMATION_AREAS.map((area) => ({
    area,
    items: runbooks.filter((r) => r.automation_area === area),
  }));

  const submit = async () => {
    if (!form.runbook_name.trim()) { toast.error("Name required"); return; }
    try {
      await createRunbook({ ...form, status: "draft" });
      toast.success("Runbook added");
      setForm({ ...form, runbook_name: "", trigger_description: "", failure_modes: "", escalation_rules: "" });
      reload();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <FounderLayout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Automation Book</h1>
          <p className="text-sm text-muted-foreground">Runbooks for every recurring Liftor automation. External actions stay blocked unless founder-approved.</p>
        </header>

        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Add runbook</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Runbook name" value={form.runbook_name} onChange={(e) => setForm({ ...form, runbook_name: e.target.value })} />
            <Select value={form.automation_area} onValueChange={(v) => setForm({ ...form, automation_area: v as AutomationArea })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUTOMATION_AREAS.map((a) => (<SelectItem key={a} value={a}>{AREA_LABELS[a] ?? a}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["daily", "weekly", "monthly", "manual", "event_based"].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input placeholder="Operator role required" value={form.operator_role_required} onChange={(e) => setForm({ ...form, operator_role_required: e.target.value })} />
            <Textarea className="md:col-span-2" rows={2} placeholder="Trigger description" value={form.trigger_description} onChange={(e) => setForm({ ...form, trigger_description: e.target.value })} />
            <Textarea rows={2} placeholder="Failure modes" value={form.failure_modes} onChange={(e) => setForm({ ...form, failure_modes: e.target.value })} />
            <Textarea rows={2} placeholder="Escalation rules" value={form.escalation_rules} onChange={(e) => setForm({ ...form, escalation_rules: e.target.value })} />
          </div>
          <Button onClick={submit}>Add runbook</Button>
        </Card>

        {grouped.map(({ area, items }) => (
          <section key={area} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">{AREA_LABELS[area] ?? area}</h2>
            {items.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">No runbooks defined for {AREA_LABELS[area] ?? area}.</Card>
            ) : items.map((r) => (
              <Card key={r.id} className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{r.runbook_name}</div>
                    <div className="text-xs text-muted-foreground">Trigger: {r.trigger_type} · Operator: {r.operator_role_required ?? "—"}</div>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline">{r.status}</Badge>
                    {r.oversight_required && <Badge variant="outline" className="bg-amber-500/10 text-amber-300">oversight required</Badge>}
                    {!r.external_action_allowed && <Badge variant="outline" className="bg-destructive/10 text-destructive">external blocked</Badge>}
                    {r.approval_required && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300">founder approval</Badge>}
                  </div>
                </div>
                {r.trigger_description && <p className="text-xs text-muted-foreground">{r.trigger_description}</p>}
                {r.failure_modes && <p className="text-xs"><span className="text-muted-foreground">Failure modes:</span> {r.failure_modes}</p>}
                {r.escalation_rules && <p className="text-xs"><span className="text-muted-foreground">Escalation:</span> {r.escalation_rules}</p>}
                <div className="flex gap-2">
                  {r.status !== "active" && <Button size="sm" variant="outline" onClick={async () => { await (supabase as any).from("automation_runbooks").update({ status: "active" }).eq("id", r.id); reload(); }}>Activate</Button>}
                  {r.status === "active" && <Button size="sm" variant="ghost" onClick={async () => { await (supabase as any).from("automation_runbooks").update({ status: "paused" }).eq("id", r.id); reload(); }}>Pause</Button>}
                </div>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </FounderLayout>
  );
}