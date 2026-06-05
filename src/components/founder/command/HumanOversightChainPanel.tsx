import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, AlertCircle, Lock } from "lucide-react";

type Stage = "ai_prepared" | "operator_checked" | "oversight_reviewed" | "founder_approved" | "external_locked";

export default function HumanOversightChainPanel() {
  const [rows, setRows] = useState<Array<{
    business_name: string; plan_id: string;
    ai_prepared: boolean; operator_checked: boolean; oversight_reviewed: boolean;
    founder_approved: boolean; external_locked: boolean;
  }>>([]);

  const reload = async () => {
    const todayStart = new Date(); todayStart.setUTCDate(1); // current month plans
    const monthStart = todayStart.toISOString().slice(0, 10);
    const { data: plans } = await (supabase as any).from("business_campaign_plans").select("*").gte("month_start", monthStart);
    const ids = (plans ?? []).map((p: any) => p.id);
    if (!ids.length) { setRows([]); return; }
    const [{ data: oc }, { data: ov }, { data: packs }, { data: outreach }, { data: social }] = await Promise.all([
      (supabase as any).from("campaign_operator_checks").select("business_campaign_plan_id").in("business_campaign_plan_id", ids),
      (supabase as any).from("campaign_oversight_checks").select("business_campaign_plan_id,review_status").in("business_campaign_plan_id", ids),
      (supabase as any).from("campaign_approval_packs").select("business_campaign_plan_id,status").in("business_campaign_plan_id", ids),
      (supabase as any).from("outreach_campaign_drafts").select("business_campaign_plan_id,external_send_blocked").in("business_campaign_plan_id", ids),
      (supabase as any).from("social_campaign_drafts").select("business_campaign_plan_id,external_publish_blocked").in("business_campaign_plan_id", ids),
    ]);
    const ocSet = new Set((oc ?? []).map((r: any) => r.business_campaign_plan_id));
    const ovOk = new Set((ov ?? []).filter((r: any) => r.review_status === "reviewed_ok").map((r: any) => r.business_campaign_plan_id));
    const approved = new Set((packs ?? []).filter((r: any) => r.status === "approved").map((r: any) => r.business_campaign_plan_id));
    const lockedPlan = (id: string) => {
      const o = (outreach ?? []).filter((r: any) => r.business_campaign_plan_id === id);
      const s = (social ?? []).filter((r: any) => r.business_campaign_plan_id === id);
      const allLocked = o.every((r: any) => r.external_send_blocked) && s.every((r: any) => r.external_publish_blocked);
      return o.length + s.length === 0 ? true : allLocked;
    };
    setRows((plans ?? []).map((p: any) => ({
      business_name: p.business_name,
      plan_id: p.id,
      ai_prepared: p.status !== "draft",
      operator_checked: ocSet.has(p.id) || p.status === "operator_prepared",
      oversight_reviewed: ovOk.has(p.id) || p.status === "oversight_reviewed",
      founder_approved: approved.has(p.id) || p.status === "founder_approved",
      external_locked: lockedPlan(p.id),
    })));
  };
  useEffect(() => { reload(); }, []);

  const Step = ({ done, label, icon }: { done: boolean; label: string; icon?: React.ReactNode }) => (
    <div className={`flex items-center gap-1 text-xs ${done ? "text-emerald-300" : "text-muted-foreground"}`}>
      {icon ?? (done ? <CheckCircle2 size={14} /> : <Circle size={14} />)} {label}
    </div>
  );

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today's Human Oversight Chain</h2>
        <Badge variant="outline" className="text-[10px]">{rows.length} business plan{rows.length === 1 ? "" : "s"}</Badge>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No plans for the current month yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.plan_id} className="grid md:grid-cols-[1.2fr,4fr] items-center gap-3 border-t border-border/30 pt-2 first:border-0 first:pt-0">
              <div className="text-sm font-medium truncate">{r.business_name}</div>
              <div className="flex flex-wrap gap-3">
                <Step done={r.ai_prepared} label="AI prepared" />
                <Step done={r.operator_checked} label="Operator checked" />
                <Step done={r.oversight_reviewed} label="Oversight reviewed" />
                <Step done={r.founder_approved} label="Founder approved" icon={r.founder_approved ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} />
                <Step done={r.external_locked} label={r.external_locked ? "External locked" : "External released"} icon={<Lock size={14} />} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}