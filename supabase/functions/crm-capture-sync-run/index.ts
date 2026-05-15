import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Idempotent batch sync: walks recent rows from key internal source tables and ensures
// they are captured into crm_interaction_ledger. No external send.

const SOURCES: Array<{ table: string; type: string; sigKey?: keyof ReturnType<typeof signalsBlank> }> = [
  { table: 'customer_survey_responses', type: 'survey_response', sigKey: 'satisfaction_signal' },
  { table: 'customer_survey_requests', type: 'survey_request' },
  { table: 'customer_complaints', type: 'complaint', sigKey: 'complaint_signal' },
  { table: 'customer_disputes', type: 'dispute', sigKey: 'dispute_signal' },
  { table: 'complaint_resolution_plans', type: 'recovery_plan' },
  { table: 'customer_onboarding_plans', type: 'onboarding_step' },
  { table: 'customer_onboarding_tasks', type: 'onboarding_step' },
  { table: 'customer_quarterly_reports', type: 'quarterly_report' },
  { table: 'customer_success_plans', type: 'customer_success_checkin' },
  { table: 'customer_upsell_recommendations', type: 'upsell_recommendation', sigKey: 'upsell_signal' },
  { table: 'customer_winback_plans', type: 'winback_attempt', sigKey: 'winback_signal' },
  { table: 'support_interaction_reviews', type: 'support_request', sigKey: 'support_signal' },
  { table: 'proposals', type: 'proposal_created' },
  { table: 'demo_access', type: 'demo_created' },
  { table: 'demo_events', type: 'demo_viewed' },
  { table: 'deals', type: 'deal_updated' },
  { table: 'invoices', type: 'invoice_created' },
  { table: 'payments', type: 'payment_received' },
  { table: 'assignments', type: 'supplier_assignment' },
  { table: 'founder_approval_items', type: 'founder_approval' },
  { table: 'ai_agent_task_queue', type: 'agent_task' },
];

function signalsBlank() {
  return { complaint_signal: false, dispute_signal: false, upsell_signal: false, churn_risk_signal: false, winback_signal: false, support_signal: false, satisfaction_signal: false, competitor_signal: false };
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

    const body = await req.json().catch(() => ({}));
    const { business_id = null, max_per_table = 25, dry_run = true } = body ?? {};

    const summary: any[] = [];
    let totalCaptured = 0, totalSkipped = 0, totalUnmatched = 0;

    for (const src of SOURCES) {
      let q = admin.from(src.table).select('*').order('created_at', { ascending: false }).limit(max_per_table);
      if (business_id) q = q.eq('business_id', business_id);
      const { data: rows, error } = await q;
      if (error || !rows) { summary.push({ table: src.table, available: false }); continue; }
      let captured = 0, skipped = 0, unmatched = 0;
      for (const row of rows) {
        const dedupe_key = `cap:internal:${src.table}:${row.id}`;
        const exist = await admin.from('crm_interaction_ledger').select('id').eq('dedupe_key', dedupe_key).maybeSingle();
        if (exist.data?.id) { skipped++; continue; }
        const matched = !!(row.contact_id || row.business_id);
        if (!matched) unmatched++;
        if (!dry_run) {
          const sig = signalsBlank();
          if (src.sigKey) (sig as any)[src.sigKey] = true;
          await admin.from('crm_interaction_ledger').insert({
            business_id: row.business_id ?? null,
            contact_id: row.contact_id ?? null,
            conversation_id: row.conversation_id ?? null,
            organisation_id: row.organisation_id ?? null,
            source_system: 'internal',
            source_table: src.table,
            source_id: row.id,
            source_channel: 'internal',
            channel_key: 'internal',
            interaction_type: src.type,
            direction: 'internal',
            occurred_at: row.created_at ?? new Date().toISOString(),
            subject: row.title ?? row.subject ?? null,
            summary: row.summary ?? row.report_status ?? row.status ?? null,
            ...sig,
            privacy_level: 'internal',
            ai_relevant: true,
            founder_review_required: !matched,
            matched_status: matched ? 'matched' : 'unmatched',
            processing_status: 'captured',
            raw_payload: row,
            metadata: {},
            dedupe_key,
          });
          captured++;
        }
      }
      totalCaptured += captured; totalSkipped += skipped; totalUnmatched += unmatched;
      summary.push({ table: src.table, available: true, scanned: rows.length, captured, skipped_duplicates: skipped, unmatched });
    }

    return new Response(JSON.stringify({
      ok: true, mode: dry_run ? 'dry_run' : 'persisted',
      external_send: false, financial_mutation: false,
      total_captured: totalCaptured, total_skipped: totalSkipped, total_unmatched: totalUnmatched,
      sources: summary,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});