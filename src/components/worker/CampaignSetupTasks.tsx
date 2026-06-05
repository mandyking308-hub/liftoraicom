import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CHECK_TYPES = [
  { value: "automation_check", label: "Automation check" },
  { value: "copy_check", label: "Copy check" },
  { value: "lead_check", label: "Lead check" },
  { value: "schedule_check", label: "Schedule check" },
  { value: "compliance_check", label: "Compliance check" },
  { value: "tool_setup_check", label: "Tool setup check" },
];

export default function CampaignSetupTasks({ workerId }: { workerId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [social, setSocial] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [checkType, setCheckType] = useState("automation_check");
  const [status, setStatus] = useState("passed");

  const reload = async () => {
    const { data: p } = await (supabase as any)
      .from("business_campaign_plans").select("*")
      .eq("assigned_operator_id", workerId)
      .order("created_at", { ascending: false });
    setPlans(p ?? []);
    if (p && p.length) {
      const ids = p.map((x: any) => x.id);
      const [s, o] = await Promise.all([
        (supabase as any).from("social_campaign_drafts").select("*").in("business_campaign_plan_id", ids),
        (supabase as any).from("outreach_campaign_drafts").select("*").in("business_campaign_plan_id", ids),
      ]);
      setSocial(s.data ?? []); setOutreach(o.data ?? []);
    }
  };
  useEffect(() => { reload(); }, [workerId]);

  const submitCheck = async () => {
    if (!active) return;
    await (supabase as any).from("campaign_operator_checks").insert({
      business_campaign_plan_id: active.id,
      operator_id: workerId,
      check_type: checkType,
      check_status: status,
      notes: notes || null,
      evidence_url: evidence || null,
    });
    setNotes(""); setEvidence("");
    toast.success("Check logged");
  };

  const markReady = async () => {
    if (!active) return;
    await (supabase as any).from("business_campaign_plans").update({ status: "operator_prepared" }).eq("id", active.id);
    toast.success("Marked ready for oversight");
    reload();
  };

  return (
    <Card className="p-4 mt-6">
      <h2 className="font-semibold mb-3">Campaign Setup Tasks</h2>
      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaign plans assigned to you.</p>
      ) : (
        <div className="grid md:grid-cols-[1fr,1.5fr] gap-4">
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id}>
                <button onClick={() => setActive(p)} className={`w-full text-left p-3 rounded-lg border ${active?.id === p.id ? "border-primary bg-primary/5" : "border-border/50"}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-sm">{p.business_name}</span>
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.month_start}</p>
                </button>
              </li>
            ))}
          </ul>
          <div>
            {!active ? <p className="text-sm text-muted-foreground">Select a plan to view drafts.</p> : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">Theme: {active.campaign_theme ?? "—"} · Target: {active.target_customer ?? "—"}</div>
                <div className="text-xs">
                  <div className="font-semibold mb-1">Social drafts</div>
                  {social.filter((s) => s.business_campaign_plan_id === active.id).map((s) => (
                    <div key={s.id} className="flex justify-between border-b border-border/30 py-1">
                      <span>{s.platform} · {(s.content_items ?? []).length} items</span>
                      <Badge variant="outline">{s.external_publish_blocked ? "publish blocked" : "publish allowed"}</Badge>
                    </div>
                  ))}
                </div>
                <div className="text-xs">
                  <div className="font-semibold mb-1">Outreach drafts</div>
                  {outreach.filter((o) => o.business_campaign_plan_id === active.id).map((o) => (
                    <div key={o.id} className="flex justify-between border-b border-border/30 py-1">
                      <span>{o.campaign_name} · {(o.email_sequence ?? []).length} steps</span>
                      <Badge variant="outline">{o.external_send_blocked ? "send blocked" : "send allowed"}</Badge>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <label className="text-xs font-medium">Log a check</label>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={checkType} onValueChange={setCheckType}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>{CHECK_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["passed", "issue_found", "needs_founder", "blocked"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <Input placeholder="Evidence URL" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={submitCheck}>Save check</Button>
                    <Button size="sm" variant="glow" onClick={markReady}>Mark ready for oversight</Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">You cannot launch, send, publish or export. You cannot access secrets or founder routes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}