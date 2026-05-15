import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE CUSTOMER SUCCESS PLAN';

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
    const { business_id, contact_id, deal_id, dry_run = true, confirmation } = body ?? {};
    if (!contact_id) return new Response(JSON.stringify({ error: 'contact_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const memory = await safe(async () => (await admin.from('customer_memory_profiles').select('*').eq('contact_id', contact_id).maybeSingle()).data, null as any);
    const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('*').eq('contact_id', contact_id).limit(50)).data ?? [], [] as any[]);
    const support = await safe(async () => (await admin.from('support_interaction_reviews').select('*').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]);
    const proposals = await safe(async () => (await admin.from('proposals').select('*').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]);
    const deals = await safe(async () => (await admin.from('deals').select('*').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]);
    const invoices = await safe(async () => (await admin.from('invoices').select('*').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]);

    const csat = surveys.map((s: any) => s.csat_score).filter((n: any) => typeof n === 'number');
    const avgCsat = csat.length ? csat.reduce((a: number,b: number)=>a+b,0)/csat.length : null;

    const risks: string[] = [];
    if (avgCsat !== null && avgCsat < 3) risks.push('low_csat');
    if (Array.isArray(memory?.risk_flags) && memory.risk_flags.length) for (const f of memory.risk_flags) risks.push(String(f));
    if (support.some((s: any) => (s.severity ?? '').toLowerCase() === 'high')) risks.push('open_high_severity_support');

    const plan = {
      business_id, contact_id, deal_id: deal_id ?? null,
      plan_status: 'active',
      customer_goal: memory?.customer_summary ?? 'Establish primary success goal',
      success_criteria: ['On-time delivery','CSAT ≥ 4','No unresolved support tickets'],
      current_needs: memory?.known_needs ?? [],
      risks,
      next_best_actions: [
        risks.includes('low_csat') ? 'Schedule founder call to recover satisfaction' : 'Confirm next milestone',
        proposals.length === 0 ? 'Send tailored proposal preview for founder approval' : 'Review proposal status',
        invoices.some((i: any) => (i.status ?? '').toLowerCase() === 'overdue') ? 'Resolve overdue invoice' : 'Confirm payment cadence',
      ],
      follow_up_due_at: new Date(Date.now() + 7*24*3600*1000).toISOString(),
      owner_agent_key: 'customer_success_agent',
      founder_review_required: true,
      metadata: { sources: { surveys: surveys.length, support: support.length, proposals: proposals.length, deals: deals.length, invoices: invoices.length, avg_csat: avgCsat } },
    };

    if (dry_run || confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ dry_run: true, proposed_plan: plan, note: `Provide confirmation "${CONFIRM}" with dry_run=false to persist.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existing } = await admin.from('customer_success_plans').select('id').eq('contact_id', contact_id).eq('business_id', business_id).maybeSingle();
    let result;
    if (existing) {
      const { data, error } = await admin.from('customer_success_plans').update(plan).eq('id', existing.id).select('*').single();
      if (error) throw error; result = data;
    } else {
      const { data, error } = await admin.from('customer_success_plans').insert(plan).select('*').single();
      if (error) throw error; result = data;
    }
    return new Response(JSON.stringify({ plan: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});