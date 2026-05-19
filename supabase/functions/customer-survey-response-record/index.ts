import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY } from '../_shared/customerSuccessLogic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id || !body?.survey_id) return json({ error: 'business_id and survey_id required' }, 400);
  const confirm = requireConfirmation(body, 'RECORD CUSTOMER SURVEY RESPONSE');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, confirmation_required: 'RECORD CUSTOMER SURVEY RESPONSE', ...SAFETY });
  const patch: Record<string, any> = {
    response_received_at: new Date().toISOString(),
    survey_status: 'response_recorded',
    csat_score: body.csat_score ?? null,
    nps_score: body.nps_score ?? null,
    sentiment: body.sentiment ?? 'unknown',
    response_summary: body.response_summary ?? null,
    improvement_requests: body.improvement_requests ?? [],
    complaint_signals: body.complaint_signals ?? [],
    upsell_signals: body.upsell_signals ?? [],
    retention_risk_signals: body.retention_risk_signals ?? [],
  };
  const { data, error } = await auth.admin.from('customer_satisfaction_surveys').update(patch).eq('id', body.survey_id).eq('business_id', body.business_id).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, survey_id: body.survey_id, action: 'survey_response_recorded', after_json: data });
  return json({ ok: true, record: data, ...SAFETY });
});