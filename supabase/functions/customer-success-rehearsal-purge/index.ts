import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY } from '../_shared/customerSuccessLogic.ts';

const TABLES = [
  'customer_success_manual_export_packs','customer_winback_plans','customer_upsell_opportunities',
  'customer_retention_risk_reviews','customer_renewal_reviews','customer_quarterly_reports',
  'customer_satisfaction_surveys','customer_success_checkins','customer_bedding_in_reviews',
  'client_portal_content_packs','client_portal_blueprints','customer_welcome_packs',
  'customer_onboarding_plans','customer_success_profiles','customer_success_audit',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'PURGE CUSTOMER SUCCESS TEST DATA');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) return json({ ok: true, dry_run: true, confirmation_required: 'PURGE CUSTOMER SUCCESS TEST DATA', tables: TABLES, ...SAFETY });

  const results: any[] = [];
  for (const t of TABLES) {
    try {
      const { error, count } = await auth.admin.from(t).delete({ count: 'exact' }).eq('business_id', body.business_id).eq('is_test_data', true);
      results.push({ table: t, deleted: count ?? 0, error: error?.message });
    } catch (e) { results.push({ table: t, error: String(e) }); }
  }
  await audit(auth.admin, { business_id: body.business_id, action: 'test_data_purged', result_json: { results } });
  return json({ ok: true, results, ...SAFETY });
});
