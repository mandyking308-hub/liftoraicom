import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'ACT ON SURVEY OUTCOMES';

function classifyOutcome(s: any): string {
  const csat = typeof s.csat_score === 'number' ? s.csat_score : null;
  const sentiment = String(s.sentiment ?? '').toLowerCase();
  const txt = `${s.feedback_text ?? ''} ${s.qualitative_feedback ?? ''} ${s.notes ?? ''}`.toLowerCase();
  if (/complain|terrible|broken|refund|cancel/.test(txt)) return 'complaint_risk';
  if (csat != null && csat >= 4 && /testimonial|recommend|love/.test(txt)) return 'testimonial_opportunity';
  if (/competitor|alternative|vs /.test(txt)) return 'competitor_mention';
  if (csat != null && csat <= 2) return 'unhappy_customer';
  if (/upsell|more|expand|add/.test(txt)) return 'upsell_interest';
  if (/onboard|setup|confus/.test(txt)) return 'onboarding_confusion';
  if (/support|help|issue|bug/.test(txt)) return 'support_needed';
  if (/price|cost|expensive/.test(txt)) return 'pricing_objection';
  if (/improve|wish|feature/.test(txt)) return 'product_improvement';
  if (/missing|gap|lack/.test(txt)) return 'service_gap';
  if (/cancel|leaving|churn/.test(txt)) return 'churn_risk';
  if (csat != null && csat >= 4) return 'happy_customer';
  if (sentiment === 'negative') return 'unhappy_customer';
  return 'neutral_customer';
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
    const { business_id = null, contact_id = null, survey_response_id = null, dry_run = true, confirmation, max_items = 50 } = body ?? {};
    const willPersist = !dry_run && confirmation === CONFIRM;

    let q = admin.from('customer_survey_responses').select('*').order('created_at', { ascending: false }).limit(max_items);
    if (survey_response_id) q = q.eq('id', survey_response_id);
    else if (contact_id) q = q.eq('contact_id', contact_id);
    else if (business_id) q = q.eq('business_id', business_id);
    const { data: surveys } = await q;

    const results: any[] = [];
    for (const s of (surveys ?? [])) {
      const outcome = classifyOutcome(s);
      const actions: any[] = [];
      const baseAgent = ['complaint_risk','churn_risk','unhappy_customer'].includes(outcome) ? 'customer_recovery_agent' : 'customer_success_agent';

      if (['complaint_risk','unhappy_customer','churn_risk'].includes(outcome)) {
        actions.push({ kind: 'founder_approval_item', payload: { approval_type: 'survey_recovery', title: `Survey ${outcome} — review needed`, summary: `Outcome: ${outcome}. CSAT: ${s.csat_score ?? '-'}.`, recommended_action: 'Founder open survey, decide on recovery / human call.', priority_level: 'high', agent_key: baseAgent } });
      }
      if (outcome === 'support_needed') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'support_agent', task_type: 'support_followup', task_title: 'Survey flagged support need', task_summary: 'Open support thread for customer.', priority_level: 'high' } });
      }
      if (outcome === 'upsell_interest') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'customer_success_agent', task_type: 'upsell_conversation', task_title: 'Survey suggests upsell interest', task_summary: 'Founder review customer needs and consider package recommendation.' } });
      }
      if (outcome === 'onboarding_confusion') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'customer_success_agent', task_type: 'onboarding_clarification', task_title: 'Onboarding confusion reported', task_summary: 'Review onboarding plan and re-share customer-facing instructions after founder approval.' } });
      }
      if (outcome === 'competitor_mention') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'competitor_learning_agent', task_type: 'competitor_signal', task_title: 'Competitor mentioned in survey', task_summary: 'Capture competitor signal for offer positioning.' } });
      }
      if (outcome === 'testimonial_opportunity') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'marketing_agent', task_type: 'testimonial_request', task_title: 'Possible testimonial — request permission via founder', task_summary: 'Founder review and reach out personally.' } });
      }
      if (outcome === 'happy_customer') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'customer_success_agent', task_type: 'positive_followup', task_title: 'Send a thank-you check-in (founder draft)', task_summary: 'Internal note only — no auto send.', priority_level: 'low' } });
      }
      if (outcome === 'pricing_objection') {
        actions.push({ kind: 'agent_task', payload: { agent_key: 'proposal_agent', task_type: 'pricing_review', task_title: 'Pricing objection — review proposal/package', task_summary: 'Founder review whether package adjustment or new proposal needed.' } });
      }
      // CRM log (always)
      actions.push({ kind: 'crm_log', payload: { source_table: 'customer_survey_responses', source_id: s.id, interaction_type: 'survey_response', summary: `Outcome: ${outcome}. CSAT: ${s.csat_score ?? '-'}.` } });

      const persisted: any = { items: [] };
      if (willPersist) {
        for (const a of actions) {
          try {
            if (a.kind === 'founder_approval_item') {
              const r = await admin.from('founder_approval_items').insert({ ...a.payload, business_id: s.business_id ?? null, contact_id: s.contact_id ?? null, source_system: 'survey_outcome_engine', source_table: 'customer_survey_responses', source_id: s.id, status: 'pending' }).select('id').maybeSingle();
              persisted.items.push({ kind: a.kind, id: r.data?.id });
            } else if (a.kind === 'agent_task') {
              const r = await admin.from('ai_agent_task_queue').insert({ ...a.payload, business_id: s.business_id ?? null, contact_id: s.contact_id ?? null, source_system: 'survey_outcome_engine', source_table: 'customer_survey_responses', source_id: s.id, status: 'queued', founder_approval_required: true, dry_run_only: true, execution_enabled: false }).select('id').maybeSingle();
              persisted.items.push({ kind: a.kind, id: r.data?.id });
            } else if (a.kind === 'crm_log') {
              const dedupe_key = `survey_outcome:${s.id}`;
              const exist = await admin.from('crm_interaction_ledger').select('id').eq('dedupe_key', dedupe_key).maybeSingle();
              if (!exist.data?.id) {
                const r = await admin.from('crm_interaction_ledger').insert({ business_id: s.business_id ?? null, contact_id: s.contact_id ?? null, source_system: 'survey_outcome_engine', source_table: 'customer_survey_responses', source_id: s.id, source_channel: 'internal', channel_key: 'survey', interaction_type: a.payload.interaction_type, direction: 'internal', occurred_at: s.created_at ?? new Date().toISOString(), summary: a.payload.summary, satisfaction_signal: true, complaint_signal: outcome === 'complaint_risk', churn_risk_signal: outcome === 'churn_risk', upsell_signal: outcome === 'upsell_interest', competitor_signal: outcome === 'competitor_mention', privacy_level: 'internal', ai_relevant: true, founder_review_required: true, matched_status: s.contact_id ? 'matched' : 'unmatched', processing_status: 'captured', raw_payload: s, metadata: { outcome }, dedupe_key }).select('id').maybeSingle();
                persisted.items.push({ kind: a.kind, id: r.data?.id });
              } else persisted.items.push({ kind: a.kind, id: exist.data.id, skipped: true });
            }
          } catch (e) { persisted.items.push({ kind: a.kind, error: String(e) }); }
        }
      }

      results.push({ survey_id: s.id, contact_id: s.contact_id, outcome, actions_planned: actions.length, persisted });
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, financial_mutation: false, private_notes_exposed: false,
      surveys_evaluated: results.length, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});