import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin', 'founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const privacy_request_id = body?.privacy_request_id;
    if (!privacy_request_id) return new Response(JSON.stringify({ error: 'privacy_request_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: request } = await admin.from('data_privacy_requests').select('*').eq('id', privacy_request_id).single();
    if (!request) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let inventoryQ = admin.from('customer_data_inventory').select('*');
    if (request.business_id) inventoryQ = inventoryQ.eq('business_id', request.business_id);
    if (request.contact_id) inventoryQ = inventoryQ.eq('contact_id', request.contact_id);
    const { data: inventory } = await inventoryQ.limit(200);

    const items = inventory ?? [];
    const totalRecords = items.reduce((s: number, r: any) => s + Number(r.record_count ?? 0), 0);
    const sensitiveAreas = items.filter((r: any) => r.contains_sensitive_data);

    const action: Record<string, string> = {
      data_access: 'compile_read_only_copy',
      data_export: 'package_export_for_review',
      correction: 'flag_records_for_correction',
      deletion: 'mark_for_deletion_pending_approval',
      restriction: 'restrict_processing_pending_approval',
      objection: 'log_objection_pending_review',
      unsubscribe: 'mark_unsubscribed_pending_approval',
      consent_withdrawal: 'withdraw_consent_pending_approval',
      retention_review: 'flag_for_retention_review',
    };
    const planned_action = action[request.request_type] ?? 'manual_review_required';

    const legal_review_needed = !!request.legal_review_recommended
      || sensitiveAreas.length > 0
      || ['deletion', 'objection', 'restriction', 'consent_withdrawal'].includes(request.request_type);

    return new Response(JSON.stringify({
      ok: true,
      data_deleted: false,
      data_exported: false,
      data_anonymised: false,
      external_send: false,
      founder_review_required: true,
      legal_review_needed,
      disclaimer: 'Preview only. No customer data was deleted, anonymised, exported, or sent externally. Founder approval required before any action.',
      request,
      planned_action,
      affected_areas: items.map((r: any) => ({
        area: r.data_area, source_table: r.source_table, record_count: r.record_count,
        sensitive: r.contains_sensitive_data, lawful_basis: r.lawful_basis, retention_until: r.retention_until,
      })),
      total_records_in_scope: totalRecords,
      sensitive_areas: sensitiveAreas.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});