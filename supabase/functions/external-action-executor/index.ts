import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function audit(admin: any, payload: Record<string, unknown>) {
  await admin.from('agent_action_audit_log').insert({
    agent_key: 'external_action_executor',
    source_function: 'external-action-executor',
    dry_run: false,
    ...payload,
  });
}

async function logResult(admin: any, payload: Record<string, unknown>) {
  const { data } = await admin.from('execution_result_log').insert(payload).select('id').single();
  return data?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userId = userData.user.id;
  const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', userId);
  const roles = (roleRows ?? []).map((r: any) => r.role);
  if (!roles.includes('admin') && !roles.includes('founder')) {
    return json({ error: 'forbidden_requires_founder_or_admin' }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const action_type: string | undefined = body.action_type;
  const approved_action_id: string | undefined = body.approved_action_id;
  const approved_action_ids: string[] = Array.isArray(body.approved_action_ids) ? body.approved_action_ids : [];
  const dry_run: boolean = body.dry_run !== false;
  const confirmation: string = body.confirmation ?? '';

  if (!action_type) return json({ error: 'action_type_required' }, 400);

  if (dry_run) {
    return json({
      ok: true,
      dry_run: true,
      action_type,
      message: 'Dry run — no external action executed.',
      safety: { executed: 0, emails_sent: 0, apollo_calls: 0, smartlead_posts: 0 },
    });
  }

  // Load the gate
  const { data: gate, error: gateErr } = await admin
    .from('external_action_gates')
    .select('*')
    .eq('action_type', action_type)
    .maybeSingle();

  if (gateErr || !gate) {
    return json({ error: 'gate_not_found', action_type }, 404);
  }

  if (!gate.enabled) {
    await audit(admin, {
      action_type: 'external_action_blocked',
      action_status: 'blocked',
      blocked_reason: 'gate_disabled',
      founder_user_id: userId,
      confirmation_phrase: confirmation,
      metadata: { gate_key: gate.gate_key, requested_action: action_type },
    });
    return json({ error: 'gate_disabled', gate_key: gate.gate_key }, 423);
  }

  if (gate.requires_founder_confirmation && confirmation !== gate.confirmation_phrase) {
    await audit(admin, {
      action_type: 'external_action_blocked',
      action_status: 'blocked',
      blocked_reason: 'confirmation_phrase_mismatch',
      founder_user_id: userId,
      metadata: { gate_key: gate.gate_key, requested_action: action_type },
    });
    return json({
      error: 'confirmation_phrase_required',
      gate_key: gate.gate_key,
      required_phrase: gate.confirmation_phrase,
    }, 400);
  }

  const ids = approved_action_id ? [approved_action_id] : approved_action_ids;
  if (ids.length > gate.max_batch_size) {
    return json({
      error: 'batch_size_exceeded',
      max_batch_size: gate.max_batch_size,
      requested: ids.length,
    }, 400);
  }

  // Load approvals (if any)
  let approvals: any[] = [];
  if (ids.length > 0) {
    const { data } = await admin
      .from('founder_approval_items')
      .select('*')
      .in('id', ids);
    approvals = data ?? [];
  }

  // Execution router — every path returns blocked with reason for now
  // External provider plumbing is intentionally not wired until a dedicated
  // controlled-activation prompt enables it.
  const blockedReasonByType: Record<string, string> = {
    native_email_send: 'native email send path not activated — requires Smartlead Controlled Activation prompt',
    smartlead_lead_push: 'smartlead lead push path not activated — requires Smartlead Controlled Activation prompt',
    smartlead_campaign_start: 'smartlead campaign start blocked by safety policy until controlled activation',
    smartlead_webhook_create: 'smartlead webhook create not yet wired',
    apollo_reveal: 'apollo reveal path not activated — requires controlled activation prompt',
    apollo_candidate_pull: 'apollo candidate pull not yet wired',
    compliance_action: 'compliance action requires reviewer service binding',
    compliance_suppression: 'compliance suppression requires suppression list integration',
    invoice_send: 'invoice send requires finance provider binding',
    proposal_send: 'proposal send requires native_email_send_gate to be activated first',
  };

  const reason = blockedReasonByType[action_type] ?? 'no_executor_bound';

  const results: any[] = [];
  if (approvals.length === 0) {
    const log_id = await logResult(admin, {
      approved_action_id: null,
      business_id: null,
      action_type,
      execution_status: 'blocked',
      blocked_reason: reason,
      external_action_attempted: false,
      metadata: { gate_key: gate.gate_key, no_approval_provided: true },
    });
    await audit(admin, {
      action_type: 'external_action_blocked',
      action_status: 'blocked',
      blocked_reason: reason,
      founder_user_id: userId,
      confirmation_phrase: confirmation,
      metadata: { gate_key: gate.gate_key, log_id },
    });
    results.push({ approved_action_id: null, status: 'blocked', reason });
  } else {
    for (const a of approvals) {
      const log_id = await logResult(admin, {
        approved_action_id: a.id,
        business_id: a.business_id,
        action_type,
        execution_status: 'blocked',
        blocked_reason: reason,
        external_action_attempted: false,
        metadata: { gate_key: gate.gate_key, approval_type: a.approval_type },
      });
      await audit(admin, {
        action_type: 'external_action_blocked',
        action_status: 'blocked',
        blocked_reason: reason,
        founder_user_id: userId,
        confirmation_phrase: confirmation,
        target_table: 'founder_approval_items',
        target_id: a.id,
        business_id: a.business_id,
        metadata: { gate_key: gate.gate_key, log_id },
      });
      results.push({ approved_action_id: a.id, status: 'blocked', reason });
    }
  }

  await admin
    .from('external_action_gates')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', gate.id);

  return json({
    ok: true,
    dry_run: false,
    gate_key: gate.gate_key,
    action_type,
    executed: 0,
    blocked: results.length,
    results,
    safety: {
      emails_sent: 0,
      apollo_calls: 0,
      smartlead_posts: 0,
      note: 'Provider execution paths are intentionally not bound. Each external action returns blocked with reason until controlled-activation prompts wire them.',
    },
  });
});