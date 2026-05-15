import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

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

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 90);
    const horizonIso = horizon.toISOString().slice(0, 10);

    const risks = await safe(async () => (await admin.from('group_risk_register').select('*').order('risk_score', { ascending: false, nullsFirst: false })).data ?? [], [] as any[]);
    const insurance = await safe(async () => (await admin.from('insurance_policy_register').select('*').order('renewal_date', { ascending: true, nullsFirst: false })).data ?? [], [] as any[]);
    const incidents = await safe(async () => (await admin.from('incident_register').select('*').order('detected_at', { ascending: false })).data ?? [], [] as any[]);
    const bcps = await safe(async () => (await admin.from('business_continuity_plans').select('*')).data ?? [], [] as any[]);

    const openRisks = risks.filter((r: any) => !['closed','accepted','transferred'].includes(String(r.status)));
    const highRisks = openRisks.filter((r: any) => Number(r.risk_score ?? 0) >= 12 || ['high','critical'].includes(String(r.impact)));
    const risksReviewOverdue = openRisks.filter((r: any) => r.review_due_at && r.review_due_at < today);
    const openIncidents = incidents.filter((i: any) => !['resolved','closed','cancelled'].includes(String(i.status)));
    const highSeverityIncidents = openIncidents.filter((i: any) => ['high','critical'].includes(String(i.severity)));
    const customerImpactIncidents = openIncidents.filter((i: any) => i.customer_impact);
    const dataImpactIncidents = openIncidents.filter((i: any) => i.data_impact);
    const regulatoryReviewFlags = openIncidents.filter((i: any) => i.regulatory_review_required);
    const insuranceReviewFlags = openIncidents.filter((i: any) => i.insurance_review_required);
    const insuranceRenewals = insurance.filter((p: any) => p.renewal_date && p.renewal_date >= today && p.renewal_date <= horizonIso && p.policy_status === 'active');
    const insuranceExpired = insurance.filter((p: any) => p.renewal_date && p.renewal_date < today && p.policy_status === 'active');
    const bcpsTestDue = bcps.filter((b: any) => b.next_test_due_at && b.next_test_due_at <= horizonIso);
    const bcpsNeverTested = bcps.filter((b: any) => !b.last_tested_at);

    const correctiveActions = openIncidents.flatMap((i: any) => Array.isArray(i.corrective_actions) ? i.corrective_actions.map((a: any) => ({ incident: i.incident_title, action: typeof a === 'string' ? a : (a?.action ?? JSON.stringify(a)) })) : []).slice(0, 30);

    const nextActions: any[] = [];
    for (const r of highRisks.slice(0, 5)) nextActions.push({ kind: 'high_risk', label: r.risk_title, category: r.risk_category });
    for (const i of highSeverityIncidents.slice(0, 5)) nextActions.push({ kind: 'high_severity_incident', label: i.incident_title, severity: i.severity });
    for (const p of insuranceExpired.slice(0, 3)) nextActions.push({ kind: 'insurance_expired', label: p.policy_type, renewal_date: p.renewal_date });
    for (const p of insuranceRenewals.slice(0, 3)) nextActions.push({ kind: 'insurance_renewal_due', label: p.policy_type, renewal_date: p.renewal_date });
    for (const b of bcpsTestDue.slice(0, 3)) nextActions.push({ kind: 'bcp_test_due', label: b.plan_name, due: b.next_test_due_at });

    return new Response(JSON.stringify({
      ok: true,
      external_notification_sent: false,
      claim_filed: false,
      regulator_notified: false,
      incident_report_sent_externally: false,
      disclaimer: 'Operational tracking only. No external notifications, claims or regulator filings performed.',
      summary: {
        risks_total: risks.length,
        risks_open: openRisks.length,
        risks_high: highRisks.length,
        risks_review_overdue: risksReviewOverdue.length,
        incidents_total: incidents.length,
        incidents_open: openIncidents.length,
        incidents_high_severity: highSeverityIncidents.length,
        customer_impact_incidents: customerImpactIncidents.length,
        data_impact_incidents: dataImpactIncidents.length,
        regulatory_review_flags: regulatoryReviewFlags.length,
        insurance_review_flags: insuranceReviewFlags.length,
        insurance_policies: insurance.length,
        insurance_renewals_90d: insuranceRenewals.length,
        insurance_expired_open: insuranceExpired.length,
        bcps_total: bcps.length,
        bcps_test_due_90d: bcpsTestDue.length,
        bcps_never_tested: bcpsNeverTested.length,
      },
      high_risks: highRisks.slice(0, 20),
      open_incidents: openIncidents.slice(0, 30),
      insurance_renewals: insuranceRenewals.slice(0, 20),
      insurance_expired: insuranceExpired.slice(0, 10),
      bcps_test_due: bcpsTestDue.slice(0, 20),
      corrective_actions: correctiveActions,
      next_actions: nextActions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});