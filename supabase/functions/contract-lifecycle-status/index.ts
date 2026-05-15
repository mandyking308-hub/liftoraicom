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

    const contracts = await safe(async () => (await admin.from('contract_register').select('*').order('renewal_date', { ascending: true, nullsFirst: false })).data ?? [], [] as any[]);
    const procurement = await safe(async () => (await admin.from('procurement_requests').select('*').order('created_at', { ascending: false })).data ?? [], [] as any[]);
    const supplierRisk = await safe(async () => (await admin.from('supplier_risk_reviews').select('*').order('reviewed_at', { ascending: false, nullsFirst: false })).data ?? [], [] as any[]);
    const suppliers = await safe(async () => (await admin.from('suppliers').select('id,name')).data ?? [], [] as any[]);

    const renewalsDue = contracts.filter((c: any) => c.renewal_date && c.renewal_date >= today && c.renewal_date <= horizonIso);
    const expiringSoon = contracts.filter((c: any) => c.expiry_date && c.expiry_date >= today && c.expiry_date <= horizonIso);
    const expired = contracts.filter((c: any) => c.expiry_date && c.expiry_date < today && c.status !== 'terminated');
    const unsigned = contracts.filter((c: any) => !c.signed && !['draft','cancelled'].includes(String(c.status)));
    const highRisk = contracts.filter((c: any) => c.risk_level === 'high');
    const legalReview = contracts.filter((c: any) => c.legal_review_recommended);
    const supplierIdsWithContract = new Set(contracts.filter((c: any) => c.related_supplier_id).map((c: any) => c.related_supplier_id));
    const suppliersMissingContract = suppliers.filter((s: any) => !supplierIdsWithContract.has(s.id));

    const procPending = procurement.filter((p: any) => ['draft','pending','submitted'].includes(String(p.status)));
    const procFounderApproval = procurement.filter((p: any) => p.founder_approval_required && !p.approved_at && !p.rejected_at);

    const byStatus: Record<string, number> = {};
    for (const c of contracts) byStatus[c.status ?? 'unknown'] = (byStatus[c.status ?? 'unknown'] ?? 0) + 1;

    const nextActions: any[] = [];
    for (const c of expired.slice(0, 5)) nextActions.push({ kind: 'expired_contract', label: c.contract_name, expiry_date: c.expiry_date });
    for (const c of renewalsDue.slice(0, 5)) nextActions.push({ kind: 'renewal_due', label: c.contract_name, renewal_date: c.renewal_date });
    for (const c of unsigned.slice(0, 5)) nextActions.push({ kind: 'unsigned_contract', label: c.contract_name, status: c.status });
    for (const p of procFounderApproval.slice(0, 5)) nextActions.push({ kind: 'procurement_pending_approval', label: p.request_name, est: p.estimated_cost });

    return new Response(JSON.stringify({
      ok: true,
      external_signature_attempted: false,
      external_send_attempted: false,
      spend_approved_automatically: false,
      legal_advice_provided: false,
      disclaimer: 'Operational tracking only. Not legal advice. No external signature or send performed.',
      summary: {
        contracts_count: contracts.length,
        contracts_by_status: byStatus,
        renewals_due_90d: renewalsDue.length,
        expiring_soon_90d: expiringSoon.length,
        expired_open: expired.length,
        unsigned_count: unsigned.length,
        high_risk_count: highRisk.length,
        legal_review_recommended_count: legalReview.length,
        suppliers_total: suppliers.length,
        suppliers_missing_contract: suppliersMissingContract.length,
        procurement_total: procurement.length,
        procurement_pending: procPending.length,
        procurement_pending_founder_approval: procFounderApproval.length,
        supplier_risk_reviews_count: supplierRisk.length,
        supplier_risk_high: supplierRisk.filter((r: any) => r.risk_level === 'high').length,
      },
      contracts: contracts.slice(0, 50),
      renewals_due: renewalsDue.slice(0, 20),
      unsigned: unsigned.slice(0, 20),
      high_risk: highRisk.slice(0, 20),
      suppliers_missing_contract: suppliersMissingContract.slice(0, 20),
      procurement_pending: procPending.slice(0, 20),
      supplier_risk_reviews: supplierRisk.slice(0, 20),
      next_actions: nextActions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});