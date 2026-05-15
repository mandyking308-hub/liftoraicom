import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const READINESS_TYPES = [
  'funding','lending','strategic_partner','partial_exit','full_sale',
  'acquisition_target','investor_update','board_pack',
];

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(url, svc);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', u.user.id);
    const ok = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder');
    if (!ok) return json({ error: 'forbidden' }, 403);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const business_id: string | null = body.business_id ?? null;
    const readiness_type: string = body.readiness_type ?? 'funding';
    const confirm: string | undefined = body.confirm;
    if (!READINESS_TYPES.includes(readiness_type)) return json({ error: 'invalid_readiness_type', allowed: READINESS_TYPES }, 400);

    const safeCount = async (table: string, filterCol?: string) => {
      try {
        let q: any = admin.from(table).select('*', { count: 'exact', head: true });
        if (filterCol && business_id) q = q.eq(filterCol, business_id);
        const { count, error } = await q;
        if (error) return null;
        return count ?? 0;
      } catch { return null; }
    };

    const [
      revenueCount, paymentsCount, invoicesCount, customersCount, subsCount,
      retentionCount, contractsCount, ipAssetsCount, risksCount, incidentsCount,
      docsCount, complaintsOpen, churnRisks,
    ] = await Promise.all([
      safeCount('revenue_records', 'business_id'),
      safeCount('payments', 'business_id'),
      safeCount('invoices', 'business_id'),
      safeCount('contacts', 'business_id'),
      safeCount('customer_subscriptions', 'business_id'),
      safeCount('customer_retention_scores', 'business_id'),
      safeCount('contract_register', 'business_id'),
      safeCount('ip_asset_register', 'business_id'),
      safeCount('group_risk_register'),
      safeCount('incident_register', 'business_id'),
      safeCount('organisation_documents'),
      safeCount('customer_complaints', 'business_id'),
      safeCount('renewal_review_tasks', 'business_id'),
    ]);

    const blockers: string[] = [];
    const recommended: string[] = [];
    if ((revenueCount ?? 0) === 0 && (paymentsCount ?? 0) === 0) { blockers.push('no_revenue_history'); recommended.push('Capture revenue/payment history before approaching investors.'); }
    if ((customersCount ?? 0) === 0) { blockers.push('no_customer_traction'); recommended.push('Document customer traction with logos, MRR, and case studies.'); }
    if ((subsCount ?? 0) === 0 && readiness_type !== 'lending') { blockers.push('no_recurring_revenue'); recommended.push('Show recurring revenue or contracted backlog.'); }
    if ((contractsCount ?? 0) === 0) { blockers.push('no_contracts_registered'); recommended.push('Upload key customer/supplier contracts to the contract register.'); }
    if ((ipAssetsCount ?? 0) === 0) { blockers.push('no_ip_register'); recommended.push('Register trademarks, software IP, and brand assets.'); }
    if ((docsCount ?? 0) < 5) { blockers.push('data_room_thin'); recommended.push('Build data room: financials, KPIs, contracts, IP, cap table, ARR/MRR roll.'); }
    if ((complaintsOpen ?? 0) > 0) { blockers.push('open_complaints'); recommended.push('Resolve open complaints before disclosure.'); }
    if ((churnRisks ?? 0) > 0) { recommended.push('Address pending renewal/churn risks in customer narrative.'); }

    const total = blockers.length + 6;
    const score = Math.max(0, Math.min(100, Math.round(((total - blockers.length) / total) * 100)));

    const summary = {
      revenue_summary: `revenue_records=${revenueCount ?? 'n/a'}, payments=${paymentsCount ?? 'n/a'}, invoices=${invoicesCount ?? 'n/a'}`,
      margin_summary: 'See cost/margin control panel for live margin snapshots.',
      customer_summary: `contacts=${customersCount ?? 'n/a'}, subscriptions=${subsCount ?? 'n/a'}, retention_scores=${retentionCount ?? 'n/a'}`,
      ip_summary: `ip_assets=${ipAssetsCount ?? 'n/a'}`,
      legal_summary: `contracts=${contractsCount ?? 'n/a'}`,
      risk_summary: `risk_register=${risksCount ?? 'n/a'}, incidents=${incidentsCount ?? 'n/a'}`,
      data_room_status: (docsCount ?? 0) >= 5 ? 'partial' : 'thin',
      traction_summary: `customers=${customersCount ?? 'n/a'}, recurring=${subsCount ?? 'n/a'}`,
    };

    let inserted: any = null;
    if (confirm === 'CREATE EXIT READINESS REVIEW') {
      const { data, error } = await admin.from('funding_exit_readiness').insert({
        business_id,
        readiness_type,
        readiness_status: 'review_required',
        ...summary,
        readiness_score: score,
        blockers,
        recommended_actions: recommended,
        founder_review_required: true,
      }).select('id, readiness_type, readiness_score').maybeSingle();
      if (error) return json({ error: error.message }, 500);
      inserted = data;
    }

    return json({
      ok: true,
      dry_run: confirm !== 'CREATE EXIT READINESS REVIEW',
      readiness_type,
      readiness_score: score,
      blockers,
      recommended_actions: recommended,
      summary,
      record: inserted,
      safety: {
        external_outreach: false,
        data_room_shared: false,
        pitch_deck_sent: false,
        valuation_claimed: false,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});