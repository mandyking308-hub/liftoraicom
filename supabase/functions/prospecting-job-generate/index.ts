import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE PROSPECTING JOB';

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

    const body = await req.json().catch(() => ({}));
    const {
      business_id, search_goal, founder_brief = null,
      target_market = null, target_customer_type = null,
      geography = [], industries = [],
      job_name = null, source_keys = null,
      max_results = 100,
      dry_run = true, confirmation,
    } = body ?? {};
    if (!business_id || !search_goal) {
      return new Response(JSON.stringify({ error: 'business_id and search_goal are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const willPersist = !dry_run && confirmation === CONFIRM;

    const knowledge = await safe(async () => (await admin.from('business_knowledge_profiles').select('*').eq('business_id', business_id).maybeSingle()).data, null);
    const operating = await safe(async () => (await admin.from('business_operating_profiles').select('*').eq('business_id', business_id).maybeSingle()).data, null);
    const sources = await admin.from('prospecting_source_registry').select('source_key,enabled,credit_spend_risk,external_api');
    const safeKeys = (sources.data ?? []).filter((s: any) => s.enabled && !s.credit_spend_risk).map((s: any) => s.source_key);
    const finalSourceKeys = Array.isArray(source_keys) && source_keys.length ? source_keys : safeKeys;

    const job = {
      business_id,
      job_name: job_name ?? `Prospecting — ${search_goal}`.slice(0, 200),
      search_goal,
      founder_brief,
      target_market, target_customer_type,
      target_geography: Array.isArray(geography) ? geography : [],
      target_industries: Array.isArray(industries) ? industries : [],
      source_keys: finalSourceKeys,
      max_results,
      credit_spend_allowed: false,
      external_search_allowed: false,
      founder_approval_required: true,
      created_by_agent_key: 'prospecting_agent',
      search_status: willPersist ? 'queued' : 'draft',
      metadata: {
        knowledge_snapshot: knowledge ? { id: knowledge.id, summary: knowledge.summary ?? null } : null,
        operating_snapshot: operating ? { id: operating.id } : null,
      },
    };

    let persisted: any = null;
    if (willPersist) {
      const ins = await admin.from('prospecting_search_jobs').insert(job).select('id').maybeSingle();
      persisted = ins.data;
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, apollo_credits_spent: false, smartlead_post: false,
      job_preview: job, persisted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});