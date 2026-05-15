import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCcw, Lock } from "lucide-react";

type Props = { compact?: boolean };

export default function SmartleadAISalesIntakePanel({ compact = false }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-ai-intake-preview",
      { body: { limit: compact ? 10 : 50 } },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };
  useEffect(() => { run(); }, []);

  const previews: any[] = data?.previews ?? [];
  const counts: Record<string, number> = data?.counts_by_type ?? {};
  const replyCount = counts["reply_received"] ?? 0;

  if (compact) {
    return (
      <Card className="p-4 space-y-2 border-2 border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Smartlead Reply Intake</h4>
            <Badge variant="outline" className="text-[10px]">disabled</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border border-border/60 p-2">
            <div className="text-muted-foreground">Captured replies</div>
            <div className="font-mono text-sm">{replyCount}</div>
          </div>
          <div className="rounded border border-border/60 p-2">
            <div className="text-muted-foreground">Pending classification</div>
            <div className="font-mono text-sm">{previews.length}</div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Founder review required on every reply. AI drafting disabled until event-to-conversation apply is enabled.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead AI Sales Intake</h3>
          <Badge variant="outline" className="text-[10px]">preview</Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-300">apply disabled</Badge>
          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-300">send disabled</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="rounded border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-200">
        <div className="flex items-center gap-2 font-medium">
          <Lock className="h-3.5 w-3.5" /> Future flow (not active)
        </div>
        <div className="font-mono mt-1">
          reply_received → communications → conversations → ai_actions → draft reply → founder approval → send
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Captured replies</div>
          <div className="font-mono text-sm">{replyCount}</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">All eligible events</div>
          <div className="font-mono text-sm">{previews.length}</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Apply available</div>
          <div className="font-mono text-sm">no</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Outbound send</div>
          <div className="font-mono text-sm">disabled</div>
        </div>
      </div>

      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          {Object.entries(counts).map(([k, v]) => (
            <Badge key={k} variant="outline">{k}: {v}</Badge>
          ))}
        </div>
      )}

      <div className="rounded border border-border/60 p-2 text-[11px] space-y-1">
        <div className="font-medium">Classification preview</div>
        {previews.length === 0 && (
          <div className="text-muted-foreground">No eligible events captured yet.</div>
        )}
        {previews.slice(0, 25).map((p) => (
          <div key={p.provider_event_id} className="border border-border/40 rounded p-2 space-y-0.5">
            <div className="font-mono">
              {p.received_at} · <b>{p.normalized_event_type}</b> · {p.contact_email ?? "no-email"}
            </div>
            <div className="text-muted-foreground">
              intent: <span className="font-mono">{p.detected_intent}</span> ({Math.round((p.confidence ?? 0) * 100)}%) · action: <span className="font-mono">{p.recommended_action}</span>
            </div>
            <div className="text-muted-foreground">
              contact: {p.matched_contact_id ?? "—"} · campaign: {p.matched_liftor_campaign_id ?? "—"}
            </div>
            <div className="text-amber-300 text-[10px]">
              founder_review_required · ai_draft_allowed=false · outbound_send_allowed=false
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        No communications, conversations, AI drafts, or outbound sends are created. Apply endpoint is disabled by design.
      </p>
    </Card>
  );
}