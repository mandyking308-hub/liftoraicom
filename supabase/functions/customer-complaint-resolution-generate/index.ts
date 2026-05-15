import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE COMPLAINT RESOLUTION PLAN';

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
    if (!(roles ?? []).some((r: any) => ['admin', 'founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { complaint_id, dispute_id, dry_run = true, confirmation } = body ?? {};
    if (!complaint_id && !dispute_id) return new Response(JSON.stringify({ error: 'complaint_id or dispute_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const complaint = complaint_id ? await safe(async () => (await admin.from('customer_complaints').select('*').eq('id', complaint_id).maybeSingle()).data, null as any) : null;
    const dispute = dispute_id ? await safe(async () => (await admin.from('customer_disputes').select('*').eq('id', dispute_id).maybeSingle()).data, null as any) : null;
    const contact_id = complaint?.contact_id ?? dispute?.contact_id;
    const business_id = complaint?.business_id ?? dispute?.business_id;

    const contact = contact_id ? await safe(async () => (await admin.from('contacts').select('id,name,email,company').eq('id', contact_id).maybeSingle()).data, null as any) : null;
    const memory = contact_id ? await safe(async () => (await admin.from('customer_memory_profiles').select('*').eq('contact_id', contact_id).maybeSingle()).data, null as any) : null;
    const surveys = contact_id ? await safe(async () => (await admin.from('customer_survey_responses').select('csat_score,nps_score,sentiment').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]) : [];
    const support = contact_id ? await safe(async () => (await admin.from('support_interaction_reviews').select('severity,theme').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]) : [];
    const invoices = contact_id ? await safe(async () => (await admin.from('invoices').select('id,status,amount').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]) : [];
    const payments = contact_id ? await safe(async () => (await admin.from('payments').select('id,amount,received_at').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]) : [];
    const plans = contact_id ? await safe(async () => (await admin.from('customer_success_plans').select('next_best_actions,risks').eq('contact_id', contact_id).limit(5)).data ?? [], [] as any[]) : [];

    const customerName = contact?.name ?? 'there';
    const category = complaint?.complaint_category ?? dispute?.dispute_type ?? 'issue';
    const severity = complaint?.severity ?? 'medium';
    const customerSummary = complaint?.customer_summary ?? dispute?.customer_position ?? '';

    const internalActions = [
      'Review CRM history and prior interactions',
      `Confirm root cause for "${category}"`,
      'Coordinate with relevant agent (support / finance / supplier / compliance)',
      'Prepare evidence pack (timeline, communications, deliverables)',
      'Draft customer-facing response — founder review required',
    ];
    const goodwill = severity === 'critical' || severity === 'high'
      ? ['Personal call from founder', 'Service credit (founder-approved)', 'Extended support window']
      : ['Founder check-in call', 'Priority support window'];
    const followUp = [
      { day: 1, action: 'Acknowledge complaint (after founder approval)' },
      { day: 3, action: 'Share investigation update' },
      { day: 7, action: 'Confirm resolution + post-resolution survey' },
      { day: 30, action: 'Retention check-in' },
    ];
    const retentionRisk = severity === 'critical' ? 'high' : severity === 'high' ? 'elevated' : 'monitor';
    const rootCauseHypothesis = `Hypothesis based on context: ${complaint?.internal_summary ?? 'pending investigation'}.`;

    const customerFacingResponse = `Hi ${customerName},\n\nThank you for raising this with us — it matters and we're taking it seriously. We've opened an internal review and a senior member of our team is personally looking into it. We'll come back to you with a clear update within ${severity === 'critical' ? '24 hours' : '3 business days'}.\n\nIn the meantime, please reply with anything else that would help us understand the full picture. We do not take your trust for granted.\n\n— Liftor`;

    const planRow = {
      business_id: business_id ?? null,
      complaint_id: complaint_id ?? null,
      dispute_id: dispute_id ?? null,
      plan_status: 'draft',
      resolution_summary: `Investigate ${category}, coordinate internal owners, propose resolution. Severity: ${severity}.`,
      internal_actions: internalActions,
      customer_facing_response: customerFacingResponse,
      goodwill_options: goodwill,
      follow_up_schedule: followUp,
      retention_risk: retentionRisk,
      recommended_human_touch: severity === 'critical' || severity === 'high' ? 'founder_call' : 'account_manager_call',
      founder_review_required: true,
      metadata: {
        sources: { surveys: surveys.length, support: support.length, invoices: invoices.length, payments: payments.length, success_plans: plans.length, memory: !!memory },
        root_cause_hypothesis: rootCauseHypothesis,
        customer_summary_excerpt: customerSummary.slice(0, 200),
        no_liability_admission: true,
        no_financial_mutation: true,
      },
    };

    if (dry_run !== false) {
      return new Response(JSON.stringify({ dry_run: true, plan_preview: planRow, external_send: false, financial_mutation: false, confirmation_required: CONFIRM }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ error: 'confirmation_required', expected: CONFIRM }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: plan, error } = await admin.from('complaint_resolution_plans').insert(planRow).select('*').single();
    if (error) throw error;

    try {
      await admin.from('founder_approval_items').insert({
        item_type: 'complaint_resolution_plan',
        target_table: 'complaint_resolution_plans',
        target_id: plan.id,
        status: 'pending',
        metadata: { complaint_id, dispute_id, retention_risk: retentionRisk, severity },
      });
    } catch { /* optional */ }

    return new Response(JSON.stringify({ plan, external_send: false, financial_mutation: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});