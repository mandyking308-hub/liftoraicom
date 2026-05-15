import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'RUN CUSTOMER RETENTION HEALTH';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function statusFor(score: number) {
  if (score >= 0.75) return 'healthy';
  if (score >= 0.5) return 'watch';
  if (score >= 0.25) return 'at_risk';
  return 'critical';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin','founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id = null, contact_id = null, dry_run = true, confirmation } = body ?? {};
    const willPersist = !dry_run && confirmation === CONFIRM;

    let contactsQ = admin.from('contacts').select('id,name,email,company,assigned_business,status').limit(50);
    if (contact_id) contactsQ = contactsQ.eq('id', contact_id);
    else if (business_id) contactsQ = contactsQ.eq('assigned_business', business_id);
    const { data: contacts } = await contactsQ;

    const results: any[] = [];
    for (const c of (contacts ?? [])) {
      const cid = c.id;
      const bid = business_id ?? c.assigned_business ?? null;

      const onboardingPlans = await safe(async () => (await admin.from('customer_onboarding_plans').select('id,onboarding_status,risks').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const onboardingTasks = await safe(async () => (await admin.from('customer_onboarding_tasks').select('id,task_status,due_at').in('onboarding_plan_id', onboardingPlans.map((p: any) => p.id).length ? onboardingPlans.map((p: any) => p.id) : ['00000000-0000-0000-0000-000000000000']).limit(200)).data ?? [], [] as any[]);
      const memory = await safe(async () => (await admin.from('customer_memory_profiles').select('risk_flags,satisfaction_signals').eq('contact_id', cid).maybeSingle()).data, null as any);
      const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('csat_score,nps_score,sentiment,created_at').eq('contact_id', cid).order('created_at', { ascending: false }).limit(20)).data ?? [], [] as any[]);
      const support = await safe(async () => (await admin.from('support_interaction_reviews').select('severity,created_at').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const complaints = await safe(async () => (await admin.from('customer_complaints').select('id,severity,status,created_at').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const disputes = await safe(async () => (await admin.from('customer_disputes').select('id,status,created_at').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const reports = await safe(async () => (await admin.from('customer_quarterly_reports').select('id,report_status,reporting_period_end,renewal_risk_flags,upsell_opportunities').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const invoices = await safe(async () => (await admin.from('invoices').select('id,status,amount,created_at').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const payments = await safe(async () => (await admin.from('payments').select('id,amount,received_at').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const upsells = await safe(async () => (await admin.from('customer_upsell_recommendations').select('id,fit_score,recommendation_status').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const conversations = await safe(async () => (await admin.from('conversations').select('id,last_message_at,status').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const ledger = await safe(async () => (await admin.from('crm_interaction_ledger').select('id,occurred_at').eq('contact_id', cid).limit(200)).data ?? [], [] as any[]);

      const now = Date.now();
      const overdue = onboardingTasks.filter((t: any) => t.due_at && new Date(t.due_at).getTime() < now && t.task_status !== 'done').length;
      const onboardingApproved = onboardingPlans.filter((p: any) => ['approved','active','complete'].includes(String(p.onboarding_status))).length;
      const onboardingScore = onboardingPlans.length === 0 ? null : clamp01((onboardingApproved / Math.max(1, onboardingPlans.length)) - (overdue * 0.1));

      const csat = surveys.map((s: any) => s.csat_score).filter((n: any) => typeof n === 'number');
      const avgCsat = csat.length ? csat.reduce((a: number, b: number) => a + b, 0) / csat.length : null;
      const satisfactionScore = avgCsat == null ? null : clamp01(avgCsat / 5);

      const recent30 = ledger.filter((l: any) => l.occurred_at && now - new Date(l.occurred_at).getTime() < 30 * 86400000).length;
      const engagementScore = clamp01((recent30 + conversations.length) / 20);

      const highSupport = support.filter((s: any) => String(s.severity).toLowerCase() === 'high').length;
      const supportScore = clamp01(1 - (highSupport / 5));

      const overdueInv = invoices.filter((i: any) => String(i.status).toLowerCase() === 'overdue').length;
      const paidInv = invoices.filter((i: any) => String(i.status).toLowerCase() === 'paid').length;
      const paymentScore = invoices.length === 0 ? null : clamp01((paidInv / invoices.length) - (overdueInv * 0.2));

      const openComplaints = complaints.filter((c: any) => !['resolved','closed'].includes(String(c.status))).length;
      const openDisputes = disputes.filter((d: any) => !['resolved','closed'].includes(String(d.status))).length;
      const complaintRiskScore = clamp01((openComplaints + openDisputes) / 4);

      const upsellFitScore = upsells.length ? clamp01(upsells.reduce((s: number, u: any) => s + (Number(u.fit_score) || 0), 0) / upsells.length) : null;

      const renewalRiskFlags = reports.flatMap((r: any) => Array.isArray(r.renewal_risk_flags) ? r.renewal_risk_flags : []);
      const memoryRisks = Array.isArray(memory?.risk_flags) ? memory.risk_flags : [];
      const renewalRiskScore = clamp01(((renewalRiskFlags.length + memoryRisks.length + openComplaints) / 5) + (avgCsat != null && avgCsat < 3 ? 0.3 : 0));

      const positives = [onboardingScore, satisfactionScore, engagementScore, supportScore, paymentScore].filter((v): v is number => typeof v === 'number');
      const positiveAvg = positives.length ? positives.reduce((a, b) => a + b, 0) / positives.length : 0.5;
      const overallHealth = clamp01(positiveAvg - (complaintRiskScore * 0.3) - (renewalRiskScore * 0.3));
      const healthStatus = statusFor(overallHealth);

      const evidence: any[] = [
        { kind: 'onboarding_plans', count: onboardingPlans.length, overdue_tasks: overdue },
        { kind: 'surveys', count: surveys.length, avg_csat: avgCsat },
        { kind: 'support_high_severity', count: highSupport },
        { kind: 'complaints_open', count: openComplaints },
        { kind: 'disputes_open', count: openDisputes },
        { kind: 'invoices', total: invoices.length, paid: paidInv, overdue: overdueInv },
        { kind: 'engagement_30d', interactions: recent30, conversations: conversations.length },
        { kind: 'renewal_signals', flags: renewalRiskFlags.length + memoryRisks.length },
        { kind: 'upsell_opportunities', count: upsells.length },
      ];

      const recommendations: any[] = [];
      if ((onboardingScore ?? 1) < 0.5 || overdue >= 2) recommendations.push({ recommendation_type: 'onboarding_followup', priority_level: 'high', title: 'Onboarding follow-up needed', summary: `Overdue tasks: ${overdue}. Plans: ${onboardingPlans.length}.`, recommended_action: 'Founder review onboarding plan and unblock customer.' });
      if (avgCsat != null && avgCsat < 3) recommendations.push({ recommendation_type: 'satisfaction_recovery', priority_level: 'high', title: 'Low CSAT — recovery review', summary: `Average CSAT ${avgCsat.toFixed(2)} across ${csat.length} responses.`, recommended_action: 'Open survey panel and book human check-in.' });
      if (openComplaints > 0) recommendations.push({ recommendation_type: 'complaint_recovery', priority_level: 'high', title: 'Open complaint(s) — recovery plan', summary: `${openComplaints} open complaint(s).`, recommended_action: 'Review complaints panel and approve resolution plan.' });
      if (overdueInv > 0) recommendations.push({ recommendation_type: 'payment_dispute_review', priority_level: 'high', title: 'Overdue invoice review', summary: `${overdueInv} overdue invoice(s).`, recommended_action: 'Founder review payment status before any external follow-up.' });
      if (reports.length === 0 || (reports[0]?.reporting_period_end && (now - new Date(reports[0].reporting_period_end).getTime()) > 90 * 86400000)) recommendations.push({ recommendation_type: 'quarterly_review_due', priority_level: 'normal', title: 'Quarterly report due', summary: 'No quarterly report in last 90 days.', recommended_action: 'Generate quarterly report draft for founder review.' });
      if ((upsellFitScore ?? 0) >= 0.6) recommendations.push({ recommendation_type: 'upsell_conversation', priority_level: 'normal', title: 'Upsell opportunity', summary: `Upsell fit ${(upsellFitScore! * 100).toFixed(0)}%.`, recommended_action: 'Founder review upsell recommendation before any outreach.' });
      if (renewalRiskScore >= 0.5) recommendations.push({ recommendation_type: 'renewal_checkin', priority_level: 'high', title: 'Renewal risk', summary: `Renewal risk score ${renewalRiskScore.toFixed(2)}.`, recommended_action: 'Schedule human check-in with customer.' });
      if (highSupport >= 2) recommendations.push({ recommendation_type: 'support_escalation', priority_level: 'high', title: 'Support escalation', summary: `${highSupport} high-severity support items.`, recommended_action: 'Escalate to founder/account manager.' });
      if (overallHealth < 0.4) recommendations.push({ recommendation_type: 'human_call_recommended', priority_level: 'high', title: 'Recommend human call', summary: `Overall health ${overallHealth.toFixed(2)} (${healthStatus}).`, recommended_action: 'Founder personally call customer.' });

      const scoreRow = {
        business_id: bid,
        contact_id: cid,
        score_date: new Date().toISOString().slice(0, 10),
        onboarding_score: onboardingScore,
        satisfaction_score: satisfactionScore,
        engagement_score: engagementScore,
        support_score: supportScore,
        payment_score: paymentScore,
        complaint_risk_score: complaintRiskScore,
        upsell_fit_score: upsellFitScore,
        renewal_risk_score: renewalRiskScore,
        overall_health_score: overallHealth,
        health_status: healthStatus,
        recommended_action: recommendations[0]?.recommended_action ?? 'Monitor — no action required.',
        evidence,
      };

      let persisted = { score_id: null as string | null, recommendation_ids: [] as string[] };
      if (willPersist) {
        const ins = await admin.from('customer_retention_scores').insert(scoreRow).select('id').maybeSingle();
        persisted.score_id = ins.data?.id ?? null;
        if (recommendations.length) {
          const recRows = recommendations.map((r) => ({ ...r, business_id: bid, contact_id: cid, owner_agent_key: 'customer_success_agent', founder_review_required: true, status: 'pending', evidence }));
          const recIns = await admin.from('retention_risk_recommendations').insert(recRows).select('id');
          persisted.recommendation_ids = (recIns.data ?? []).map((x: any) => x.id);
        }
      }

      results.push({ contact_id: cid, contact_name: c.name, business_id: bid, score: scoreRow, recommendations, persisted });
    }

    return new Response(JSON.stringify({
      ok: true,
      mode: willPersist ? 'persisted' : 'dry_run',
      confirmation_required: CONFIRM,
      external_send: false,
      financial_mutation: false,
      private_notes_exposed: false,
      contacts_evaluated: results.length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});