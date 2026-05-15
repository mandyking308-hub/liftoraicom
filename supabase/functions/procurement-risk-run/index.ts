import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

function scoreSupplier(s: any, contracts: any[], procurement: any[]) {
  const sContracts = contracts.filter((c: any) => c.related_supplier_id === s.id);
  const sProc = procurement.filter((p: any) => p.supplier_id === s.id);
  const hasContract = sContracts.length > 0;
  const hasSignedContract = sContracts.some((c: any) => c.signed);
  const overdueRenewal = sContracts.some((c: any) => c.renewal_date && c.renewal_date < new Date().toISOString().slice(0, 10));
  const totalSpendEst = sProc.reduce((a: number, p: any) => a + Number(p.estimated_cost ?? 0), 0);

  const risks: string[] = [];
  if (!hasContract) risks.push('no_contract_on_file');
  if (hasContract && !hasSignedContract) risks.push('contract_unsigned');
  if (overdueRenewal) risks.push('renewal_overdue');
  if (totalSpendEst > 5000 && !hasSignedContract) risks.push('material_spend_without_signed_contract');

  const compliance_score = hasSignedContract ? 80 : hasContract ? 50 : 25;
  const reliability_score = 60;
  const performance_score = 60;
  const cost_score = 60;
  const capacity_score = 60;

  let risk_level: 'low'|'medium'|'high' = 'medium';
  if (risks.length >= 2 || risks.includes('material_spend_without_signed_contract')) risk_level = 'high';
  else if (risks.length === 0) risk_level = 'low';

  const recommended_action = !hasContract
    ? 'Initiate supplier_agreement contract — founder review required.'
    : !hasSignedContract
      ? 'Send contract to supplier for signature after founder/legal review.'
      : overdueRenewal
        ? 'Renew or terminate contract — founder review required.'
        : 'No action required this cycle.';

  return {
    supplier_id: s.id,
    review_status: 'draft',
    performance_score, reliability_score, cost_score, compliance_score, capacity_score,
    risk_level,
    risks,
    recommended_action,
    backup_supplier_needed: risk_level === 'high',
    founder_review_required: true,
    reviewed_at: new Date().toISOString(),
  };
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
    const { dry_run = true, confirm = '' } = body ?? {};

    const suppliers = await safe(async () => (await admin.from('suppliers').select('*')).data ?? [], [] as any[]);
    const contracts = await safe(async () => (await admin.from('contract_register').select('*')).data ?? [], [] as any[]);
    const procurement = await safe(async () => (await admin.from('procurement_requests').select('*')).data ?? [], [] as any[]);

    const reviews = suppliers.map((s: any) => scoreSupplier(s, contracts, procurement));
    const high = reviews.filter((r) => r.risk_level === 'high').length;
    const medium = reviews.filter((r) => r.risk_level === 'medium').length;
    const low = reviews.filter((r) => r.risk_level === 'low').length;

    if (dry_run) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true,
        would_create: reviews.length,
        summary: { high, medium, low },
        reviews_preview: reviews.slice(0, 25),
        spend_approved: false, contracts_signed: false, contracts_sent_externally: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (confirm !== 'CREATE SUPPLIER RISK REVIEWS') {
      return new Response(JSON.stringify({ error: "confirmation required: send confirm='CREATE SUPPLIER RISK REVIEWS'" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: inserted, error } = await admin.from('supplier_risk_reviews').insert(reviews).select('id, supplier_id, risk_level, recommended_action');
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true, dry_run: false,
      created: inserted?.length ?? 0,
      summary: { high, medium, low },
      reviews: inserted,
      spend_approved: false, contracts_signed: false, contracts_sent_externally: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});