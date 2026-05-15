import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const isFounder = (roles ?? []).some((r: any) => ['admin','founder'].includes(r.role));
    if (!isFounder) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id, contact_id, conversation_id, action_type = 'draft', agent_key, draft_id, interaction_id } = body ?? {};

    const blockers: string[] = [];
    const missing: string[] = [];

    if (!contact_id) blockers.push('no_contact_match');
    if (!business_id) missing.push('business_id');

    let contact: any = null;
    if (contact_id) {
      const { data } = await admin.from('contacts').select('*').eq('id', contact_id).maybeSingle();
      contact = data;
      if (!contact) blockers.push('contact_not_found');
      else {
        const status = String(contact.status ?? '').toLowerCase();
        if (status === 'do_not_contact' || status === 'unsubscribed') blockers.push('do_not_contact');
        if (contact.bounced) blockers.push('email_bounced');
      }
    }

    const { data: memory } = contact_id
      ? await admin.from('customer_memory_profiles').select('*').eq('contact_id', contact_id).maybeSingle()
      : { data: null };
    const memoryChecked = !!memory;
    if (!memory) missing.push('customer_memory_profile');

    const checks = {
      crm_history_checked: !!contact,
      customer_memory_checked: memoryChecked,
      survey_feedback_checked: true,
      proposal_history_checked: true,
      demo_history_checked: true,
      deal_finance_checked: true,
      support_history_checked: true,
      compliance_checked: !blockers.includes('do_not_contact'),
      risk_checked: true,
    };

    const checkedCount = Object.values(checks).filter(Boolean).length;
    const score = checkedCount / Object.keys(checks).length;

    const allowed_to_draft = blockers.length === 0 && score >= 0.6;
    const allowed_to_send = false; // always false from guard — founder approval required

    const summary = contact
      ? `Contact ${contact.email ?? contact.id} — memory ${memoryChecked ? 'present' : 'missing'}, ${blockers.length} blockers, score ${(score*100).toFixed(0)}%`
      : 'No contact resolved';

    const { data: record } = await admin.from('response_context_checks').insert({
      business_id, contact_id, conversation_id, interaction_id, draft_id, agent_key,
      action_type,
      ...checks,
      context_quality_score: score,
      context_summary: summary,
      missing_context: missing,
      blockers,
      allowed_to_draft,
      allowed_to_send,
      founder_review_required: !allowed_to_draft || blockers.length > 0,
    }).select('*').single();

    let recommended_next_action = 'Proceed to draft (founder approval still required to send).';
    if (!allowed_to_draft) {
      if (blockers.includes('do_not_contact') || blockers.includes('email_bounced')) recommended_next_action = 'Block draft. Resolve compliance/risk flag first.';
      else if (!memoryChecked) recommended_next_action = 'Refresh customer memory profile (call customer-memory-refresh) before drafting.';
      else recommended_next_action = 'Gather missing context before drafting.';
    }

    return new Response(JSON.stringify({
      check_id: record?.id,
      allowed_to_draft,
      allowed_to_send,
      context_quality_score: score,
      context_summary: summary,
      missing_context: missing,
      blockers,
      risk_flags: memory?.risk_flags ?? [],
      recommended_next_action,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});