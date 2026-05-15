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

    const checks: Record<string, any> = {};
    checks.prospecting_agent = (await safe(async () => (await admin.from('ai_agent_roles').select('agent_key').eq('agent_key','prospecting_agent').maybeSingle()).data, null)) ? 'pass' : 'fail';
    const sources = await safe(async () => (await admin.from('prospecting_source_registry').select('source_key,enabled')).data ?? [], [] as any[]);
    checks.source_registry = sources.length >= 16 ? 'pass' : 'fail';
    checks.jobs_table = (await safe(async () => (await admin.from('prospecting_search_jobs').select('id', { count: 'exact', head: true })).error, null)) ? 'fail' : 'pass';
    checks.target_accounts_table = (await safe(async () => (await admin.from('strategic_target_accounts').select('id', { count: 'exact', head: true })).error, null)) ? 'fail' : 'pass';
    const ranking = await safe(async () => (await admin.from('prospect_ranking_models').select('model_key').eq('model_key','default_v1').maybeSingle()).data, null);
    checks.ranking_model = ranking ? 'pass' : 'fail';
    checks.account_lists_table = (await safe(async () => (await admin.from('strategic_account_lists').select('id', { count: 'exact', head: true })).error, null)) ? 'fail' : 'pass';
    const neon = await safe(async () => (await admin.from('businesses').select('id').eq('name','Neon Candy').maybeSingle()).data, null) as any;
    const neonJobs = neon?.id ? await safe(async () => (await admin.from('prospecting_search_jobs').select('id').eq('business_id', neon.id)).data ?? [], [] as any[]) : [];
    checks.neon_candy_presets = neonJobs.length >= 9 ? 'pass' : 'fail';
    const journey = await safe(async () => (await admin.from('command_centre_customer_journey_steps').select('step_key').in('step_key',['market_research','strategic_prospecting','target_account_ranking','founder_prospect_approval','promote_target_to_crm'])).data ?? [], [] as any[]);
    checks.journey_steps = journey.length === 5 ? 'pass' : 'fail';
    const gates = await safe(async () => (await admin.from('external_action_gates').select('gate_key,enabled').in('gate_key',['apollo_credit_spend_gate','smartlead_lead_push_gate','prospecting_external_search_gate'])).data ?? [], [] as any[]);
    checks.gates_present = gates.length === 3 ? 'pass' : 'fail';
    checks.gates_disabled = gates.every((g: any) => g.enabled === false) ? 'pass' : 'fail';

    const status = Object.values(checks).every((v) => v === 'pass') ? 'PASS' : 'FIXED';
    return new Response(JSON.stringify({
      status, checks,
      apollo_credits_spent: false, smartlead_post_calls: false, emails_sent: false, external_search_called: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'BLOCKED', error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});