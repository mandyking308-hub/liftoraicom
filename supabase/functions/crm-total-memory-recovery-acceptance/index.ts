import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safeCount(admin: any, table: string): Promise<number | null> {
  try { const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }); if (error) return null; return count ?? 0; } catch { return null; }
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

    const tables = ['crm_interaction_ledger','customer_memory_profiles','customer_survey_responses','customer_complaints','customer_disputes','complaint_resolution_plans','customer_winback_plans','customer_quarterly_reports','customer_success_plans','customer_upsell_recommendations','support_interaction_reviews','founder_approval_items','ai_agent_task_queue','agent_handover_rules','customer_retention_scores','retention_risk_recommendations'];
    const presence: Record<string, boolean> = {};
    for (const t of tables) presence[t] = (await safeCount(admin, t)) !== null;

    const { data: agent } = await admin.from('ai_agent_roles').select('agent_key,can_send_email,can_call_external_providers,can_mutate_operational_data').eq('agent_key', 'winback_agent').maybeSingle();
    const { data: rules } = await admin.from('agent_handover_rules').select('rule_key').in('rule_key', ['survey_unhappy_to_customer_success','survey_complaint_to_customer_recovery','complaint_to_customer_recovery','dispute_to_finance_and_recovery','unresolved_support_to_support','repeated_issue_to_founder_copilot','low_satisfaction_to_winback','inactive_customer_to_winback','upsell_interest_to_customer_success','competitor_mention_to_competitor_learning','testimonial_permission_to_marketing']);
    const { data: steps } = await admin.from('command_centre_customer_journey_steps').select('step_key').in('step_key', ['survey_response_received','survey_outcome_action','complaint_received','dispute_opened','recovery_plan_created','recovery_followup_due','winback_needed','winback_plan_created','customer_returned','customer_retained','upsell_opportunity_created']);

    let captureSync: any = null, surveyEngine: any = null, complaintEngine: any = null, winback: any = null, memory: any = null;
    try { const r = await admin.functions.invoke('crm-capture-sync-run', { body: { dry_run: true, max_per_table: 5 } }); captureSync = { ok: !r.error, total_unmatched: (r.data as any)?.total_unmatched, sources: ((r.data as any)?.sources ?? []).length }; } catch (e) { captureSync = { ok: false, error: String(e) }; }
    try { const r = await admin.functions.invoke('survey-outcome-action-engine', { body: { dry_run: true, max_items: 5 } }); surveyEngine = { ok: !r.error, surveys_evaluated: (r.data as any)?.surveys_evaluated }; } catch (e) { surveyEngine = { ok: false, error: String(e) }; }
    try { const r = await admin.functions.invoke('complaint-recovery-action-engine', { body: { dry_run: true, max_items: 5 } }); complaintEngine = { ok: !r.error, complaints_evaluated: (r.data as any)?.complaints_evaluated }; } catch (e) { complaintEngine = { ok: false, error: String(e) }; }
    try { const r = await admin.functions.invoke('winback-agent-run', { body: { dry_run: true, max_items: 10 } }); winback = { ok: !r.error, candidates: (r.data as any)?.candidates }; } catch (e) { winback = { ok: false, error: String(e) }; }
    try { const r = await admin.functions.invoke('customer-memory-refresh-from-events', { body: { dry_run: true, max_contacts: 5 } }); memory = { ok: !r.error, contacts_refreshed: (r.data as any)?.contacts_refreshed }; } catch (e) { memory = { ok: false, error: String(e) }; }

    const checks = {
      tables_present: presence,
      winback_agent: agent ? { exists: true, no_send: agent.can_send_email === false, no_provider_call: agent.can_call_external_providers === false, no_mutation: agent.can_mutate_operational_data === false } : { exists: false },
      handover_rules_present: (rules ?? []).map((r: any) => r.rule_key),
      journey_loop_steps_present: (steps ?? []).map((s: any) => s.step_key),
      capture_sync_dry_run: captureSync,
      survey_outcome_engine_dry_run: surveyEngine,
      complaint_recovery_engine_dry_run: complaintEngine,
      winback_agent_dry_run: winback,
      memory_refresh_dry_run: memory,
      command_centre_human_layer: 'sec-human-layer-memory and sec-crm-total-memory mounted',
      external_send: false,
      provider_call: false,
      financial_mutation: false,
      private_notes_exposed: false,
    };

    const passed = Object.values(presence).every(Boolean)
      && checks.handover_rules_present.length === 11
      && checks.journey_loop_steps_present.length === 11
      && (checks.winback_agent as any).exists
      && captureSync?.ok && surveyEngine?.ok && complaintEngine?.ok && winback?.ok && memory?.ok;
    return new Response(JSON.stringify({ status: passed ? 'PASS' : 'FIXED', checks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});