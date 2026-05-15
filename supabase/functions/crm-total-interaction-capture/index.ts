import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Idempotent capture from a specific source row into the canonical CRM ledger.
// Never sends external messages.

const TYPE_MAP: Record<string, string> = {
  customer_survey_responses: 'survey_response',
  customer_survey_requests: 'survey_request',
  customer_complaints: 'complaint',
  customer_disputes: 'dispute',
  complaint_resolution_plans: 'recovery_plan',
  customer_onboarding_plans: 'onboarding_step',
  customer_onboarding_tasks: 'onboarding_step',
  onboarding_email_drafts: 'onboarding_step',
  customer_quarterly_reports: 'quarterly_report',
  customer_account_reviews: 'customer_success_checkin',
  customer_success_plans: 'customer_success_checkin',
  customer_upsell_recommendations: 'upsell_recommendation',
  customer_winback_plans: 'winback_attempt',
  support_interaction_reviews: 'support_request',
  support_requests: 'support_request',
  proposals: 'proposal_created',
  internal_proposals: 'proposal_created',
  demo_access: 'demo_created',
  demo_events: 'demo_viewed',
  deals: 'deal_updated',
  invoices: 'invoice_created',
  payments: 'payment_received',
  assignments: 'supplier_assignment',
  founder_approval_items: 'founder_approval',
  ai_agent_task_queue: 'agent_task',
  agent_handover_log: 'agent_task',
  customer_stewardship_assignments: 'agent_task',
  communications: 'email_sent',
  conversations: 'conversation',
  email_events: 'smartlead_event',
  outbound_provider_events: 'smartlead_event',
  multi_channel_inbound_events: 'email_received',
  social_engagement_events: 'social_comment',
};

function classifySignals(table: string, row: any) {
  const txt = JSON.stringify(row ?? {}).toLowerCase();
  return {
    complaint_signal: table === 'customer_complaints' || /complain|unhapp|bad service|let down/.test(txt),
    dispute_signal: table === 'customer_disputes' || /dispute|chargeback|refund/.test(txt),
    upsell_signal: table === 'customer_upsell_recommendations' || /upsell|expand|upgrade|more services/.test(txt),
    churn_risk_signal: /churn|cancel|leaving|unsubscribe|not renewing/.test(txt),
    winback_signal: table === 'customer_winback_plans' || /win.?back|come back/.test(txt),
    support_signal: /support|issue|bug|broken|help/.test(txt) || table === 'support_requests' || table === 'support_interaction_reviews',
    satisfaction_signal: table === 'customer_survey_responses',
    competitor_signal: /competitor|vs |compared to|alternative/.test(txt),
  };
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
    const { source_system = 'internal', source_table, source_id, business_id, contact_id, conversation_id, organisation_id, interaction_type, summary, raw_text, metadata = {} } = body ?? {};
    if (!source_table || !source_id) {
      return new Response(JSON.stringify({ error: 'source_table and source_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const dedupe_key = `cap:${source_system}:${source_table}:${source_id}`;
    const existing = await admin.from('crm_interaction_ledger').select('id').eq('dedupe_key', dedupe_key).maybeSingle();
    if (existing.data?.id) {
      return new Response(JSON.stringify({ ok: true, mode: 'skipped_duplicate', interaction_id: existing.data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let row: any = null;
    try { row = (await admin.from(source_table).select('*').eq('id', source_id).maybeSingle()).data; } catch { row = null; }

    const inferredType = interaction_type || TYPE_MAP[source_table] || 'internal_note';
    const signals = classifySignals(source_table, row);
    const matched = !!(contact_id || row?.contact_id || row?.business_id);
    const insert = {
      business_id: business_id ?? row?.business_id ?? null,
      contact_id: contact_id ?? row?.contact_id ?? null,
      conversation_id: conversation_id ?? row?.conversation_id ?? null,
      organisation_id: organisation_id ?? row?.organisation_id ?? null,
      source_system,
      source_table,
      source_id,
      source_channel: source_system,
      channel_key: source_system,
      interaction_type: inferredType,
      direction: 'internal',
      occurred_at: row?.created_at ?? new Date().toISOString(),
      subject: row?.title ?? row?.subject ?? null,
      summary: summary ?? row?.summary ?? null,
      raw_text: raw_text ?? null,
      ...signals,
      privacy_level: 'internal',
      ai_relevant: true,
      founder_review_required: !matched,
      matched_status: matched ? 'matched' : 'unmatched',
      processing_status: 'captured',
      raw_payload: row ?? {},
      metadata,
      dedupe_key,
    };
    const ins = await admin.from('crm_interaction_ledger').insert(insert).select('id').maybeSingle();
    if (ins.error) {
      return new Response(JSON.stringify({ error: ins.error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, mode: 'captured', interaction_id: ins.data?.id, matched, external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});