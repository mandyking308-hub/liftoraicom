import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY } from '../_shared/customerSuccessLogic.ts';
import { pickAllowedRecord } from '../_shared/writeFieldAllowlist.ts';

const ALLOWED_RECORD_FIELDS = [
  'contact_id', 'organisation_id', 'winback_reason', 'customer_history_summary',
  'last_positive_interaction_at', 'last_negative_interaction_at', 'inactivity_days',
  'churn_risk_level', 'root_cause_summary', 'recommended_recovery_angle',
  'recommended_human_touch', 'proposed_next_action', 'proposed_message_subject',
  'proposed_message_body', 'goodwill_options', 'offer_or_package_recommendation',
  'metadata', 'success_profile_id', 'plan_name', 'churn_reason', 'proposed_offer',
  'proposed_message_draft', 'recommended_timing', 'risk_warnings', 'is_test_data',
  'business_contact_relationship_id', 'customer_sales_checkout_id',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'CREATE CUSTOMER WINBACK PLAN');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert_into: 'customer_winback_plans', confirmation_required: 'CREATE CUSTOMER WINBACK PLAN', ...SAFETY });
  }
  const picked = pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS);
  if (!picked.ok) return json({ error: picked.error, rejected_fields: picked.rejected_fields }, 400);
  const row: Record<string, any> = {
    ...picked.record,
    business_id: body.business_id,
    plan_status: 'draft',
    founder_review_required: true,
    send_allowed: false,
    approved_at: null,
    founder_attention_needed: true,
    external_send_allowed: false,
    approval_status: 'draft',
  };
  const { data, error } = await auth.admin.from('customer_winback_plans').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'winback_plan_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
