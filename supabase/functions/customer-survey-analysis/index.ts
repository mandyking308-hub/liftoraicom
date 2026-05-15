import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE CUSTOMER FEEDBACK INSIGHTS';

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
    const { business_id, confirmation } = body ?? {};

    let q = admin.from('customer_survey_responses').select('*').limit(1000);
    if (business_id) q = q.eq('business_id', business_id);
    const { data: responses } = await q;
    const r = responses ?? [];

    const avg = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
    const csatAvg = avg(r.map((x:any)=>x.csat_score).filter((n:any)=>typeof n==='number'));
    const npsAvg = avg(r.map((x:any)=>x.nps_score).filter((n:any)=>typeof n==='number'));
    const effortAvg = avg(r.map((x:any)=>x.effort_score).filter((n:any)=>typeof n==='number'));

    const collect = (key: string) => {
      const counts: Record<string, number> = {};
      for (const row of r) for (const item of (row[key] ?? [])) {
        const k = String(item).toLowerCase().slice(0, 80);
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 20).map(([term,count])=>({ term, count }));
    };

    const insights = {
      total_responses: r.length,
      satisfaction_trends: { csat_avg: csatAvg, nps_avg: npsAvg, effort_avg: effortAvg },
      pain_points: collect('objections'),
      recurring_needs: collect('key_needs'),
      objections: collect('objections'),
      upsell_interest: collect('upsell_interest'),
      competitor_mentions: collect('competitor_mentions'),
      requested_improvements: collect('requested_improvements'),
      customers_needing_follow_up: r.filter((x:any)=>x.follow_up_required).length,
    };

    let insight_record_id: string | null = null;
    if (confirmation === CONFIRM) {
      try {
        const { data: ins } = await admin.from('voice_of_customer_insights').insert({
          business_id: business_id ?? null,
          insight_payload: insights,
        }).select('id').single();
        insight_record_id = ins?.id ?? null;
      } catch { /* table optional */ }
    }

    return new Response(JSON.stringify({ insights, insight_record_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});