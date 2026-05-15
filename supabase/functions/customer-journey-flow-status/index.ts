import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safeCount(admin: any, table: string, filter?: (q: any) => any): Promise<number | null> {
  try {
    let q = admin.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const isFounder = (roles ?? []).some((r: any) => ['admin','founder'].includes(r.role));
    if (!isFounder) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let businessId: string | null = null;
    try { const body = await req.json(); businessId = body?.business_id ?? null; } catch {}

    const { data: steps } = await admin.from('command_centre_customer_journey_steps').select('*').eq('enabled', true).order('step_order');

    const tableMap: Record<string, string> = {
      source_candidates: 'apollo_pulls',
      reveal_or_import: 'apollo_reveals',
      promote_to_crm: 'crm_contacts',
      compliance_check: 'compliance_checks',
      campaign_or_channel_routing: 'outbound_lanes',
      outreach_or_social_touch: 'smartlead_campaigns',
      reply_or_engagement: 'social_engagements',
      crm_interaction_capture: 'crm_interaction_ledger',
      conversation_created: 'conversations',
      ai_intent_classification: 'ai_intent_classifications',
      ai_draft_or_next_action: 'ai_conversation_drafts',
      founder_approval: 'founder_approvals',
      approved_action_execution: 'approved_actions',
      proposal_ready: 'internal_proposals',
      proposal_created: 'proposals',
      proposal_sent_or_shared: 'proposals',
      proposal_viewed_or_accepted: 'proposal_events',
      demo_ready: 'demo_access',
      demo_access_created: 'demo_access',
      demo_viewed_or_completed: 'demo_events',
      deal_ready: 'deals',
      deal_created_or_updated: 'deals',
      invoice_ready: 'invoices',
      invoice_created: 'invoices',
      invoice_sent_or_paid: 'payments',
      supplier_or_delivery_needed: 'suppliers',
      supplier_assigned: 'supplier_assignments',
      assignment_completed: 'supplier_assignments',
      learning_signal_captured: 'learning_signals',
      customer_retention_or_next_campaign: 'marketing_campaigns',
    };

    const out = [];
    for (const step of steps ?? []) {
      const t = tableMap[step.step_key];
      const count = t ? await safeCount(admin, t, businessId ? (q) => q.eq('business_id', businessId) : undefined) : null;
      let status = 'not_configured';
      if (count === null) status = 'not_configured';
      else if (count === 0) status = 'no_data';
      else if (count > 0) status = 'active';
      out.push({
        step_key: step.step_key,
        step_label: step.step_label,
        step_order: step.step_order,
        journey_stage_group: step.journey_stage_group,
        owner_agent_key: step.owner_agent_key,
        route: step.primary_route,
        command_centre_anchor: step.command_centre_anchor,
        external_action_risk: step.external_action_risk,
        founder_approval_required: step.founder_approval_required,
        status,
        count: count ?? 0,
        blocker: status === 'not_configured' ? `Table ${t ?? 'n/a'} not present` : null,
        next_action: status === 'no_data' ? `Generate first ${step.step_label}` : (status === 'active' ? `Open ${step.step_label}` : `Configure module`),
        last_activity: null,
      });
    }

    return new Response(JSON.stringify({ business_id: businessId, steps: out }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});