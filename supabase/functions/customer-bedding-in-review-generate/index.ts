import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY, detectGaps } from '../_shared/customerSuccessLogic.ts';
import { pickAllowedRecord } from '../_shared/writeFieldAllowlist.ts';

const ALLOWED_RECORD_FIELDS = ['success_profile_id', 'onboarding_plan_id', 'review_name', 'bedding_in_day', 'scheduled_for', 'customer_sentiment', 'progress_status', 'issues_found', 'support_needed', 'founder_attention_needed', 'recommended_next_actions', 'customer_message_draft', 'is_test_data', 'metadata'] as const;
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
  const picked = pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS);
  if (!picked.ok) return json({ error: picked.error, rejected_fields: picked.rejected_fields }, 400);
  const row: Record<string, any> = { ...picked.record, business_id: body.business_id, review_status: 'draft', approval_status: 'draft', external_send_allowed: false };
  const { data, error } = await auth.admin.from('customer_bedding_in_reviews').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'bedding_review_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
