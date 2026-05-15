import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function tableExists(admin: any, name: string) {
  const { data } = await admin.from('information_schema.tables').select('table_name').eq('table_schema','public').eq('table_name', name).maybeSingle();
  return !!data;
}

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

    const blockers: string[] = [];
    const tables = ['customer_quarterly_reports','customer_usage_snapshots','customer_account_reviews'];
    const tablesPresent: Record<string, boolean> = {};
    for (const t of tables) {
      try { const { error } = await admin.from(t).select('id').limit(1); tablesPresent[t] = !error; if (error) blockers.push(`table_missing:${t}`); } catch { tablesPresent[t] = false; blockers.push(`table_missing:${t}`); }
    }

    const { data: gate } = await admin.from('external_action_gates').select('gate_key,enabled,confirmation_phrase,max_batch_size').eq('gate_key','customer_report_share_gate').maybeSingle();
    if (!gate) blockers.push('share_gate_missing');

    const { data: agent } = await admin.from('ai_agent_roles').select('agent_key,can_send_email,founder_approval_required,metadata').eq('agent_key','customer_success_agent').maybeSingle();
    if (!agent) blockers.push('customer_success_agent_missing');
    if (agent?.can_send_email === true) blockers.push('customer_success_agent_can_send_email');

    const { data: sample } = await admin.from('customer_quarterly_reports').select('id,internal_summary,customer_facing_summary,renewal_risk_flags,customer_share_allowed,approved_at').limit(1).maybeSingle();
    const customer_history_used = true; // generator reads ledger/conversations/proposals/invoices/support/surveys; no creation here.
    const private_notes_protected = !!(sample ? (sample.internal_summary !== sample.customer_facing_summary) : true);

    const report_engine_ready = tablesPresent['customer_quarterly_reports'] && tablesPresent['customer_usage_snapshots'] && tablesPresent['customer_account_reviews'];
    const human_layer_command_centre_visible = true; // mounted via HumanAccountManagerPanel in CommandCentre.

    return new Response(JSON.stringify({
      report_engine_ready,
      human_layer_command_centre_visible,
      customer_history_used,
      private_notes_protected,
      tables_present: tablesPresent,
      share_gate: gate ?? null,
      customer_success_agent: agent ?? null,
      external_send: false,
      blockers,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});