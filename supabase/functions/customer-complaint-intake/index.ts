import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE CUSTOMER COMPLAINT';

const FINANCIAL_CATEGORIES = new Set(['billing_issue', 'invoice_dispute', 'payment_issue', 'refund_request', 'cancellation_request']);

function classify(text: string): { category: string; severity: string; risk_flags: string[]; financial: boolean } {
  const t = (text ?? '').toLowerCase();
  let category = 'other';
  if (/refund|money back/.test(t)) category = 'refund_request';
  else if (/invoice|bill/.test(t)) category = 'invoice_dispute';
  else if (/payment|charge|paid/.test(t)) category = 'payment_issue';
  else if (/cancel|terminate|end (the )?contract/.test(t)) category = 'cancellation_request';
  else if (/deliver|deadline|late/.test(t)) category = 'delivery_issue';
  else if (/supplier|vendor|third[- ]party/.test(t)) category = 'supplier_issue';
  else if (/onboard|setup|getting started/.test(t)) category = 'onboarding_issue';
  else if (/support|response|reply|ticket/.test(t)) category = 'support_delay';
  else if (/proposal|quote|scope/.test(t)) category = 'proposal_mismatch';
  else if (/demo/.test(t)) category = 'demo_issue';
  else if (/communication|silent|no reply/.test(t)) category = 'communication_issue';
  else if (/bug|error|broken|technical|down/.test(t)) category = 'technical_issue';
  else if (/quality|poor|bad|unhappy|disappointed/.test(t)) category = 'service_quality';

  let severity: string = 'medium';
  if (/urgent|critical|legal|sue|lawyer|breach|gdpr|chargeback/.test(t)) severity = 'critical';
  else if (/very (unhappy|disappointed)|terrible|awful|cancel|refund/.test(t)) severity = 'high';
  else if (/minor|small|fyi/.test(t)) severity = 'low';

  const risk_flags: string[] = [];
  if (/legal|sue|lawyer|breach|gdpr/.test(t)) risk_flags.push('legal_review');
  if (/chargeback|fraud/.test(t)) risk_flags.push('finance_review');
  if (/data|privacy|gdpr/.test(t)) risk_flags.push('compliance_review');
  if (/social|twitter|linkedin|public/.test(t)) risk_flags.push('reputation_risk');

  return { category, severity, risk_flags, financial: FINANCIAL_CATEGORIES.has(category) };
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
    if (!(roles ?? []).some((r: any) => ['admin', 'founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id, contact_id, source_table, source_id, complaint_text, customer_requested_resolution, conversation_id, support_request_id, invoice_id, payment_id, assignment_id, dry_run = true, confirmation } = body ?? {};
    if (!complaint_text) return new Response(JSON.stringify({ error: 'complaint_text required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { category, severity, risk_flags, financial } = classify(complaint_text);

    const complaintRow: any = {
      business_id: business_id ?? null,
      contact_id: contact_id ?? null,
      conversation_id: conversation_id ?? null,
      support_request_id: support_request_id ?? null,
      invoice_id: invoice_id ?? null,
      payment_id: payment_id ?? null,
      assignment_id: assignment_id ?? null,
      complaint_status: 'open',
      complaint_category: category,
      severity,
      customer_summary: complaint_text.slice(0, 1000),
      internal_summary: `Auto-classified ${category} (${severity}). Source: ${source_table ?? 'manual'}/${source_id ?? '—'}.`,
      customer_requested_resolution: customer_requested_resolution ?? null,
      risk_flags,
      response_due_at: new Date(Date.now() + (severity === 'critical' ? 4 : severity === 'high' ? 24 : 72) * 3600 * 1000).toISOString(),
      founder_review_required: true,
      compliance_review_required: risk_flags.includes('compliance_review'),
      legal_review_recommended: risk_flags.includes('legal_review'),
      owner_agent_key: 'customer_recovery_agent',
      metadata: { source_table, source_id },
    };

    const disputePreview = financial ? {
      business_id: business_id ?? null,
      contact_id: contact_id ?? null,
      invoice_id: invoice_id ?? null,
      payment_id: payment_id ?? null,
      assignment_id: assignment_id ?? null,
      dispute_type: category === 'refund_request' ? 'refund_request' : category === 'cancellation_request' ? 'cancellation' : category === 'payment_issue' ? 'payment_dispute' : 'invoice_dispute',
      dispute_status: 'open',
      customer_position: complaint_text.slice(0, 1000),
      founder_approval_required: true,
      finance_review_required: true,
    } : null;

    const agentTasks = [
      'customer_recovery_agent',
      ...(category === 'support_delay' || category === 'communication_issue' ? ['support_agent'] : []),
      ...(financial ? ['finance_agent'] : []),
      ...(category === 'supplier_issue' || category === 'delivery_issue' ? ['supplier_agent'] : []),
      ...(risk_flags.includes('compliance_review') || risk_flags.includes('legal_review') ? ['compliance_agent'] : []),
    ];

    if (dry_run !== false) {
      return new Response(JSON.stringify({ dry_run: true, complaint_preview: complaintRow, dispute_preview: disputePreview, agent_tasks_preview: agentTasks, external_send: false, financial_mutation: false, confirmation_required: CONFIRM }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ error: 'confirmation_required', expected: CONFIRM }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: complaint, error } = await admin.from('customer_complaints').insert(complaintRow).select('*').single();
    if (error) throw error;

    let dispute: any = null;
    if (disputePreview) {
      const { data: d } = await admin.from('customer_disputes').insert({ ...disputePreview, complaint_id: complaint.id }).select('*').single();
      dispute = d;
    }

    try {
      await admin.from('founder_approval_items').insert({
        item_type: 'customer_complaint',
        target_table: 'customer_complaints',
        target_id: complaint.id,
        status: 'pending',
        metadata: { contact_id, business_id, severity, category, risk_flags },
      });
    } catch { /* optional */ }

    return new Response(JSON.stringify({ complaint, dispute, agent_tasks: agentTasks, external_send: false, financial_mutation: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});