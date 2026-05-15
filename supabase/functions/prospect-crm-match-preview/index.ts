import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin','founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { business_id = null, target_account_ids = null, limit = 100 } = await req.json().catch(() => ({}));
    let q = admin.from('strategic_target_accounts').select('*').eq('crm_match_status','not_checked').limit(limit);
    if (business_id) q = q.eq('business_id', business_id);
    if (Array.isArray(target_account_ids) && target_account_ids.length) q = q.in('id', target_account_ids);
    const { data: accounts } = await q;

    const results: any[] = [];
    for (const a of (accounts ?? [])) {
      const email = (a.known_contact_email ?? '').toLowerCase();
      const orgName = (a.account_name ?? '').toLowerCase();
      const contactByEmail = email ? await safe(async () => (await admin.from('contacts').select('id,email,company,is_globally_suppressed,do_not_contact_at,unsubscribed_at,assigned_business').eq('email', email).maybeSingle()).data, null) : null;
      const orgMatch = await safe(async () => (await admin.from('organisations').select('id,name').ilike('name', a.account_name).maybeSingle()).data, null);
      const bcr = contactByEmail ? await safe(async () => (await admin.from('business_contact_relationships').select('id,do_not_contact,current_stage,last_campaign_id').eq('contact_id', contactByEmail.id).limit(5)).data ?? [], [] as any[]) : [];
      const recentQueue = email ? await safe(async () => (await admin.from('email_queue').select('id,status,scheduled_at').eq('contact_id', contactByEmail?.id ?? '00000000-0000-0000-0000-000000000000').order('scheduled_at',{ascending:false}).limit(5)).data ?? [], [] as any[]) : [];

      const dnc = !!(contactByEmail?.do_not_contact_at || contactByEmail?.unsubscribed_at || contactByEmail?.is_globally_suppressed || bcr.some((b: any) => b.do_not_contact));
      const duplicate = !!contactByEmail || !!orgMatch;
      const has_relationship = bcr.length > 0;
      let status = 'safe_to_consider';
      if (dnc) status = 'do_not_contact_or_suppressed';
      else if (duplicate && has_relationship) status = 'existing_relationship';
      else if (duplicate) status = 'already_in_crm';

      const recommended_action =
        status === 'do_not_contact_or_suppressed' ? 'Do not contact. Exclude from outreach lists.' :
        status === 'existing_relationship' ? 'Treat as warm CRM contact; route to existing owner.' :
        status === 'already_in_crm' ? 'Already in CRM — link instead of duplicating.' :
        'Safe to consider. Founder review before promoting to CRM.';

      results.push({
        target_account_id: a.id, account_name: a.account_name,
        crm_match_status: status, duplicate_risk: duplicate, do_not_contact_risk: dnc,
        existing_contact_id: contactByEmail?.id ?? null, existing_organisation_id: orgMatch?.id ?? null,
        existing_relationships: bcr.length, recent_email_queue: recentQueue.length,
        recommended_action,
      });
    }

    return new Response(JSON.stringify({
      ok: true, mutated: false, external_send: false, apollo_credits_spent: false,
      checked: results.length, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});