import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, ShieldAlert, Play } from "lucide-react";

type Proposal = {
  interaction_id: string;
  business_id: string | null;
  contact_id: string | null;
  conversation_id: string | null;
  proposed_conversation_action: string;
  proposed_communication_direction: string | null;
  proposed_communication_type: string | null;
  proposed_subject: string | null;
  proposed_body_preview: string | null;
  detected_intent: string;
  confidence: number;
  founder_review_required: boolean;
  apply_status: string;
  apply_blockers: string[];
};

type Summary = {
  total: number;
  by_action: Record<string, number>;
  by_intent: Record<string, number>;
  review_required: number;
};

export default function CRMConversationBridgePanel() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const runPreview = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("crm-conversation-bridge-preview", { body: { limit: 50 } });
    if ((data as any)?.proposals) {
      setProposals((data as any).proposals);
      setSummary((data as any).summary);
    }
    setLoading(false);
  };

  useEffect(() => { runPreview(); }, []);

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Conversation Bridge</h3>
          <Badge variant="outline" className="text-[10px]">preview · apply disabled</Badge>
          <Badge variant="destructive" className="text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1" /> CRM_CONVERSATION_BRIDGE_ENABLED required
          </Badge>
        </div>
        <Button size="sm" onClick={runPreview} disabled={loading}>
          <Play className="h-3 w-3 mr-1" /> {loading ? "Running…" : "Refresh preview"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Future flow: <code>interaction → communication → conversation → ai_action → founder approval</code>.
        Apply requires <code>CRM_CONVERSATION_BRIDGE_ENABLED=true</code> + phrase
        <code> CREATE CRM CONVERSATION BRIDGE</code>. No emails, no AI replies, no Apollo, no Smartlead POSTs.
      </p>

      {summary && (
        <div className="grid sm:grid-cols-4 gap-2 text-[11px]">
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-muted-foreground uppercase text-[10px]">Eligible</div>
            <div className="text-lg font-semibold">{summary.total}</div>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-muted-foreground uppercase text-[10px]">Review required</div>
            <div className="text-lg font-semibold">{summary.review_required}</div>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-muted-foreground uppercase text-[10px]">Actions</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(summary.by_action).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px]">{k}: {v}</Badge>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-muted-foreground uppercase text-[10px]">Intents</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(summary.by_intent).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px]">{k}: {v}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-[420px] overflow-auto">
        {proposals.slice(0, 30).map((p) => (
          <div key={p.interaction_id} className="rounded-md border border-border/60 p-2 text-[11px] space-y-1">
            <div className="flex flex-wrap gap-1 items-center">
              <Badge variant="default" className="text-[10px]">{p.proposed_conversation_action}</Badge>
              <Badge variant="outline" className="text-[10px]">intent: {p.detected_intent}</Badge>
              <Badge variant="outline" className="text-[10px]">conf: {p.confidence.toFixed(2)}</Badge>
              {p.proposed_communication_type && (
                <Badge variant="outline" className="text-[10px]">{p.proposed_communication_direction} · {p.proposed_communication_type}</Badge>
              )}
              {p.conversation_id && <Badge variant="secondary" className="text-[10px]">existing convo</Badge>}
              {p.founder_review_required && <Badge variant="destructive" className="text-[10px]">founder review</Badge>}
              <Badge variant="destructive" className="text-[10px]">apply: disabled</Badge>
            </div>
            {p.proposed_subject && <div className="font-medium truncate">{p.proposed_subject}</div>}
            {p.proposed_body_preview && (
              <div className="text-muted-foreground line-clamp-2">{p.proposed_body_preview}</div>
            )}
          </div>
        ))}
        {!loading && proposals.length === 0 && (
          <div className="text-[11px] text-muted-foreground p-2">No eligible interactions in the ledger yet.</div>
        )}
      </div>
    </Card>
  );
}