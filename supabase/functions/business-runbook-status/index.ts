import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes('admin') && !roles.includes('founder')) {
      return json({ error: 'forbidden_requires_founder_or_admin' }, 403);
    }

    let body: any = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const business_id: string | null = body?.business_id ?? null;

    let query = admin.from('business_operating_runbooks').select('*').eq('status', 'active');
    if (business_id) query = query.eq('business_id', business_id);
    const { data: runbooks, error: rbErr } = await query.order('runbook_key');
    if (rbErr) return json({ error: rbErr.message }, 500);

    // Pull approval and gate context (read-only) for blocker derivation
    const { data: approvals } = await admin
      .from('founder_approval_items')
      .select('id,status,approval_type,priority_level,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    const { data: gates } = await admin
      .from('external_action_gates')
      .select('gate_key,enabled,risk_level,confirmation_phrase');

    const pendingApprovals = (approvals ?? []).filter((a: any) => a.status === 'pending').length;
    const approvedWaiting = (approvals ?? []).filter((a: any) => a.status === 'approved').length;
    const enabledGates = (gates ?? []).filter((g: any) => g.enabled).map((g: any) => g.gate_key);

    const enriched = (runbooks ?? []).map((rb: any) => {
      const steps = Array.isArray(rb.steps) ? rb.steps : [];
      const blockers: string[] = [];
      let nextAction: string | null = null;

      if (rb.runbook_key === 'neon_candy_approval_session' && pendingApprovals === 0 && approvedWaiting === 0) {
        blockers.push('no_items_in_approval_queue');
      }
      if (rb.runbook_key === 'neon_candy_smartlead_activation') {
        const requiredGates = ['smartlead_lead_push_gate', 'smartlead_campaign_start_gate', 'smartlead_webhook_create_gate'];
        const missing = requiredGates.filter((g) => !enabledGates.includes(g));
        if (missing.length) blockers.push(`gates_disabled:${missing.join(',')}`);
        blockers.push('no_founder_smartlead_send_authorisation');
      }

      // Next action = first step
      const firstStep = steps[0];
      if (firstStep) nextAction = firstStep.label ?? null;

      return {
        ...rb,
        completion: {
          total_steps: steps.length,
          completed_steps: 0,
          state: blockers.length ? 'blocked' : 'ready',
        },
        blockers,
        next_action: nextAction,
      };
    });

    return json({
      runbooks: enriched,
      context: {
        pending_approvals: pendingApprovals,
        approved_waiting: approvedWaiting,
        enabled_gates: enabledGates,
      },
      safety: {
        no_email_sent: true,
        no_apollo_call: true,
        no_smartlead_post: true,
        no_campaign_start: true,
      },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? 'unknown_error' }, 500);
  }
});