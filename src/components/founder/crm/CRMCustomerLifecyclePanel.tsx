import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workflow, ShieldAlert, Play } from "lucide-react";

type Stage = {
  stage_key: string;
  stage_label: string;
  sort_order: number;
  ai_draft_allowed: boolean;
  auto_send_allowed: boolean;
  proposal_allowed: boolean;
  demo_allowed: boolean;
  deal_allowed: boolean;
  suppression_stage: boolean;
  closed_stage: boolean;
  founder_review_required: boolean;
};
type Rule = {
  rule_key: string;
  interaction_type: string | null;
  detected_intent: string | null;
  recommended_stage: string | null;
  recommended_action: string;
  priority_level: string;
  founder_review_required: boolean;
  ai_draft_allowed: boolean;
  suppression_trigger_allowed: boolean;
};
type Preview = {
  interaction_id: string;
  current_stage: string;
  recommended_stage: string;
  recommended_action: string;
  priority_level: string;
  matched_rule_key: string | null;
  founder_review_required: boolean;
  blockers: string[];
};
type ReviewRow = {
  id: string;
  review_type: string;
  priority_level: string;
  current_stage: string | null;
  recommended_stage: string | null;
  recommended_action: string | null;
  status: string;
  summary: string | null;
  created_at: string;
};

export default function CRMCustomerLifecyclePanel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [queue, setQueue] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, r, q] = await Promise.all([
      supabase.from("crm_lifecycle_stages" as any).select("*").order("sort_order"),
      supabase.from("crm_next_action_rules" as any).select("*").order("rule_key"),
      supabase.from("crm_founder_review_queue" as any).select("id, review_type, priority_level, current_stage, recommended_stage, recommended_action, status, summary, created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setStages((s.data as any[]) ?? []);
    setRules((r.data as any[]) ?? []);
    setQueue((q.data as any[]) ?? []);
    setLoading(false);
  };

  const runPreview = async () => {
    const { data } = await supabase.functions.invoke("crm-next-action-preview", { body: { limit: 25 } });
    if ((data as any)?.previews) setPreviews((data as any).previews);
  };

  useEffect(() => { load(); runPreview(); }, []);

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Customer Lifecycle & Next Action</h3>
          <Badge variant="outline" className="text-[10px]">preview · apply disabled</Badge>
          <Badge variant="destructive" className="text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1" /> auto_send=false
          </Badge>
          <Badge variant="destructive" className="text-[10px]">
            CRM_NEXT_ACTION_APPLY_ENABLED required
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          <Button size="sm" onClick={runPreview}><Play className="h-3 w-3 mr-1" /> Preview next actions</Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Lifecycle stages, intent-driven rules and a founder review queue. Apply requires
        <code> CRM_NEXT_ACTION_APPLY_ENABLED=true</code> + phrase <code>APPLY CRM NEXT ACTION</code>.
        No emails, no proposals/deals/invoices auto-created, no contact status mutated.
      </p>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="rounded-md border border-border/60 p-2">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Lifecycle stages ({stages.length})</div>
          <div className="flex flex-wrap gap-1 max-h-44 overflow-auto">
            {stages.map((s) => (
              <Badge key={s.stage_key} variant={s.suppression_stage ? "destructive" : s.closed_stage ? "secondary" : "outline"} className="text-[10px]">
                {s.stage_label}
                {s.ai_draft_allowed ? " · draft" : ""}
                {s.proposal_allowed ? " · prop" : ""}
                {s.deal_allowed ? " · deal" : ""}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-border/60 p-2">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Next-action rules ({rules.length})</div>
          <ul className="text-[11px] space-y-0.5 max-h-44 overflow-auto">
            {rules.map((r) => (
              <li key={r.rule_key} className="flex flex-wrap gap-1 items-center">
                <span className="font-medium">{r.rule_key}</span>
                <Badge variant="outline" className="text-[10px]">→ {r.recommended_stage ?? "—"}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.recommended_action}</Badge>
                <Badge variant={r.priority_level === "urgent" ? "destructive" : "secondary"} className="text-[10px]">{r.priority_level}</Badge>
                {r.suppression_trigger_allowed && <Badge variant="destructive" className="text-[10px]">suppress</Badge>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-md border border-border/60 p-2">
        <div className="text-[10px] uppercase text-muted-foreground mb-1">Sample next-action preview ({previews.length})</div>
        <ul className="text-[11px] space-y-1 max-h-56 overflow-auto">
          {previews.length === 0 && <li className="text-muted-foreground">No interactions to evaluate yet.</li>}
          {previews.slice(0, 20).map((p) => (
            <li key={p.interaction_id} className="flex flex-wrap gap-1 items-center">
              <Badge variant="outline" className="text-[10px]">{p.current_stage} → {p.recommended_stage}</Badge>
              <Badge variant="default" className="text-[10px]">{p.recommended_action}</Badge>
              <Badge variant={p.priority_level === "urgent" ? "destructive" : "secondary"} className="text-[10px]">{p.priority_level}</Badge>
              {p.matched_rule_key && <Badge variant="outline" className="text-[10px]">rule: {p.matched_rule_key}</Badge>}
              {p.founder_review_required && <Badge variant="destructive" className="text-[10px]">founder review</Badge>}
              {p.blockers.map((b) => <Badge key={b} variant="destructive" className="text-[10px]">{b}</Badge>)}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-border/60 p-2">
        <div className="text-[10px] uppercase text-muted-foreground mb-1">Founder review queue ({queue.length})</div>
        <ul className="text-[11px] space-y-0.5 max-h-44 overflow-auto">
          {queue.length === 0 && <li className="text-muted-foreground">Queue empty — apply is disabled.</li>}
          {queue.map((q) => (
            <li key={q.id} className="flex flex-wrap gap-1 items-center">
              <Badge variant="outline" className="text-[10px]">{q.review_type}</Badge>
              <Badge variant={q.priority_level === "urgent" ? "destructive" : "secondary"} className="text-[10px]">{q.priority_level}</Badge>
              {q.current_stage && <Badge variant="outline" className="text-[10px]">{q.current_stage} → {q.recommended_stage}</Badge>}
              {q.recommended_action && <Badge variant="default" className="text-[10px]">{q.recommended_action}</Badge>}
              <Badge variant="secondary" className="text-[10px]">{q.status}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}