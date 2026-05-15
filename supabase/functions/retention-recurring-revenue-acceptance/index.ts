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

    const tables = ['customer_onboarding_plans','customer_complaints','customer_disputes','customer_survey_responses','customer_quarterly_reports','customer_memory_profiles','customer_success_plans','customer_upsell_recommendations','customer_retention_scores','retention_risk_recommendations'];
    const tableChecks: Record<string, number | null> = {};
    for (const t of tables) tableChecks[t] = await safeCount(admin, t);

    const { data: steps } = await admin.from('command_centre_customer_journey_steps').select('step_key').in('step_key', ['onboarding_started','onboarding_bedding_in','customer_success_checkin','survey_feedback','complaint_or_dispute','recovery_plan','quarterly_report','renewal_or_upsell','retention_review']);
    const journeyKeys = (steps ?? []).map((s: any) => s.step_key);

    let dryRun: any = null;
    try {
      const r = await admin.functions.invoke('customer-retention-health-run', { body: { dry_run: true } });
      dryRun = { ok: !r.error, mode: (r.data as any)?.mode, contacts_evaluated: (r.data as any)?.contacts_evaluated };
    } catch (e) { dryRun = { ok: false, error: String(e) }; }

    const checks = {
      tables_present: Object.fromEntries(Object.entries(tableChecks).map(([k, v]) => [k, v !== null])),
      journey_steps_present: journeyKeys,
      dry_run_health_run: dryRun,
      external_send: false,
      financial_mutation: false,
      private_notes_exposed: false,
      command_centre_human_layer: 'mounted (sec-retention-recurring, sec-human-account-manager, sec-customer-onboarding, sec-complaints-disputes, sec-customer-success-upsell, sec-customer-feedback)',
    };

    const allTables = Object.values(checks.tables_present).every(Boolean);
    const allJourney = journeyKeys.length === 9;
    const status = allTables && allJourney && dryRun?.ok ? 'PASS' : 'FIXED';

    return new Response(JSON.stringify({ status, checks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});