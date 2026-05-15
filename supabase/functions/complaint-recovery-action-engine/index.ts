import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE COMPLAINT RECOVERY ACTIONS';

function classifyComplaint(c: any, history: any) {
  const sev = String(c.severity ?? '').toLowerCase();
  const cat = String(c.category ?? '').toLowerCase();
  const txt = `${c.description ?? ''} ${c.summary ?? ''}`.toLowerCase();
  const tags: string[] = [];
  if (sev === 'high' || /urgent|critical/.test(txt)) tags.push('urgent_service_recovery');
  if (/invoice|bill|charge|refund|payment|dispute/.test(txt) || cat.includes('billing')) tags.push('billing_dispute');
  if (/late|delivery|missed|deadline/.test(txt)) tags.push('delivery_failure');
  if (/onboard|setup/.test(txt)) tags.push('onboarding_failure');
  if (/support|response time|ignored/.test(txt)) tags.push('support_failure');
  if (/scope|out of scope|not what/.test(txt)) tags.push('scope_mismatch');
  if (/cancel|leave|churn|refund/.test(txt) || (history?.priorComplaints ?? 0) >= 2) tags.push('churn_risk');
  if (/legal|lawyer|gdpr|complaint authority/.test(txt)) tags.push('legal_or_compliance_risk');
  if (sev === 'high' || tags.includes('legal_or_compliance_risk') || tags.includes('churn_risk')) tags.push('founder_call_needed');
  return tags.length ? tags : ['urgent_service_recovery'];
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
    const { complaint_id = null, dispute_id = null, contact_id = null, dry_run = true, confirmation, max_items = 25 } = body ?? {};
    const willPersist = !dry_run && confirmation === CONFIRM;

    let cQ = admin.from('customer_complaints').select('*').order('created_at', { ascending: false }).limit(max_items);
    if (complaint_id) cQ = cQ.eq('id', complaint_id);
    else if (contact_id) cQ = cQ.eq('contact_id', contact_id);
    const { data: complaints } = await cQ;

    const results: any[] = [];
    for (const c of (complaints ?? [])) {
      const cid = c.contact_id;
      const memory = cid ? (await admin.from('customer_memory_profiles').select('risk_flags,satisfaction_signals').eq('contact_id', cid).maybeSingle()).data : null;
      const surveys = cid ? (await admin.from('customer_survey_responses').select('csat_score,sentiment').eq('contact_id', cid).limit(20)).data ?? [] : [];
      const supportH = cid ? (await admin.from('support_interaction_reviews').select('severity').eq('contact_id', cid).limit(50)).data ?? [] : [];
      const priorComplaints = cid ? ((await admin.from('customer_complaints').select('id', { count: 'exact', head: true }).eq('contact_id', cid)).count ?? 0) : 0;
      const tags = classifyComplaint(c, { priorComplaints });

      const actions: any[] = [
        { kind: 'complaint_resolution_plan', payload: { complaint_id: c.id, contact_id: cid, business_id: c.business_id ?? null, internal_summary: `Auto-classified: ${tags.join(', ')}. Prior complaints: ${priorComplaints}.`, customer_facing_summary: null, plan_status: 'draft', founder_review_required: true } },
        { kind: 'agent_task', payload: { agent_key: 'customer_recovery_agent', task_type: 'recovery_followup', task_title: `Recovery follow-up — ${tags[0]}`, task_summary: `Open complaint ${c.id}. Founder approve recovery plan before any external response.`, priority_level: tags.includes('founder_call_needed') ? 'high' : 'normal' } },
        { kind: 'founder_approval_item', payload: { approval_type: 'complaint_recovery', title: `Complaint recovery — ${tags[0]}`, summary: `Tags: ${tags.join(', ')}. CSAT history: ${surveys.length} surveys, prior complaints: ${priorComplaints}.`, recommended_action: 'Founder review draft, then either approve recovery plan or call customer.', priority_level: 'high', agent_key: 'customer_recovery_agent' } },
        { kind: 'retention_recommendation', payload: { recommendation_type: 'complaint_recovery', priority_level: 'high', title: `Complaint recovery (${tags.join(', ')})`, summary: c.summary ?? c.description ?? null, recommended_action: 'Approve recovery plan and book human check-in.' } },
      ];
      if (tags.includes('billing_dispute')) actions.push({ kind: 'agent_task', payload: { agent_key: 'finance_agent', task_type: 'finance_review', task_title: 'Billing dispute — review (no auto refund)', task_summary: 'Founder review invoice/payment. No financial mutation by AI.', priority_level: 'high' } });
      if (tags.includes('delivery_failure')) actions.push({ kind: 'agent_task', payload: { agent_key: 'supplier_agent', task_type: 'supplier_review', task_title: 'Delivery failure — supplier review', task_summary: 'Review supplier assignment.', priority_level: 'high' } });
      if (tags.includes('legal_or_compliance_risk')) actions.push({ kind: 'agent_task', payload: { agent_key: 'compliance_agent', task_type: 'compliance_review', task_title: 'Compliance/legal risk on complaint', task_summary: 'Founder review with compliance agent before any reply.', priority_level: 'high' } });
      if (tags.includes('support_failure')) actions.push({ kind: 'agent_task', payload: { agent_key: 'support_agent', task_type: 'support_escalation', task_title: 'Support escalation from complaint', task_summary: 'Open support escalation.', priority_level: 'high' } });
      actions.push({ kind: 'crm_log', payload: { interaction_type: 'complaint', summary: `Complaint ${c.id} classified: ${tags.join(', ')}` } });

      const persisted: any = { items: [] };
      if (willPersist) {
        for (const a of actions) {
          try {
            if (a.kind === 'complaint_resolution_plan') {
              const exist = await admin.from('complaint_resolution_plans').select('id').eq('complaint_id', c.id).maybeSingle();
              if (!exist.data?.id) {
                const r = await admin.from('complaint_resolution_plans').insert(a.payload).select('id').maybeSingle();
                persisted.items.push({ kind: a.kind, id: r.data?.id });
              } else persisted.items.push({ kind: a.kind, id: exist.data.id, skipped: true });
            } else if (a.kind === 'founder_approval_item') {
              const r = await admin.from('founder_approval_items').insert({ ...a.payload, business_id: c.business_id ?? null, contact_id: cid, source_system: 'complaint_recovery_engine', source_table: 'customer_complaints', source_id: c.id, status: 'pending', risk_flags: tags }).select('id').maybeSingle();
              persisted.items.push({ kind: a.kind, id: r.data?.id });
            } else if (a.kind === 'agent_task') {
              const r = await admin.from('ai_agent_task_queue').insert({ ...a.payload, business_id: c.business_id ?? null, contact_id: cid, source_system: 'complaint_recovery_engine', source_table: 'customer_complaints', source_id: c.id, status: 'queued', founder_approval_required: true, dry_run_only: true, execution_enabled: false }).select('id').maybeSingle();
              persisted.items.push({ kind: a.kind, id: r.data?.id });
            } else if (a.kind === 'retention_recommendation') {
              const r = await admin.from('retention_risk_recommendations').insert({ ...a.payload, business_id: c.business_id ?? null, contact_id: cid, owner_agent_key: 'customer_recovery_agent', founder_review_required: true, status: 'pending', evidence: [{ kind: 'complaint_id', value: c.id }, { kind: 'tags', value: tags }] }).select('id').maybeSingle();
              persisted.items.push({ kind: a.kind, id: r.data?.id });
            } else if (a.kind === 'crm_log') {
              const dedupe_key = `complaint_recovery:${c.id}`;
              const exist = await admin.from('crm_interaction_ledger').select('id').eq('dedupe_key', dedupe_key).maybeSingle();
              if (!exist.data?.id) {
                const r = await admin.from('crm_interaction_ledger').insert({ business_id: c.business_id ?? null, contact_id: cid, source_system: 'complaint_recovery_engine', source_table: 'customer_complaints', source_id: c.id, source_channel: 'internal', channel_key: 'complaint', interaction_type: 'complaint', direction: 'internal', occurred_at: c.created_at ?? new Date().toISOString(), summary: a.payload.summary, complaint_signal: true, churn_risk_signal: tags.includes('churn_risk'), satisfaction_signal: true, privacy_level: 'internal', ai_relevant: true, founder_review_required: true, matched_status: cid ? 'matched' : 'unmatched', processing_status: 'captured', raw_payload: { complaint_id: c.id, tags }, metadata: { tags }, dedupe_key }).select('id').maybeSingle();
                persisted.items.push({ kind: a.kind, id: r.data?.id });
              } else persisted.items.push({ kind: a.kind, id: exist.data.id, skipped: true });
            }
          } catch (e) { persisted.items.push({ kind: a.kind, error: String(e) }); }
        }
      }

      results.push({ complaint_id: c.id, contact_id: cid, tags, actions_planned: actions.length, persisted });
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, financial_mutation: false, admit_liability: false, private_notes_exposed: false,
      complaints_evaluated: results.length, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});