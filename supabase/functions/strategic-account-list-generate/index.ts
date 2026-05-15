import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE STRATEGIC ACCOUNT LIST';

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

    const { business_id, list_type = 'top_25_targets', target_count = 25, list_name = null, dry_run = true, confirmation } = await req.json().catch(() => ({}));
    if (!business_id) return new Response(JSON.stringify({ error: 'business_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const willPersist = !dry_run && confirmation === CONFIRM;

    const { data: accounts } = await admin.from('strategic_target_accounts')
      .select('id,account_name,overall_priority_score,recommended_channel,ranking_reason,duplicate_risk,do_not_contact_risk')
      .eq('business_id', business_id)
      .order('overall_priority_score', { ascending: false })
      .limit(Math.max(1, target_count));

    const eligible = (accounts ?? []).filter((a: any) => !a.do_not_contact_risk);
    const ranked = eligible.slice(0, target_count).map((a: any, idx: number) => ({
      target_account_id: a.id, account_name: a.account_name, rank_order: idx + 1,
      priority_score: a.overall_priority_score, recommended_channel: a.recommended_channel,
      reason: a.ranking_reason,
    }));

    let persisted: any = null;
    if (willPersist && ranked.length) {
      const ins = await admin.from('strategic_account_lists').insert({
        business_id, list_name: list_name ?? `${list_type} (${new Date().toISOString().slice(0,10)})`,
        list_type, list_status: 'draft', target_count: ranked.length, founder_review_required: true,
        strategy_summary: `Auto-ranked ${ranked.length} accounts from strategic_target_accounts.`,
      }).select('id').maybeSingle();
      persisted = ins.data;
      if (persisted?.id) {
        await admin.from('strategic_account_list_items').insert(ranked.map((r) => ({
          list_id: persisted.id, target_account_id: r.target_account_id,
          rank_order: r.rank_order, priority_score: r.priority_score,
          reason: r.reason, recommended_channel: r.recommended_channel,
        })));
      }
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, smartlead_post: false, apollo_credits_spent: false,
      list_type, count: ranked.length, top: ranked, persisted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});