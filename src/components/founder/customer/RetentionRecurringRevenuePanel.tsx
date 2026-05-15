import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartPulse, ShieldAlert, PhoneCall, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type Score = {
  id: string; contact_id: string | null; business_id: string | null;
  overall_health_score: number | null; health_status: string | null;
  onboarding_score: number | null; satisfaction_score: number | null;
  engagement_score: number | null; support_score: number | null;
  payment_score: number | null; complaint_risk_score: number | null;
  upsell_fit_score: number | null; renewal_risk_score: number | null;
  recommended_action: string | null; score_date: string;
};
type Rec = {
  id: string; contact_id: string | null; business_id: string | null;
  recommendation_type: string; priority_level: string; title: string;
  summary: string | null; recommended_action: string | null;
  owner_agent_key: string | null; founder_review_required: boolean; status: string;
};

export default function RetentionRecurringRevenuePanel({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [contactInput, setContactInput] = useState("");

  const { data } = useQuery({
    queryKey: ['retention-recurring-revenue', businessId ?? null],
    queryFn: async () => {
      let sQ = supabase.from('customer_retention_scores').select('*').order('score_date', { ascending: false }).limit(200);
      let rQ = supabase.from('retention_risk_recommendations').select('*').order('created_at', { ascending: false }).limit(200);
      let oQ = supabase.from('customer_onboarding_plans').select('id,contact_id,business_id,onboarding_status,risks').limit(200);
      let cQ = supabase.from('customer_complaints').select('id,contact_id,business_id,severity,status').limit(200);
      let dQ = supabase.from('customer_disputes').select('id,contact_id,business_id,status').limit(200);
      let qrQ = supabase.from('customer_quarterly_reports').select('id,contact_id,business_id,report_status,reporting_period_end').limit(200);
      let svQ = supabase.from('customer_survey_responses').select('contact_id,business_id,csat_score,nps_score,sentiment').limit(300);
      let upQ = supabase.from('customer_upsell_recommendations').select('id,contact_id,business_id,recommendation_status,fit_score,reason').limit(200);
      if (businessId) {
        sQ = sQ.eq('business_id', businessId); rQ = rQ.eq('business_id', businessId);
        oQ = oQ.eq('business_id', businessId); cQ = cQ.eq('business_id', businessId);
        dQ = dQ.eq('business_id', businessId); qrQ = qrQ.eq('business_id', businessId);
        svQ = svQ.eq('business_id', businessId); upQ = upQ.eq('business_id', businessId);
      }
      const [s, r, o, c, d, qr, sv, up] = await Promise.all([sQ, rQ, oQ, cQ, dQ, qrQ, svQ, upQ]);
      return {
        scores: (s.data ?? []) as Score[],
        recs: (r.data ?? []) as Rec[],
        onboarding: o.data ?? [],
        complaints: c.data ?? [],
        disputes: d.data ?? [],
        reports: qr.data ?? [],
        surveys: sv.data ?? [],
        upsells: up.data ?? [],
      };
    },
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    const scores = data?.scores ?? [];
    const recs = data?.recs ?? [];
    const onboarding = data?.onboarding ?? [];
    const complaints = data?.complaints ?? [];
    const disputes = data?.disputes ?? [];
    const reports = data?.reports ?? [];
    const surveys = data?.surveys ?? [];
    const upsells = data?.upsells ?? [];

    // most recent score per contact
    const latest = new Map<string, Score>();
    for (const s of scores) {
      if (!s.contact_id) continue;
      if (!latest.has(s.contact_id)) latest.set(s.contact_id, s);
    }
    const latestList = Array.from(latest.values());
    const inOnboarding = onboarding.filter((p: any) => ['draft','approved','active'].includes(String(p.onboarding_status))).length;
    const beddingIn = onboarding.filter((p: any) => String(p.onboarding_status) === 'active').length;
    const openComplaints = complaints.filter((c: any) => !['resolved','closed'].includes(String(c.status))).length;
    const openDisputes = disputes.filter((d: any) => !['resolved','closed'].includes(String(d.status))).length;
    const lowSat = surveys.filter((s: any) => typeof s.csat_score === 'number' && s.csat_score < 3).length;
    const now = Date.now();
    const reportsDue = (() => {
      const byContact = new Map<string, any>();
      for (const r of reports) { const k = r.contact_id ?? r.id; if (!byContact.has(k) || new Date(r.reporting_period_end ?? 0) > new Date(byContact.get(k)?.reporting_period_end ?? 0)) byContact.set(k, r); }
      return Array.from(byContact.values()).filter((r: any) => !r.reporting_period_end || (now - new Date(r.reporting_period_end).getTime()) > 90 * 86400000).length;
    })();
    const upsellOps = upsells.filter((u: any) => !['won','rejected','dismissed'].includes(String(u.recommendation_status))).length;
    const renewalRisks = latestList.filter((s) => (s.renewal_risk_score ?? 0) >= 0.5).length;
    const recurringAtRisk = latestList.filter((s) => (s.health_status === 'at_risk' || s.health_status === 'critical')).length;
    const checkinNeeded = recs.filter((r) => ['human_call_recommended','renewal_checkin','customer_success_checkin','satisfaction_recovery'].includes(r.recommendation_type) && r.status === 'pending').length;

    const nextActions = recs
      .filter((r) => r.status === 'pending')
      .sort((a, b) => (a.priority_level === 'high' ? -1 : 1) - (b.priority_level === 'high' ? -1 : 1))
      .slice(0, 5);

    return { latestList, inOnboarding, beddingIn, openComplaints, openDisputes, lowSat, reportsDue, upsellOps, renewalRisks, recurringAtRisk, checkinNeeded, nextActions };
  }, [data]);

  const runHealth = useMutation({
    mutationFn: async (payload: { contact_id?: string; persist: boolean }) => {
      setBusy(true);
      const body: any = { dry_run: !payload.persist };
      if (payload.persist) body.confirmation = 'RUN CUSTOMER RETENTION HEALTH';
      if (payload.contact_id) body.contact_id = payload.contact_id;
      if (businessId) body.business_id = businessId;
      const { data, error } = await supabase.functions.invoke('customer-retention-health-run', { body });
      if (error) throw error; return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Retention health ${d?.mode === 'persisted' ? 'recorded' : 'previewed'} for ${d?.contacts_evaluated ?? 0} contact(s).`);
      qc.invalidateQueries({ queryKey: ['retention-recurring-revenue'] });
    },
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
    <Card className="bg-card border-border/50" id="sec-retention-recurring">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><HeartPulse size={14} className="text-primary" /> Human Layer · Retention & Recurring Revenue</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-send · Founder approval</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Tile label="In onboarding" value={summary.inOnboarding} />
          <Tile label="Bedding in" value={summary.beddingIn} />
          <Tile label="Check-in needed" value={summary.checkinNeeded} tone={summary.checkinNeeded ? 'text-yellow-300' : ''} />
          <Tile label="Open complaints" value={summary.openComplaints} tone={summary.openComplaints ? 'text-destructive' : ''} />
          <Tile label="Open disputes" value={summary.openDisputes} tone={summary.openDisputes ? 'text-destructive' : ''} />
          <Tile label="Low satisfaction" value={summary.lowSat} tone={summary.lowSat ? 'text-yellow-300' : ''} />
          <Tile label="Quarterly reports due" value={summary.reportsDue} />
          <Tile label="Upsell opportunities" value={summary.upsellOps} />
          <Tile label="Renewal risks" value={summary.renewalRisks} tone={summary.renewalRisks ? 'text-destructive' : ''} />
          <Tile label="Recurring revenue at risk" value={summary.recurringAtRisk} tone={summary.recurringAtRisk ? 'text-destructive' : ''} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Input placeholder="Contact UUID (optional)" value={contactInput} onChange={(e) => setContactInput(e.target.value)} className="h-8 max-w-[260px] text-xs" />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => runHealth.mutate({ contact_id: contactInput || undefined, persist: false })}>Preview health (dry-run)</Button>
          <Button size="sm" disabled={busy} onClick={() => runHealth.mutate({ contact_id: contactInput || undefined, persist: true })}>
            <ShieldAlert size={12} /> Record health & recommendations
          </Button>
          <span className="text-[10px] text-muted-foreground">Confirmation phrase: RUN CUSTOMER RETENTION HEALTH (handled automatically).</span>
        </div>

        <div>
          <div className="text-xs font-semibold mb-1 flex items-center gap-1"><PhoneCall size={12} /> Next 5 human actions</div>
          {summary.nextActions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No pending recommendations. Run health to refresh.</p>
          ) : (
            <div className="space-y-1">
              {summary.nextActions.map((r) => (
                <div key={r.id} className="rounded-md border border-border/40 bg-secondary/20 p-2 text-xs flex items-start gap-2">
                  <Badge variant="outline" className={`text-[10px] ${r.priority_level === 'high' ? 'border-destructive/40 text-destructive' : 'border-border/50 text-muted-foreground'}`}>{r.priority_level}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.recommended_action ?? r.summary}</div>
                    <div className="text-[10px] text-muted-foreground">type: {r.recommendation_type} · owner: {r.owner_agent_key ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold mb-1">Latest customer health (top 6)</div>
          {summary.latestList.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No retention scores yet — run health to generate.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {summary.latestList.slice(0, 6).map((s) => (
                <div key={s.id} className="rounded-md border border-border/40 bg-secondary/20 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] truncate">{s.contact_id?.slice(0, 8)}…</span>
                    <Badge variant="outline" className={`text-[10px] ${s.health_status === 'critical' || s.health_status === 'at_risk' ? 'border-destructive/40 text-destructive' : s.health_status === 'watch' ? 'border-yellow-500/40 text-yellow-300' : 'border-green-500/40 text-green-300'}`}>{s.health_status ?? '—'}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    health {s.overall_health_score != null ? (s.overall_health_score * 100).toFixed(0) + '%' : '—'} · sat {s.satisfaction_score != null ? (s.satisfaction_score * 100).toFixed(0) + '%' : '—'} · renewal-risk {s.renewal_risk_score != null ? (s.renewal_risk_score * 100).toFixed(0) + '%' : '—'} · upsell-fit {s.upsell_fit_score != null ? (s.upsell_fit_score * 100).toFixed(0) + '%' : '—'}
                  </div>
                  <div className="text-[11px] mt-1 truncate">{s.recommended_action}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] pt-1">
          <Link to="/founder/command-centre#sec-customer-onboarding" className="flex items-center gap-1 text-primary hover:underline">Onboarding <ArrowRight size={10} /></Link>
          <Link to="/founder/command-centre#sec-complaints-disputes" className="flex items-center gap-1 text-primary hover:underline">Complaints <ArrowRight size={10} /></Link>
          <Link to="/founder/command-centre#sec-customer-feedback" className="flex items-center gap-1 text-primary hover:underline">Surveys <ArrowRight size={10} /></Link>
          <Link to="/founder/command-centre#sec-human-account-manager" className="flex items-center gap-1 text-primary hover:underline">Quarterly reports <ArrowRight size={10} /></Link>
          <Link to="/founder/command-centre#sec-customer-success-upsell" className="flex items-center gap-1 text-primary hover:underline">Success & upsell <ArrowRight size={10} /></Link>
          <Link to="/founder/command-centre#sec-customer-memory" className="flex items-center gap-1 text-primary hover:underline">Memory & context guard <ArrowRight size={10} /></Link>
        </div>
      </CardContent>
    </Card>
  );
}