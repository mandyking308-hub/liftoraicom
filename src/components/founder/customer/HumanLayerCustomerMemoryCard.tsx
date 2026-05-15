import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Heart, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function HumanLayerCustomerMemoryCard({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ['human-layer-customer-memory', businessId ?? null],
    queryFn: async () => {
      let lQ = supabase.from('crm_interaction_ledger').select('id,contact_id,matched_status,winback_signal,churn_risk_signal,upsell_signal,complaint_signal,satisfaction_signal,occurred_at').order('occurred_at', { ascending: false }).limit(500);
      let mQ = supabase.from('customer_memory_profiles').select('id,contact_id,risk_flags,last_refreshed_at,profile_status,business_id');
      let sQ = supabase.from('customer_survey_responses').select('id,contact_id,csat_score,sentiment,created_at,business_id').order('created_at', { ascending: false }).limit(50);
      let cQ = supabase.from('customer_complaints').select('id,contact_id,status,severity,business_id');
      let dQ = supabase.from('customer_disputes').select('id,contact_id,status,business_id');
      let wQ = supabase.from('customer_winback_plans').select('id,contact_id,plan_status,churn_risk_level,winback_reason,business_id').order('created_at', { ascending: false }).limit(50);
      let aQ = supabase.from('founder_approval_items').select('id,approval_type,title,priority_level,status,business_id').eq('status','pending').order('created_at',{ascending:false}).limit(50);
      if (businessId) { mQ = mQ.eq('business_id', businessId); sQ = sQ.eq('business_id', businessId); cQ = cQ.eq('business_id', businessId); dQ = dQ.eq('business_id', businessId); wQ = wQ.eq('business_id', businessId); aQ = aQ.eq('business_id', businessId); }
      const [l, m, s, c, d, w, a] = await Promise.all([lQ, mQ, sQ, cQ, dQ, wQ, aQ]);
      return { ledger: l.data ?? [], memory: m.data ?? [], surveys: s.data ?? [], complaints: c.data ?? [], disputes: d.data ?? [], winback: w.data ?? [], approvals: a.data ?? [] };
    },
    staleTime: 30_000,
  });

  const ledger = data?.ledger ?? [];
  const memory = data?.memory ?? [];
  const surveys = data?.surveys ?? [];
  const complaints = data?.complaints ?? [];
  const disputes = data?.disputes ?? [];
  const winback = data?.winback ?? [];
  const approvals = data?.approvals ?? [];

  const captured = ledger.length;
  const unmatched = ledger.filter((l: any) => l.matched_status === 'unmatched').length;
  const contactsWithMemory = new Set(memory.map((m: any) => m.contact_id).filter(Boolean)).size;
  const contactsInLedger = new Set(ledger.map((l: any) => l.contact_id).filter(Boolean)).size;
  const contactsMissing = Math.max(0, contactsInLedger - contactsWithMemory);
  const newSurveys = surveys.filter((s: any) => Date.now() - new Date(s.created_at).getTime() < 30 * 86400000).length;
  const openComplaints = complaints.filter((c: any) => !['resolved','closed'].includes(String(c.status))).length;
  const openDisputes = disputes.filter((d: any) => !['resolved','closed'].includes(String(d.status))).length;
  const recoveryPending = approvals.filter((a: any) => a.approval_type === 'complaint_recovery').length;
  const winbackPending = winback.filter((w: any) => ['draft','pending','in_review'].includes(String(w.plan_status))).length;
  const inactive = winback.filter((w: any) => w.winback_reason?.includes('inactive')).length;
  const unhappy = winback.filter((w: any) => w.winback_reason?.includes('unhappy')).length || surveys.filter((s: any) => typeof s.csat_score === 'number' && s.csat_score < 3).length;
  const upsellSignals = ledger.filter((l: any) => l.upsell_signal).length;
  const retentionRisks = winback.filter((w: any) => w.churn_risk_level === 'high').length;
  const lastSync = memory.map((m: any) => m.last_refreshed_at).filter(Boolean).sort().slice(-1)[0] ?? '—';

  const next5 = approvals.slice(0, 5);

  const refresh = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('customer-memory-refresh-from-events', { body: { dry_run: false, max_contacts: 25, business_id: businessId ?? null } });
      if (error) throw error; return data;
    },
    onSuccess: (d: any) => { toast.success(`Memory refreshed for ${d?.contacts_refreshed ?? 0} contact(s).`); qc.invalidateQueries({ queryKey: ['human-layer-customer-memory'] }); },
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
    <Card className="bg-card border-border/50" id="sec-human-layer-memory">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Brain size={14} className="text-primary" /> Human Layer · CRM Memory & Win-Back</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-send · Founder approval</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Tile label="CRM interactions captured" value={captured} />
          <Tile label="Unmatched (need review)" value={unmatched} tone={unmatched ? 'text-yellow-300' : ''} />
          <Tile label="Contacts with memory" value={contactsWithMemory} />
          <Tile label="Contacts missing memory" value={contactsMissing} tone={contactsMissing ? 'text-yellow-300' : ''} />
          <Tile label="New survey outcomes" value={newSurveys} />
          <Tile label="Open complaints" value={openComplaints} tone={openComplaints ? 'text-destructive' : ''} />
          <Tile label="Open disputes" value={openDisputes} tone={openDisputes ? 'text-destructive' : ''} />
          <Tile label="Recovery actions pending" value={recoveryPending} />
          <Tile label="Win-back plans pending" value={winbackPending} />
          <Tile label="Inactive customers" value={inactive} />
          <Tile label="Unhappy customers" value={unhappy} tone={unhappy ? 'text-yellow-300' : ''} />
          <Tile label="Upsell signals" value={upsellSignals} />
          <Tile label="Retention risks" value={retentionRisks} tone={retentionRisks ? 'text-destructive' : ''} />
          <Tile label="Last memory sync" value={typeof lastSync === 'string' ? lastSync.slice(0, 10) : '—'} />
          <Tile label="Owner agent" value="winback_agent" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => refresh.mutate()}><Heart size={12} /> Refresh customer memory</Button>
          <Button size="sm" disabled={busy} onClick={async () => { const { data, error } = await supabase.functions.invoke('winback-agent-run', { body: { dry_run: true, business_id: businessId ?? null, max_items: 10 } }); if (error) toast.error(error.message); else toast.success(`Win-back preview: ${(data as any)?.candidates ?? 0} candidate(s)`); }}><ShieldAlert size={12} /> Win-back preview (dry-run)</Button>
          <span className="text-[10px] text-muted-foreground">RUN WINBACK AGENT confirmation required to persist plans.</span>
        </div>
        <div>
          <div className="text-xs font-semibold mb-1">Next 5 human / customer success actions</div>
          {next5.length === 0 ? <p className="text-[11px] text-muted-foreground">No pending approvals.</p> : (
            <div className="space-y-1">
              {next5.map((a: any) => (
                <div key={a.id} className="rounded-md border border-border/40 bg-secondary/20 p-2 text-xs flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${a.priority_level === 'high' ? 'border-destructive/40 text-destructive' : 'border-border/50 text-muted-foreground'}`}>{a.priority_level}</Badge>
                  <span className="truncate flex-1">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground">{a.approval_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}