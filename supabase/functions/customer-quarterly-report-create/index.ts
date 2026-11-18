import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY, detectGaps } from '../_shared/customerSuccessLogic.ts';
import { pickAllowedRecord } from '../_shared/writeFieldAllowlist.ts';

const ALLOWED_RECORD_FIELDS = ['contact_id', 'organisation_id', 'deal_id', 'reporting_period_start', 'reporting_period_end', 'report_quarter', 'report_year', 'internal_summary', 'customer_facing_summary', 'usage_summary', 'engagement_summary', 'value_summary', 'support_summary', 'feedback_summary', 'satisfaction_summary', 'open_issues', 'completed_actions', 'recommendations', 'next_quarter_plan', 'upsell_opportunities', 'renewal_risk_flags', 'metadata', 'success_profile_id', 'report_name', 'executive_summary', 'work_completed', 'outcomes', 'metrics', 'open_items', 'risks', 'renewal_notes', 'missing_evidence', 'unsupported_claims', 'customer_message_draft', 'is_test_data', 'business_contact_relationship_id'] as const;
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'CREATE CUSTOMER QUARTERLY REPORT');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert_into: 'customer_quarterly_reports', confirmation_required: 'CREATE CUSTOMER QUARTERLY REPORT', ...SAFETY });
  }
  const picked = pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS);
  if (!picked.ok) return json({ error: picked.error, rejected_fields: picked.rejected_fields }, 400);
  const row: Record<string, any> = { ...picked.record, business_id: body.business_id, report_status: 'draft', approval_status: 'draft', manual_export_status: 'not_exported', external_share_allowed: false, customer_share_allowed: false, founder_review_required: true };
  const { data, error } = await auth.admin.from('customer_quarterly_reports').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'quarterly_report_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
