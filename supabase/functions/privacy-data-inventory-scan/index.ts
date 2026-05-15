import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safeCount(admin: any, table: string, filters: Record<string, any> = {}): Promise<number> {
  try {
    let q = admin.from(table).select('*', { count: 'exact', head: true });
    for (const [k, v] of Object.entries(filters)) if (v != null) q = q.eq(k, v);
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}

const SCAN_TARGETS: Array<{ table: string; area: string; sensitive: boolean; basis: string; contactKey?: string; businessKey?: string }> = [
  { table: 'contacts', area: 'crm_contacts', sensitive: true, basis: 'legitimate_interest', contactKey: 'id', businessKey: 'business_id' },
  { table: 'crm_interactions', area: 'crm_interactions', sensitive: false, basis: 'legitimate_interest', contactKey: 'contact_id', businessKey: 'business_id' },
  { table: 'survey_responses', area: 'surveys', sensitive: false, basis: 'consent', contactKey: 'contact_id', businessKey: 'business_id' },
  { table: 'complaints', area: 'complaints', sensitive: true, basis: 'contract', contactKey: 'contact_id', businessKey: 'business_id' },
  { table: 'support_tickets', area: 'support', sensitive: false, basis: 'contract', contactKey: 'contact_id', businessKey: 'business_id' },
  { table: 'proposals', area: 'proposals', sensitive: false, basis: 'contract', businessKey: 'business_id' },
  { table: 'invoices', area: 'invoices', sensitive: true, basis: 'legal_obligation', businessKey: 'business_id' },
  { table: 'social_engagements', area: 'social_engagement', sensitive: false, basis: 'legitimate_interest', contactKey: 'contact_id', businessKey: 'business_id' },
  { table: 'ai_memory', area: 'ai_memory', sensitive: true, basis: 'legitimate_interest', contactKey: 'contact_id', businessKey: 'business_id' },
];

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
    const business_id = body?.business_id ?? null;
    const contact_id = body?.contact_id ?? null;

    const results: any[] = [];
    for (const t of SCAN_TARGETS) {
      const filters: Record<string, any> = {};
      if (business_id && t.businessKey) filters[t.businessKey] = business_id;
      if (contact_id && t.contactKey) filters[t.contactKey] = contact_id;
      const count = await safeCount(admin, t.table, filters);
      const row = {
        business_id,
        contact_id,
        data_area: t.area,
        source_table: t.table,
        record_count: count,
        contains_sensitive_data: t.sensitive,
        lawful_basis: t.basis,
        last_scanned_at: new Date().toISOString(),
        metadata: { scanned_by: user.id },
      };
      try {
        const { data: existing } = await admin.from('customer_data_inventory')
          .select('id').eq('source_table', t.table)
          .is('business_id', business_id ? undefined : null)
          .is('contact_id', contact_id ? undefined : null)
          .limit(1);
        if (existing && existing.length) {
          await admin.from('customer_data_inventory').update(row).eq('id', existing[0].id);
        } else {
          await admin.from('customer_data_inventory').insert(row);
        }
      } catch {}
      results.push({ ...row, deleted: false, exported: false });
    }

    return new Response(JSON.stringify({
      ok: true,
      data_deleted: false,
      data_exported: false,
      data_anonymised: false,
      external_send: false,
      disclaimer: 'Inventory scan only. No customer data was deleted, anonymised, exported or sent externally.',
      scope: { business_id, contact_id },
      areas_scanned: results.length,
      total_records_indexed: results.reduce((s, r) => s + (r.record_count ?? 0), 0),
      sensitive_areas: results.filter(r => r.contains_sensitive_data).length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});