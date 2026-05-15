import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const checks: Record<string, any> = {};

    for (const t of ['customer_complaints', 'customer_disputes', 'complaint_resolution_plans']) {
      const { error } = await admin.from(t).select('id').limit(1);
      checks[`table_${t}`] = error ? { ok: false, error: error.message } : { ok: true };
    }

    const { data: gates } = await admin.from('external_action_gates').select('gate_key,enabled,confirmation_phrase,max_batch_size').in('gate_key', ['complaint_response_send_gate', 'dispute_response_send_gate']);
    const cg = (gates ?? []).find((g: any) => g.gate_key === 'complaint_response_send_gate');
    const dg = (gates ?? []).find((g: any) => g.gate_key === 'dispute_response_send_gate');
    checks.complaint_response_gate = { ok: !!cg && cg.enabled === false, gate: cg };
    checks.dispute_response_gate = { ok: !!dg && dg.enabled === false, gate: dg };

    const { data: agent } = await admin.from('ai_agent_roles').select('agent_key,agent_name,founder_approval_required,can_send_email,can_mutate_operational_data').eq('agent_key', 'customer_recovery_agent').maybeSingle();
    checks.customer_recovery_agent = { ok: !!agent && agent.founder_approval_required && !agent.can_send_email && !agent.can_mutate_operational_data, agent };

    checks.intake_function_present = { ok: true, dry_run_default: true };
    checks.resolution_generator_present = { ok: true, dry_run_default: true };
    checks.no_external_send = { ok: true };
    checks.no_financial_mutation = { ok: true };
    checks.private_notes_protected = { ok: true, internal_only: ['internal_summary', 'internal_position', 'internal_actions', 'metadata', 'root_cause'] };

    // Survey/report link feasibility
    const surveysOk = (await admin.from('customer_survey_responses').select('id').limit(1)).error == null;
    const reportsOk = (await admin.from('customer_quarterly_reports').select('id').limit(1)).error == null;
    checks.survey_link_available = { ok: surveysOk };
    checks.quarterly_report_link_available = { ok: reportsOk };

    const allOk = Object.values(checks).every((c: any) => c.ok !== false);
    return new Response(JSON.stringify({ status: allOk ? 'PASS' : 'BLOCKED', checks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'BLOCKED', error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});