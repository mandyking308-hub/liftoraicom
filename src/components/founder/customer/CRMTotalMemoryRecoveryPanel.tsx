import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function CRMTotalMemoryRecoveryPanel({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ['crm-total-memory-recovery', businessId ?? null],
    queryFn: async () => {
      let lQ = supabase.from('crm_interaction_ledger').select('source_system,source_table,matched_status,interaction_type,occurred_at').order('occurred_at', { ascending: false }).limit(500);
      let mQ = supabase.from('customer_memory_profiles').select('id,contact_id,last_refreshed_at,business_id');
      let wQ = supabase.from('customer_winback_plans').select('id,plan_status,churn_risk_level,winback_reason,business_id').order('created_at', { ascending: false }).limit(50);
      let aQ = supabase.from('founder_approval_items').select('id,approval_type,priority_level,status,business_id').eq('status', 'pending').limit(100);
      if (businessId) { mQ = mQ.eq('business_id', businessId); wQ = wQ.eq('business_id', businessId); aQ = aQ.eq('business_id', businessId); }
      const [l, m, w, a] = await Promise.all([lQ, mQ, wQ, aQ]);
      return { ledger: l.data ?? [], memory: m.data ?? [], winback: w.data ?? [], approvals: a.data ?? [] };
    },
    staleTime: 30_000,
  });

  const ledger = data?.ledger ?? [];
  const sources = Array.from(new Set(ledger.map((l: any) => l.source_table).filter(Boolean)));
  const unmatched = ledger.filter((l: any) => l.matched_status === 'unmatched').length;
  const surveyOutcomes = (data?.approvals ?? []).filter((a: any) => a.approval_type === 'survey_recovery').length;
  const recovery = (data?.approvals ?? []).filter((a: any) => a.approval_type === 'complaint_recovery').length;
  const winbackPending = (data?.winback ?? []).filter((w: any) => ['draft','pending','in_review'].includes(String(w.plan_status))).length;
  const lastRefresh = (data?.memory ?? []).map((m: any) => m.last_refreshed_at).filter(Boolean).sort().slice(-1)[0] ?? '—';
  const memoryCount = data?.memory?.length ?? 0;

  const sync = useMutation({
    mutationFn: async (persist: boolean) => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('crm-capture-sync-run', { body: { dry_run: !persist, max_per_table: 25, business_id: businessId ?? null } });
      if (error) throw error; return data;
    },
    onSuccess: (d: any) => { toast.success(`CRM capture: ${d?.total_captured ?? 0} captured, ${d?.total_skipped ?? 0} duplicates skipped, ${d?.total_unmatched ?? 0} unmatched.`); qc.invalidateQueries({ queryKey: ['crm-total-memory-recovery'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-2xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-crm-total-memory">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Database size={14} className="text-primary" /> CRM Total Memory · Recovery & Win-Back</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-send · Internal only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Source systems feeding CRM" value={sources.length} />
          <Tile label="Interactions captured (recent)" value={ledger.length} />
          <Tile label="Unmatched records" value={unmatched} tone={unmatched ? 'text-yellow-300' : ''} />
          <Tile label="Customer memory profiles" value={memoryCount} />
          <Tile label="Survey outcome actions" value={surveyOutcomes} />
          <Tile label="Complaint recovery actions" value={recovery} tone={recovery ? 'text-destructive' : ''} />
          <Tile label="Win-back plans pending" value={winbackPending} />
          <Tile label="Last memory refresh" value={typeof lastRefresh === 'string' ? lastRefresh.slice(0, 10) : '—'} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => sync.mutate(false)}><RotateCw size={12} /> CRM capture preview (dry-run)</Button>
          <Button size="sm" disabled={busy} onClick={() => sync.mutate(true)}>Run CRM capture sync</Button>
          <span className="text-[10px] text-muted-foreground">Idempotent · no provider calls · no external send · no financial mutation.</span>
        </div>
        {sources.length > 0 && (
          <div className="text-[11px] text-muted-foreground">Sources active: {sources.join(', ')}</div>
        )}
        <div className="text-[11px] text-muted-foreground">Owner agents: customer_success_agent · customer_recovery_agent · winback_agent · support_agent · finance_agent · competitor_learning_agent · marketing_agent.</div>
      </CardContent>
    </Card>
  );
}