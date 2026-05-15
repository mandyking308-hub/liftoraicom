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

    const entities = await safe(async () => (await admin.from('group_entity_register').select('*')).data ?? [], [] as any[]);
    const obligations = await safe(async () => (await admin.from('group_obligation_calendar').select('*').order('due_date', { ascending: true, nullsFirst: false })).data ?? [], [] as any[]);
    const reviews = await safe(async () => (await admin.from('group_governance_reviews').select('*').order('created_at', { ascending: false }).limit(50)).data ?? [], [] as any[]);
    const businesses = await safe(async () => (await admin.from('businesses').select('id,name')).data ?? [], [] as any[]);

    const overdue = obligations.filter((o: any) => o.due_date && o.due_date < today && !['completed','cancelled'].includes(String(o.status)));
    const upcoming = obligations.filter((o: any) => o.due_date && o.due_date >= today && o.due_date <= horizonIso && !['completed','cancelled'].includes(String(o.status)));
    const undated = obligations.filter((o: any) => !o.due_date && !['completed','cancelled'].includes(String(o.status)));
    const adviserActions = obligations.filter((o: any) => o.adviser_required && !['completed','cancelled'].includes(String(o.status)));
    const licenceRenewals = obligations.filter((o: any) => o.obligation_type === 'licence_renewal' && !['completed','cancelled'].includes(String(o.status)));
    const insuranceRenewals = obligations.filter((o: any) => o.obligation_type === 'insurance_renewal' && !['completed','cancelled'].includes(String(o.status)));
    const reviewsDue = reviews.filter((r: any) => ['draft','in_progress','pending'].includes(String(r.review_status)));

    const riskScore = (e: any) => {
      const overdueForEntity = overdue.filter((o: any) => o.entity_id === e.id).length;
      const baseLevel = e.risk_level === 'high' ? 2 : e.risk_level === 'low' ? 0 : 1;
      return baseLevel + overdueForEntity;
    };
    const ranked = [...entities].sort((a, b) => riskScore(b) - riskScore(a));
    const highestRiskEntity = ranked[0] ?? null;

    const nextActions: any[] = [];
    for (const o of overdue.slice(0, 5)) nextActions.push({ kind: 'overdue_obligation', label: o.obligation_name, due_date: o.due_date, entity_id: o.entity_id });
    for (const o of upcoming.slice(0, 5)) nextActions.push({ kind: 'upcoming_obligation', label: o.obligation_name, due_date: o.due_date, entity_id: o.entity_id });
    for (const r of reviewsDue.slice(0, 3)) nextActions.push({ kind: 'governance_review', label: r.review_type, status: r.review_status, entity_id: r.entity_id });

    return new Response(JSON.stringify({
      ok: true,
      external_filings_submitted: false,
      external_payments_made: false,
      banking_api_called: false,
      summary: {
        entities_count: entities.length,
        businesses_count: businesses.length,
        obligations_total: obligations.length,
        obligations_overdue: overdue.length,
        obligations_upcoming_90d: upcoming.length,
        obligations_undated: undated.length,
        adviser_actions_open: adviserActions.length,
        licence_renewals_open: licenceRenewals.length,
        insurance_renewals_open: insuranceRenewals.length,
        governance_reviews_due: reviewsDue.length,
        highest_risk_entity: highestRiskEntity ? { id: highestRiskEntity.id, name: highestRiskEntity.entity_name, risk_level: highestRiskEntity.risk_level } : null,
      },
      entities: ranked.map((e: any) => ({
        id: e.id, entity_name: e.entity_name, jurisdiction: e.jurisdiction, entity_type: e.entity_type,
        entity_status: e.entity_status, risk_level: e.risk_level,
        overdue_obligations: overdue.filter((o: any) => o.entity_id === e.id).length,
        upcoming_obligations: upcoming.filter((o: any) => o.entity_id === e.id).length,
        next_filing_due_at: e.next_filing_due_at, next_review_due_at: e.next_review_due_at,
      })),
      next_actions: nextActions.slice(0, 10),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});