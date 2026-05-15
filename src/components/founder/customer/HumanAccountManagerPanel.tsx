import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function HumanAccountManagerPanel({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ['human-account-manager', businessId ?? null],
    queryFn: async () => {
      let rQ = supabase.from('customer_quarterly_reports').select('id,contact_id,report_quarter,report_year,report_status,renewal_risk_flags,upsell_opportunities,customer_share_allowed,approved_at,reporting_period_end,business_id').order('created_at', { ascending: false }).limit(100);
      let aQ = supabase.from('customer_account_reviews').select('id,contact_id,account_health,review_status,recommended_human_touch,recommended_next_action,owner_agent_key,due_at,business_id').order('created_at', { ascending: false }).limit(100);
      let uQ = supabase.from('customer_usage_snapshots').select('contact_id,health_score,usage_score,satisfaction_score,snapshot_period_end,business_id').order('snapshot_period_end', { ascending: false }).limit(200);
      let gQ = supabase.from('external_action_gates').select('gate_key,enabled,confirmation_phrase,max_batch_size').eq('gate_key', 'customer_report_share_gate').maybeSingle();
      if (businessId) { rQ = rQ.eq('business_id', businessId); aQ = aQ.eq('business_id', businessId); uQ = uQ.eq('business_id', businessId); }
      const [r, a, u, g] = await Promise.all([rQ, aQ, uQ, gQ]);
      return { reports: r.data ?? [], reviews: a.data ?? [], usage: u.data ?? [], gate: g.data ?? null };
    },
    staleTime: 30_000,
  });

  const reports = data?.reports ?? [];
  const reviews = data?.reviews ?? [];
  const usage = data?.usage ?? [];
  const gate = data?.gate ?? null;

  const drafts = reports.filter((r: any) => r.report_status === 'draft');
  const approved = reports.filter((r: any) => r.report_status === 'approved');
  const readyToShare = approved.filter((r: any) => r.customer_share_allowed);
  const renewalRisks = reports.filter((r: any) => Array.isArray(r.renewal_risk_flags) && r.renewal_risk_flags.length > 0).length;
  const upsellCount = reports.reduce((n: number, r: any) => n + (Array.isArray(r.upsell_opportunities) ? r.upsell_opportunities.length : 0), 0);
  const atRiskAccounts = reviews.filter((r: any) => r.account_health === 'at_risk').length;
  const watchAccounts = reviews.filter((r: any) => r.account_health === 'watch').length;
  const avgHealth = usage.length ? (usage.reduce((s: number, u: any) => s + (Number(u.health_score) || 0), 0) / usage.length) : null;
  const avgSat = usage.length ? (usage.filter((u: any) => u.satisfaction_score != null).reduce((s: number, u: any, _i: number, arr: any[]) => s + (Number(u.satisfaction_score) || 0) / Math.max(1, arr.length), 0)) : null;

  const generate = useMutation({
    mutationFn: async (payload: { contact_id: string; business_id?: string }) => {
      setBusy(true);
      const end = new Date(); const start = new Date(end); start.setMonth(start.getMonth() - 3);
      const { data, error } = await supabase.functions.invoke('customer-quarterly-report-generate', {
        body: { ...payload, reporting_period_start: start.toISOString().slice(0, 10), reporting_period_end: end.toISOString().slice(0, 10), dry_run: false, confirmation: 'CREATE CUSTOMER QUARTERLY REPORT' },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success('Quarterly report drafted (founder review required)'); qc.invalidateQueries({ queryKey: ['human-account-manager'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const approve = useMutation({
    mutationFn: async (vars: { report_id: string; allow_share: boolean }) => {
      const { error, data } = await supabase.functions.invoke('customer-quarterly-report-approval', {
        body: { report_id: vars.report_id, decision: 'approve', allow_customer_share: vars.allow_share, confirmation: 'APPROVE CUSTOMER REPORT' },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success('Report approved'); qc.invalidateQueries({ queryKey: ['human-account-manager'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
  });

  const Tile = ({ label, value }: { label: string; value: any }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-human-account-manager">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><UserCheck size={14} className="text-primary" /> Human Layer · Account Manager & Quarterly Reports</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">
            <ShieldAlert size={10} className="mr-1" /> No external send · Founder approval required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Draft reports" value={drafts.length} />
          <Tile label="Approved" value={approved.length} />
          <Tile label="Ready to share" value={readyToShare.length} />
          <Tile label="Renewal risks" value={renewalRisks} />
          <Tile label="Upsell opportunities" value={upsellCount} />
          <Tile label="At-risk accounts" value={atRiskAccounts} />
          <Tile label="Watch list" value={watchAccounts} />
          <Tile label="Avg health" value={avgHealth != null ? avgHealth.toFixed(2) : '—'} />
        </div>
        <div className="text-[11px] text-muted-foreground">
          Share gate: <span className="text-foreground">{gate ? (gate.enabled ? 'enabled' : 'disabled (manual share only)') : 'not registered'}</span>
          {gate?.confirmation_phrase ? <> · phrase “{gate.confirmation_phrase}” · batch ≤ {gate.max_batch_size}</> : null}
        </div>
        <div>
          <div className="text-xs font-medium mb-1">Recent reports</div>
          {reports.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No reports yet. Generate one for a contact below.</p>
          ) : reports.slice(0, 6).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border/30 py-1 text-[11px]">
              <div className="truncate">
                <Badge variant="outline" className="mr-1 text-[10px]">{r.report_quarter} {r.report_year}</Badge>
                <span className="text-muted-foreground">contact</span> {r.contact_id?.slice(0, 8)} ·
                <Badge variant="outline" className="ml-1 text-[10px]">{r.report_status}</Badge>
                {Array.isArray(r.renewal_risk_flags) && r.renewal_risk_flags.length > 0 && (
                  <Badge variant="outline" className="ml-1 text-[10px] border-red-500/40 text-red-300">risk</Badge>
                )}
              </div>
              <div className="flex gap-1">
                {r.report_status === 'draft' && (
                  <>
                    <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => approve.mutate({ report_id: r.id, allow_share: false })}>Approve</Button>
                    <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => approve.mutate({ report_id: r.id, allow_share: true })}>Approve + share</Button>
                  </>
                )}
                {r.report_status === 'approved' && r.customer_share_allowed && (
                  <a className="text-primary underline" href={`/customer-report/preview`} onClick={(e) => e.preventDefault()}>share via gate</a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border/30">
          <div className="text-xs font-medium mb-1">Generate quarterly report (last 90 days)</div>
          <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const cid = String(fd.get('contact_id') ?? ''); if (!cid) { toast.error('contact_id required'); return; } generate.mutate({ contact_id: cid, business_id: businessId ?? undefined }); }}>
            <input name="contact_id" placeholder="contact UUID" className="bg-background border border-border/50 rounded px-2 py-1 text-xs flex-1 min-w-[240px]" />
            <Button size="sm" variant="outline" type="submit" disabled={busy}>Draft report</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}