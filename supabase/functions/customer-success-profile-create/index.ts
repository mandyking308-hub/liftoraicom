import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY } from '../_shared/customerSuccessLogic.ts';
import { pickAllowedRecord } from '../_shared/writeFieldAllowlist.ts';

const ALLOWED_RECORD_FIELDS = [
  'crm_contact_id', 'organisation_id', 'conversation_id', 'account_name', 'customer_name',
  'customer_email', 'customer_type', 'lifecycle_stage', 'assigned_account_manager',
  'customer_goal', 'purchased_offer', 'start_date', 'onboarding_due_date', 'renewal_date',
  'subscription_status', 'health_score', 'satisfaction_score', 'retention_risk_level',
  'upsell_potential', 'support_risk_status', 'last_contact_at', 'next_check_in_at',
  'founder_notes', 'is_test_data', 'metadata', 'business_contact_relationship_id',
  'customer_sales_checkout_id',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'CREATE CUSTOMER SUCCESS PROFILE');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert_into: 'customer_success_profiles', confirmation_required: 'CREATE CUSTOMER SUCCESS PROFILE', ...SAFETY });
  }
  const picked = pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS);
  if (!picked.ok) return json({ error: picked.error, rejected_fields: picked.rejected_fields }, 400);
  const row: Record<string, any> = {
    ...picked.record,
    business_id: body.business_id,
    success_status: 'draft',
  };
  const { data, error } = await auth.admin.from('customer_success_profiles').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'success_profile_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
