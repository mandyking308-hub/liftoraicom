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

function classifyApproval(approvalType: string): string | null {
  const t = (approvalType || '').toLowerCase();
  if (t.includes('send_email') || t.includes('email_send')) return 'native_email_send';
  if (t.includes('smartlead_campaign')) return 'smartlead_campaign_start';
  if (t.includes('smartlead_webhook')) return 'smartlead_webhook_create';
  if (t.includes('smartlead')) return 'smartlead_lead_push';
  if (t.includes('apollo_reveal')) return 'apollo_reveal';
  if (t.includes('apollo')) return 'apollo_candidate_pull';
  if (t.includes('compliance_suppression')) return 'compliance_suppression';
  if (t.includes('compliance')) return 'compliance_action';
  if (t.includes('invoice_send') || t.includes('live_invoice_send')) return 'invoice_send';
  if (t.includes('proposal_send')) return 'proposal_send';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

  const { data: gates } = await admin.from('external_action_gates').select('*').order('gate_key');
  const { data: approvals } = await admin
    .from('founder_approval_items')
    .select('id,business_id,approval_type,title,status,execution_enabled,priority_level,created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: secrets } = await admin
    .from('provider_secret_registry')
    .select('provider_key,secret_present')
    .then((r: any) => r);

  const secretsByProvider = new Map<string, boolean>(
    (secrets ?? []).map((s: any) => [String(s.provider_key).toLowerCase(), !!s.secret_present])
  );

  const gatesByAction = new Map<string, any>();
  (gates ?? []).forEach((g: any) => gatesByAction.set(g.action_type, g));

  const queueByAction: Record<string, any[]> = {};
  for (const a of approvals ?? []) {
    const at = classifyApproval(a.approval_type);
    if (!at) continue;
    (queueByAction[at] ??= []).push(a);
  }

  const report = (gates ?? []).map((g: any) => {
    const queued = queueByAction[g.action_type] ?? [];
    const provider = g.provider_type ?? '';
    const secretRequired = ['smartlead', 'apollo', 'native_email'].includes(provider);
    const secretPresent = secretRequired ? !!secretsByProvider.get(provider) : true;
    const blockers: string[] = [];
    if (!g.enabled) blockers.push('gate_disabled');
    if (secretRequired && !secretPresent) blockers.push('provider_secret_missing');
    if (queued.length === 0) blockers.push('no_approved_actions_queued');
    return {
      gate_key: g.gate_key,
      gate_label: g.gate_label,
      action_type: g.action_type,
      provider_type: g.provider_type,
      enabled: g.enabled,
      risk_level: g.risk_level,
      max_batch_size: g.max_batch_size,
      confirmation_phrase: g.confirmation_phrase,
      secret_present: secretPresent,
      approved_waiting: queued.length,
      ready: blockers.length === 0,
      blockers,
    };
  });

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    gates: report,
    totals: {
      gates: report.length,
      enabled: report.filter((g) => g.enabled).length,
      ready: report.filter((g) => g.ready).length,
      approved_waiting: Object.values(queueByAction).reduce((s, a) => s + a.length, 0),
    },
    safety: {
      executed: 0,
      emails_sent: 0,
      apollo_calls: 0,
      smartlead_posts: 0,
      note: 'readiness check is read-only; no external action attempted',
    },
  });
});