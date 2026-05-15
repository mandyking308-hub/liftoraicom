import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AIGovernanceQualityPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["ai-governance-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-governance-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("AI governance refreshed."); } finally { setBusy(false); } };

  const dryRunCheck = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-draft-quality-check", {
        body: {
          dry_run: true,
          draft_type: 'sandbox_test',
          agent_key: 'sandbox',
          draft_text: 'We guarantee 200% ROI within 30 days. Our FDA-approved system beats every competitor.',
          crm_context_loaded: false,
          customer_memory_loaded: false,
          knowledge_refs: [],
        },
      });
      if (error) throw error;
      toast.success(`Dry-run quality: ${data?.scores?.quality_score}. Block: ${data?.block_customer_view ? 'YES' : 'no'}.`);
    } catch (e: any) {
      toast.error(`Dry-run failed: ${e.message ?? e}`);
    } finally { setBusy(false); }
  };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-ai-governance-quality">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> AI Governance · Draft Quality · Prompt Registry</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-send · No publish · Founder approval required</Badge>
            <Button size="sm" variant="outline" onClick={dryRunCheck} disabled={busy}>Dry-run check</Button>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Reviews" value={s.reviews_total} />
          <Tile label="Avg quality" value={s.avg_quality} tone={(s.avg_quality ?? 100) < 70 ? 'text-yellow-300' : ''} />
          <Tile label="Avg grounding" value={s.avg_grounding} tone={(s.avg_grounding ?? 100) < 60 ? 'text-yellow-300' : ''} />
          <Tile label="Avg compliance" value={s.avg_compliance} tone={(s.avg_compliance ?? 100) < 70 ? 'text-yellow-300' : ''} />
          <Tile label="Low quality" value={s.low_quality} tone={s.low_quality ? 'text-destructive' : ''} />
          <Tile label="Unsupported claims" value={s.with_unsupported_claims} tone={s.with_unsupported_claims ? 'text-destructive' : ''} />
          <Tile label="Missing context" value={s.missing_context} tone={s.missing_context ? 'text-yellow-300' : ''} />
          <Tile label="Awaiting founder" value={s.awaiting_founder_review} tone={s.awaiting_founder_review ? 'text-yellow-300' : ''} />
          <Tile label="Prompts active" value={s.prompts_active} />
          <Tile label="Prompts unapproved" value={s.prompts_unapproved} tone={s.prompts_unapproved ? 'text-yellow-300' : ''} />
          <Tile label="High-risk prompts" value={s.prompts_high_risk} tone={s.prompts_high_risk ? 'text-destructive' : ''} />
          <Tile label="Review overdue" value={s.prompts_review_overdue} tone={s.prompts_review_overdue ? 'text-yellow-300' : ''} />
        </div>

        {data?.disclaimer && (
          <div className="text-[11px] text-muted-foreground italic flex items-start gap-1"><AlertTriangle size={11} className="mt-0.5" />{data.disclaimer}</div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next actions</div>
            <ul className="space-y-1 max-h-56 overflow-auto text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.label}</span>
                  <span className="text-muted-foreground truncate max-w-[40%]" title={a.fix}>{a.fix ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(data?.agent_warnings ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Agent quality warnings</div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {data.agent_warnings.map((a: any) => (
                <div key={a.agent} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <span className="font-medium">{a.agent}</span>
                  <span className="text-muted-foreground">{a.low_quality}/{a.drafts} low ({a.low_rate}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.risky_drafts ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Drafts with unsupported claims</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.risky_drafts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{r.draft_type}</Badge>
                    <span className="text-muted-foreground truncate max-w-[260px]">{(r.unsupported_claims ?? []).slice(0,2).join(' | ')}</span>
                  </div>
                  <div className="text-muted-foreground">q:{r.quality_score} · c:{r.compliance_score}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
