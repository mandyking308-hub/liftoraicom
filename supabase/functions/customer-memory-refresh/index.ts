import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

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

    const { business_id, contact_id } = await req.json().catch(() => ({}));
    if (!contact_id) return new Response(JSON.stringify({ error: 'contact_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const get = (table: string, filter = (q: any) => q.eq('contact_id', contact_id)) =>
      safe(async () => {
        const { data } = await filter(admin.from(table).select('*').limit(50));
        return data ?? [];
      }, [] as any[]);

    const [interactions, communications, conversations, drafts, proposals, intProposals, demoAccess, demoEvents,
           deals, invoices, payments, supportReviews, surveyResponses, socialEvents] = await Promise.all([
      get('crm_interaction_ledger'),
      get('communications'),
      get('conversations'),
      get('ai_conversation_drafts'),
      get('proposals'),
      get('internal_proposals'),
      get('demo_access'),
      get('demo_events'),
      get('deals'),
      get('invoices'),
      get('payments'),
      get('support_interaction_reviews'),
      get('customer_survey_responses'),
      get('social_engagement_events'),
    ]);

    const summarise = (rows: any[], label: string) => rows.length ? `${rows.length} ${label} on file (latest ${rows[0]?.created_at ?? 'n/a'})` : null;

    const known_needs: any[] = [];
    const objections: any[] = [];
    const buying_signals: any[] = [];
    for (const r of surveyResponses) {
      for (const n of (r.key_needs ?? [])) known_needs.push(n);
      for (const o of (r.objections ?? [])) objections.push(o);
      for (const u of (r.upsell_interest ?? [])) buying_signals.push(u);
    }

    const risk_flags: any[] = [];
    if (communications.some((c: any) => c.bounced)) risk_flags.push('email_bounced');
    if (interactions.some((i: any) => (i.status ?? '').toLowerCase() === 'do_not_contact')) risk_flags.push('do_not_contact');

    const profile = {
      business_id: business_id ?? null,
      contact_id,
      profile_status: 'active',
      customer_summary: `Contact has ${interactions.length} interactions, ${conversations.length} conversations, ${proposals.length + intProposals.length} proposals, ${deals.length} deals, ${invoices.length} invoices.`,
      relationship_summary: summarise(interactions, 'CRM interactions'),
      known_needs,
      objections,
      buying_signals,
      support_history_summary: summarise(supportReviews, 'support reviews'),
      proposal_history_summary: summarise([...proposals, ...intProposals], 'proposals'),
      demo_history_summary: summarise([...demoAccess, ...demoEvents], 'demo events'),
      deal_history_summary: summarise(deals, 'deals'),
      invoice_payment_summary: `${invoices.length} invoices, ${payments.length} payments`,
      satisfaction_summary: surveyResponses.length ? `${surveyResponses.length} survey responses` : null,
      upsell_interest_summary: buying_signals.length ? `${buying_signals.length} upsell signals` : null,
      risk_flags,
      last_refreshed_at: new Date().toISOString(),
      metadata: { sources_checked: { interactions: interactions.length, communications: communications.length, conversations: conversations.length, drafts: drafts.length, social: socialEvents.length } },
    };

    const { data: existing } = await admin.from('customer_memory_profiles').select('id').eq('contact_id', contact_id).maybeSingle();
    let result;
    if (existing) {
      const { data, error } = await admin.from('customer_memory_profiles').update(profile).eq('id', existing.id).select('*').single();
      if (error) throw error; result = data;
    } else {
      const { data, error } = await admin.from('customer_memory_profiles').insert(profile).select('*').single();
      if (error) throw error; result = data;
    }

    return new Response(JSON.stringify({ profile: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});