import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY, detectGaps } from '../_shared/customerSuccessLogic.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'CREATE CUSTOMER BEDDING IN REVIEW');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert_into: 'customer_bedding_in_reviews', confirmation_required: 'CREATE CUSTOMER BEDDING IN REVIEW', ...SAFETY });
  }
  const row: Record<string, any> = { business_id: body.business_id, ...(body?.record ?? {}) };
  if ("external_share_allowed" in row) row.external_share_allowed = false;
  if ("external_send_allowed" in row) row.external_send_allowed = false;
  const { data, error } = await auth.admin.from('customer_bedding_in_reviews').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'bedding_review_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
