import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'PROMOTE STRATEGIC PROSPECTS';

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

    const { target_account_ids = [], dry_run = true, confirmation } = await req.json().catch(() => ({}));
    const willPersist = !dry_run && confirmation === CONFIRM;
    if (!Array.isArray(target_account_ids) || target_account_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'target_account_ids required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: targets } = await admin.from('strategic_target_accounts').select('*').in('id', target_account_ids);
    const plan: any[] = [];
    let promoted = 0;
    for (const t of (targets ?? [])) {
      if (t.approval_status !== 'approved') { plan.push({ id: t.id, action: 'skip', reason: 'not_approved' }); continue; }
      if (t.duplicate_risk || t.do_not_contact_risk) { plan.push({ id: t.id, action: 'skip', reason: 'duplicate_or_dnc' }); continue; }

      const orgRow = { name: t.account_name, industry: t.industry ?? null, status: 'prospect' };
      const contactRow = t.known_contact_email ? {
        email: (t.known_contact_email ?? '').toLowerCase(),
        name: t.known_contact_name ?? null,
        company: t.account_name,
        role: t.known_contact_title ?? null,
        status: 'prospect',
        source: t.source_key ?? 'prospecting_agent',
        assigned_business: t.business_id,
      } : null;

      plan.push({ id: t.id, action: 'promote', organisation: orgRow, contact: contactRow });

      if (willPersist) {
        let orgId: string | null = t.existing_organisation_id ?? null;
        if (!orgId) {
          const insOrg = await admin.from('organisations').insert(orgRow).select('id').maybeSingle();
          orgId = insOrg.data?.id ?? null;
        }
        let contactId: string | null = t.existing_contact_id ?? null;
        if (!contactId && contactRow) {
          const ins = await admin.from('contacts').insert(contactRow).select('id').maybeSingle();
          contactId = ins.data?.id ?? null;
        }
        if (contactId && t.business_id) {
          await safe(async () => admin.from('business_contact_relationships').insert({
            contact_id: contactId, business_id: t.business_id, business_name: t.account_name,
            current_stage: 'prospect', do_not_contact: false, campaign_eligible: false,
            notes: `Promoted from strategic_target_accounts ${t.id}`,
          }), null);
        }
        await admin.from('strategic_target_accounts').update({
          promoted_to_crm: true, existing_contact_id: contactId, existing_organisation_id: orgId,
          crm_match_status: 'promoted',
        }).eq('id', t.id);
        promoted++;
      }
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, smartlead_post: false, apollo_credits_spent: false, email_queue_created: false,
      promoted, plan,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});