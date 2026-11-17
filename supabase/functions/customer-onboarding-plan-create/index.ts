import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY } from '../_shared/customerSuccessLogic.ts';
import { pickAllowedRecord } from '../_shared/writeFieldAllowlist.ts';

const ALLOWED_RECORD_FIELDS = [
  'contact_id', 'organisation_id', 'deal_id', 'proposal_id', 'onboarding_type',
  'customer_goal', 'success_definition', 'welcome_summary', 'internal_notes',
  'customer_facing_instructions', 'key_contacts', 'required_customer_actions',
  'required_company_actions', 'timeline', 'milestones', 'check_in_schedule',
  'support_route', 'risks', 'metadata', 'success_profile_id', 'crm_contact_id',
  'plan_name', 'welcome_message_draft', 'onboarding_steps', 'required_assets',
  'required_customer_inputs', 'internal_owner', 'start_date', 'target_completion_date',
  'risk_flags', 'missing_information', 'is_test_data', 'business_contact_relationship_id',
  'customer_sales_checkout_id',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'CREATE CUSTOMER ONBOARDING PLAN');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert_into: 'customer_onboarding_plans', confirmation_required: 'CREATE CUSTOMER ONBOARDING PLAN', ...SAFETY });
  }
  const picked = pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS);
  if (!picked.ok) return json({ error: picked.error, rejected_fields: picked.rejected_fields }, 400);
  const row: Record<string, any> = {
    ...picked.record,
    business_id: body.business_id,
    onboarding_status: 'draft',
    founder_review_required: true,
    customer_share_allowed: false,
    approved_at: null,
    approval_status: 'draft',
    external_share_allowed: false,
  };
  const { data, error } = await auth.admin.from('customer_onboarding_plans').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'onboarding_plan_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
