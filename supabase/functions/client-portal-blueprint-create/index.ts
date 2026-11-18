import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY, detectGaps } from '../_shared/customerSuccessLogic.ts';
import { pickAllowedRecord } from '../_shared/writeFieldAllowlist.ts';

const ALLOWED_RECORD_FIELDS = ['blueprint_name', 'portal_type', 'target_customer_type', 'portal_goal', 'proposed_sections', 'required_pages', 'required_features', 'required_documents', 'required_permissions', 'customer_data_to_show', 'customer_data_to_hide', 'privacy_warnings', 'security_warnings', 'build_notes', 'is_test_data', 'metadata'] as const;
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body?.business_id) return json({ error: 'business_id required' }, 400);
  const confirm = requireConfirmation(body, 'CREATE CLIENT PORTAL BLUEPRINT');
  if ((confirm as any).error) return (confirm as any).error;
  if ((confirm as any).dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert_into: 'client_portal_blueprints', confirmation_required: 'CREATE CLIENT PORTAL BLUEPRINT', ...SAFETY });
  }
  const picked = pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS);
  if (!picked.ok) return json({ error: picked.error, rejected_fields: picked.rejected_fields }, 400);
  const row: Record<string, any> = { ...picked.record, business_id: body.business_id, blueprint_status: 'draft', approval_status: 'draft', external_portal_status: 'not_built' };
  const { data, error } = await auth.admin.from('client_portal_blueprints').insert(row).select('*').single();
  if (error) return json({ error: error.message }, 400);
  await audit(auth.admin, { business_id: body.business_id, action: 'portal_blueprint_created', after_json: data, is_test_data: row.is_test_data ?? false });
  return json({ ok: true, record: data, ...SAFETY });
});
