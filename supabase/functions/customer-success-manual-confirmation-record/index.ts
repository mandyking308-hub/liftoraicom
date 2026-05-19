import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY } from '../_shared/customerSuccessLogic.ts';

const ALLOWED = new Set([
  'onboarding_shared_manually','welcome_pack_shared_manually','portal_built_manually',
  'portal_live_confirmed','survey_sent_manually','quarterly_report_shared_manually',
  'renewal_handled_manually','winback_actioned_manually','upsell_actioned_manually','other',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id || !body?.confirmation_type) return json({ error: 'business_id and confirmation_type required' }, 400);
  if (!ALLOWED.has(body.confirmation_type)) return json({ error: 'invalid confirmation_type' }, 400);
  const confirm = requireConfirmation(body, 'CONFIRM CUSTOMER SUCCESS MANUAL ACTION');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, confirmation_required: 'CONFIRM CUSTOMER SUCCESS MANUAL ACTION', ...SAFETY });

  const t = body.confirmation_type;
  const updates: { table: string; id?: string; patch: Record<string, any> }[] = [];
  if (t === 'onboarding_shared_manually' && body.onboarding_plan_id) updates.push({ table: 'customer_onboarding_plans', id: body.onboarding_plan_id, patch: { onboarding_status: 'shared_manually_external' } });
  if (t === 'welcome_pack_shared_manually' && body.welcome_pack_id) updates.push({ table: 'customer_welcome_packs', id: body.welcome_pack_id, patch: { pack_status: 'shared_manually_external' } });
  if (t === 'portal_built_manually' && body.portal_blueprint_id) updates.push({ table: 'client_portal_blueprints', id: body.portal_blueprint_id, patch: { external_portal_status: 'manually_built_external', blueprint_status: 'manually_built_external' } });
  if (t === 'portal_live_confirmed' && body.portal_blueprint_id) updates.push({ table: 'client_portal_blueprints', id: body.portal_blueprint_id, patch: { external_portal_status: 'live_confirmed_external', blueprint_status: 'live_confirmed_external' } });
  if (t === 'survey_sent_manually' && body.survey_id) updates.push({ table: 'customer_satisfaction_surveys', id: body.survey_id, patch: { survey_status: 'sent_manually_external', sent_manually_external_at: new Date().toISOString() } });
  if (t === 'quarterly_report_shared_manually' && body.quarterly_report_id) updates.push({ table: 'customer_quarterly_reports', id: body.quarterly_report_id, patch: { report_status: 'shared_manually_external' } });
  if (t === 'renewal_handled_manually' && body.renewal_review_id) updates.push({ table: 'customer_renewal_reviews', id: body.renewal_review_id, patch: { renewal_status: 'renewed_manually_external' } });
  if (t === 'winback_actioned_manually' && body.winback_plan_id) updates.push({ table: 'customer_winback_plans', id: body.winback_plan_id, patch: { plan_status: 'actioned_manually_external' } });
  if (t === 'upsell_actioned_manually' && body.upsell_opportunity_id) updates.push({ table: 'customer_upsell_opportunities', id: body.upsell_opportunity_id, patch: { opportunity_status: 'actioned_manually_external' } });

  const results: any[] = [];
  for (const u of updates) {
    if (!u.id) continue;
    const { error } = await auth.admin.from(u.table).update(u.patch).eq('id', u.id).eq('business_id', body.business_id);
    results.push({ table: u.table, id: u.id, ok: !error, error: error?.message });
  }
  await audit(auth.admin, { business_id: body.business_id, action: 'manual_external_confirmation_recorded', result_json: { confirmation_type: t, updates: results } });
  return json({ ok: true, results, ...SAFETY });
});
