import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'RUN WINBACK AGENT';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

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
    const { business_id = null, dry_run = true, max_items = 25, confirmation } = body ?? {};
    const willPersist = !dry_run && confirmation === CONFIRM;

    let cQ = admin.from('contacts').select('id,name,email,company,assigned_business,status').limit(max_items);
    if (business_id) cQ = cQ.eq('assigned_business', business_id);
    const { data: contacts } = await cQ;

    const now = Date.now();
    const results: any[] = [];
    for (const c of (contacts ?? [])) {
      const cid = c.id;
      const ledger = await safe(async () => (await admin.from('crm_interaction_ledger').select('occurred_at,satisfaction_signal,complaint_signal,upsell_signal').eq('contact_id', cid).order('occurred_at', { ascending: false }).limit(50)).data ?? [], [] as any[]);
      const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('csat_score,sentiment,created_at').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const complaints = await safe(async () => (await admin.from('customer_complaints').select('id,status').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const supportH = await safe(async () => (await admin.from('support_interaction_reviews').select('severity').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const reports = await safe(async () => (await admin.from('customer_quarterly_reports').select('reporting_period_end').eq('contact_id', cid).order('reporting_period_end', { ascending: false }).limit(5)).data ?? [], [] as any[]);
      const upsells = await safe(async () => (await admin.from('customer_upsell_recommendations').select('id,fit_score,recommendation_status,reason').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const deals = await safe(async () => (await admin.from('deals').select('id,status,value,created_at').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const memory = await safe(async () => (await admin.from('customer_memory_profiles').select('risk_flags,relationship_summary,satisfaction_summary,upsell_interest_summary').eq('contact_id', cid).maybeSingle()).data, null as any);
      const retention = await safe(async () => (await admin.from('customer_retention_scores').select('overall_health_score,renewal_risk_score,health_status').eq('contact_id', cid).order('score_date', { ascending: false }).limit(1)).data ?? [], [] as any[]);

      const lastInteractionAt = ledger[0]?.occurred_at ?? null;
      const inactivity = lastInteractionAt ? Math.floor((now - new Date(lastInteractionAt).getTime()) / 86400000) : null;
      const csat = surveys.map((s) => s.csat_score).filter((n: any) => typeof n === 'number');
      const avgCsat = csat.length ? csat.reduce((a: number, b: number) => a + b, 0) / csat.length : null;
      const openComplaints = complaints.filter((x) => !['resolved','closed'].includes(String(x.status))).length;
      const lastNeg = ledger.find((l) => l.complaint_signal)?.occurred_at ?? null;
      const lastPos = ledger.find((l) => l.satisfaction_signal && !l.complaint_signal)?.occurred_at ?? null;
      const lostDeals = deals.filter((d) => ['lost','closed_lost'].includes(String(d.status))).length;
      const upsellPending = upsells.filter((u) => !['won','rejected','dismissed'].includes(String(u.recommendation_status))).length;
      const repeatedSupport = supportH.filter((s) => String(s.severity).toLowerCase() === 'high').length;
      const renewalRisk = retention[0]?.renewal_risk_score ?? null;
      const overallHealth = retention[0]?.overall_health_score ?? null;

      const reasons: string[] = [];
      if (inactivity != null && inactivity > 60) reasons.push('inactive');
      if (avgCsat != null && avgCsat < 3) reasons.push('unhappy');
      if (openComplaints > 0) reasons.push('unresolved_complaints');
      if (lostDeals > 0) reasons.push('lost_deal_revival');
      if (upsellPending > 0) reasons.push('upsell_followup_missed');
      if (repeatedSupport >= 2) reasons.push('repeated_support');
      if (renewalRisk != null && renewalRisk >= 0.5) reasons.push('renewal_risk');
      if (overallHealth != null && overallHealth < 0.4) reasons.push('low_health');

      if (reasons.length === 0) continue; // not a winback candidate

      const churnLevel = (overallHealth != null && overallHealth < 0.3) || openComplaints > 0 ? 'high' : (renewalRisk != null && renewalRisk >= 0.5 ? 'medium' : 'low');
      const angle = openComplaints ? 'service_recovery' : (avgCsat != null && avgCsat < 3 ? 'apology_and_value_reset' : (inactivity != null && inactivity > 90 ? 'fresh_check_in' : 'goodwill_followup'));
      const humanTouch = ['high'].includes(churnLevel) ? 'founder_call' : 'account_manager_check_in';

      const plan = {
        business_id: business_id ?? c.assigned_business ?? null,
        contact_id: cid,
        organisation_id: null,
        plan_status: 'draft',
        winback_reason: reasons.join(', '),
        customer_history_summary: `Last interaction: ${lastInteractionAt ?? 'unknown'}. Surveys: ${surveys.length} (avg CSAT ${avgCsat ?? 'n/a'}). Open complaints: ${openComplaints}. Lost deals: ${lostDeals}. Pending upsells: ${upsellPending}.`,
        last_positive_interaction_at: lastPos,
        last_negative_interaction_at: lastNeg,
        inactivity_days: inactivity,
        churn_risk_level: churnLevel,
        root_cause_summary: memory?.satisfaction_summary ?? memory?.relationship_summary ?? null,
        recommended_recovery_angle: angle,
        recommended_human_touch: humanTouch,
        proposed_next_action: humanTouch === 'founder_call' ? 'Founder personally call customer; do not send email.' : 'Account manager schedules personal check-in (founder approval first).',
        proposed_message_subject: null,
        proposed_message_body: null,
        goodwill_options: openComplaints ? [{ kind: 'service_credit', requires_founder_approval: true }, { kind: 'extended_review', requires_founder_approval: true }] : [],
        offer_or_package_recommendation: upsellPending ? upsells.slice(0, 3).map((u) => ({ upsell_id: u.id, fit_score: u.fit_score, reason: u.reason })) : [],
        founder_review_required: true,
        send_allowed: false,
        metadata: { reasons, retention: retention[0] ?? null },
      };

      let persisted: any = { plan_id: null, approval_id: null, task_id: null, log_id: null };
      if (willPersist) {
        const ins = await admin.from('customer_winback_plans').insert(plan).select('id').maybeSingle();
        persisted.plan_id = ins.data?.id ?? null;
        const appr = await admin.from('founder_approval_items').insert({ approval_type: 'winback_plan', business_id: plan.business_id, contact_id: cid, source_system: 'winback_agent', source_table: 'customer_winback_plans', source_id: persisted.plan_id, agent_key: 'winback_agent', title: `Win-back — ${reasons[0]}`, summary: plan.customer_history_summary, recommended_action: plan.proposed_next_action, priority_level: churnLevel === 'high' ? 'high' : 'normal', status: 'pending', risk_flags: reasons }).select('id').maybeSingle();
        persisted.approval_id = appr.data?.id ?? null;
        const task = await admin.from('ai_agent_task_queue').insert({ agent_key: 'winback_agent', task_type: 'winback_followup', task_title: `Win-back follow-up (${reasons[0]})`, task_summary: plan.proposed_next_action, business_id: plan.business_id, contact_id: cid, source_system: 'winback_agent', source_table: 'customer_winback_plans', source_id: persisted.plan_id, status: 'queued', founder_approval_required: true, dry_run_only: true, execution_enabled: false, priority_level: churnLevel === 'high' ? 'high' : 'normal' }).select('id').maybeSingle();
        persisted.task_id = task.data?.id ?? null;
        const dedupe_key = `winback:${persisted.plan_id ?? cid}:${Date.now()}`;
        const log = await admin.from('crm_interaction_ledger').insert({ business_id: plan.business_id, contact_id: cid, source_system: 'winback_agent', source_table: 'customer_winback_plans', source_id: persisted.plan_id, source_channel: 'internal', channel_key: 'winback', interaction_type: 'winback_attempt', direction: 'internal', occurred_at: new Date().toISOString(), summary: `Win-back plan drafted: ${reasons.join(', ')}`, winback_signal: true, churn_risk_signal: churnLevel === 'high', privacy_level: 'internal', ai_relevant: true, founder_review_required: true, matched_status: 'matched', processing_status: 'captured', raw_payload: plan, metadata: { reasons, churnLevel }, dedupe_key }).select('id').maybeSingle();
        persisted.log_id = log.data?.id ?? null;
      }

      results.push({ contact_id: cid, contact_name: c.name, reasons, churn_level: churnLevel, plan, persisted });
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, financial_mutation: false, private_notes_exposed: false,
      candidates: results.length, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});