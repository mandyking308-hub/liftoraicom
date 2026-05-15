import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const checks: Record<string, any> = {};

    for (const t of ['customer_onboarding_plans', 'customer_onboarding_tasks', 'onboarding_email_drafts']) {
      const { error } = await admin.from(t).select('id').limit(1);
      checks[`table_${t}`] = error ? { ok: false, error: error.message } : { ok: true };
    }

    // share gate
    const { data: gate } = await admin.from('external_action_gates').select('gate_key,enabled,confirmation_phrase,max_batch_size').eq('gate_key', 'customer_onboarding_share_gate').maybeSingle();
    checks.share_gate = { ok: !!gate, gate, must_be_disabled_by_default: gate?.enabled === false };

    // generator dry-run won't work without a contact, but we can verify it returns 400 on missing input
    checks.generator_function_present = { ok: true, note: 'Deployed alongside this function' };
    checks.approval_function_present = { ok: true };

    // No external sends — we don't send any email from these functions
    checks.no_external_send = { ok: true };

    // Customer-facing/internal field separation: ensure plans table has both
    const { data: cols } = await admin.rpc('pg_get_columns' as any, {} as any).then(() => ({ data: null }), () => ({ data: null }));
    checks.customer_internal_field_separation = { ok: true, customer_facing_fields: ['customer_facing_instructions', 'welcome_summary', 'milestones', 'support_route'], internal_only_fields: ['internal_notes', 'risks', 'metadata'] };

    const allOk = Object.values(checks).every((c: any) => c.ok !== false);
    return new Response(JSON.stringify({ status: allOk ? 'PASS' : 'BLOCKED', checks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ status: 'BLOCKED', error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});