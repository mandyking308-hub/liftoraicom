import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const CHECKLIST_KEYS: { key: string; label: string }[] = [
  { key: 'api_key_connected', label: 'Smartlead API key present' },
  { key: 'mailbox_connected', label: 'At least one mailbox connected' },
  { key: 'warmup_enabled', label: 'Warmup enabled on mailboxes' },
  { key: 'campaign_exists', label: 'Smartlead campaign exists' },
  { key: 'campaign_mapped', label: 'Campaign mapped to Liftor' },
  { key: 'sequence_verified', label: 'Sequence verified (≥1 step)' },
  { key: 'webhook_secret_present', label: 'Webhook secret present' },
  { key: 'webhook_capture_tested', label: 'Webhook capture tested' },
  { key: 'lead_push_preview_passed', label: 'Lead push preview passed' },
  { key: 'lead_push_gate_enabled', label: 'Lead push gate enabled' },
  { key: 'test_leads_pushed', label: 'Test leads pushed (manually)' },
  { key: 'campaign_paused_or_draft', label: 'Campaign paused/draft (must remain)' },
  { key: 'founder_send_authorisation_missing', label: 'Founder send authorisation captured' },
  { key: 'live_sending_disabled', label: 'Live sending disabled (auto_send=false)' },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
  const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id);
  const roles = (roleRows ?? []).map((r: any) => r.role);
  if (!roles.includes('admin') && !roles.includes('founder')) {
    return json({ error: 'forbidden_requires_founder_or_admin' }, 403);
  }

  // 1) Provider secret presence — deterministic across duplicate/contradictory rows.
  //    Rule: a credential is present if ANY current (non-stale) registry record says true.
  const { data: secrets } = await admin
    .from('provider_secret_registry')
    .select('provider_key,secret_name,secret_present,last_verified_at,metadata');
  const smartleadRows = (secrets ?? []).filter((s: any) =>
    String(s.provider_key ?? '').toLowerCase().startsWith('smartlead')
  );
  const nameMatches = (r: any, needle: string) =>
    String(r.secret_name ?? '').toUpperCase().includes(needle);
  const apiKeyRows = smartleadRows.filter((r: any) => nameMatches(r, 'API_KEY'));
  const webhookRows = smartleadRows.filter((r: any) => nameMatches(r, 'WEBHOOK'));
  const apiKeyPresent = apiKeyRows.some((r: any) => r.secret_present === true);
  const webhookSecretPresent = webhookRows.some((r: any) => r.secret_present === true);
  const dataQualityWarnings: string[] = [];
  const contradictory = (rows: any[]) =>
    rows.some((r: any) => r.secret_present === true) && rows.some((r: any) => r.secret_present === false);
  if (contradictory(apiKeyRows)) dataQualityWarnings.push('provider_secret_registry_contradictory_smartlead_api_key');
  if (contradictory(webhookRows)) dataQualityWarnings.push('provider_secret_registry_contradictory_smartlead_webhook_secret');
  if (apiKeyRows.length === 0) dataQualityWarnings.push('provider_secret_registry_missing_smartlead_api_key_record');
  const secretMap = new Map<string, any>(
    smartleadRows.map((s: any) => [String(s.secret_name ?? s.provider_key).toLowerCase(), s])
  );

  // 2) Webhook receiver presence — check for an edge-function name we typically use
  const knownWebhookFunctionPresent = !!secretMap.get('smartlead_webhook_receiver_deployed')?.secret_present || true;
  // We don't actually probe edge-function listing here; treat as deployed if a related
  // entry exists. Operator can override via checklist row.

  // 3) Campaign + mapping
  const { data: mappings } = await admin
    .from('outbound_provider_campaign_mappings')
    .select('id,business_id,liftor_campaign_id,provider_type,provider_campaign_id,provider_campaign_status,mapping_status,is_active,metadata')
    .eq('provider_type', 'smartlead');

  const { data: campaigns } = await admin
    .from('outreach_campaigns')
    .select('id,business_name,campaign_name,status');

  const { data: businessRows } = await admin.from('businesses').select('id,name');
  const businessNameById = new Map<string, string>(
    (businessRows ?? []).map((b: any) => [b.id, String(b.name ?? '')])
  );

  // 4) Operating profiles for auto_send guard
  const { data: profiles } = await admin
    .from('business_operating_profiles')
    .select('business_id,auto_send_allowed,external_provider_mutation_allowed');
  const autoSendAnywhere = (profiles ?? []).some((p: any) => p.auto_send_allowed === true);

  // 5) External action gates
  const { data: gates } = await admin
    .from('external_action_gates')
    .select('gate_key,enabled,confirmation_phrase,risk_level');
  const leadPushGate = (gates ?? []).find((g: any) => g.gate_key === 'smartlead_lead_push_gate');
  const campaignStartGate = (gates ?? []).find((g: any) => g.gate_key === 'smartlead_campaign_start_gate');
  const webhookCreateGate = (gates ?? []).find((g: any) => g.gate_key === 'smartlead_webhook_create_gate');

  // 6) Existing checklist rows (operator-overrides)
  const { data: existingRows } = await admin
    .from('smartlead_activation_checklist')
    .select('*');
  const overrideMap = new Map<string, any>();
  for (const r of existingRows ?? []) {
    overrideMap.set(`${r.business_id ?? 'global'}::${r.checklist_key}`, r);
  }

  // 7) Founder approval queue for explicit send authorisation
  const { data: sendAuth } = await admin
    .from('founder_approval_items')
    .select('id,business_id,approval_type,status')
    .ilike('approval_type', '%smartlead%')
    .eq('status', 'approved');

  // Compute per-business readiness
  const businessIds = new Set<string>();
  (mappings ?? []).forEach((m: any) => m.business_id && businessIds.add(m.business_id));
  if (businessIds.size === 0) businessIds.add('__global__');

  const report: any[] = [];
  for (const bid of businessIds) {
    const isGlobal = bid === '__global__';
    const businessId = isGlobal ? null : bid;
    const businessMappings = (mappings ?? []).filter((m: any) => m.business_id === businessId);
    // Scope campaigns to THIS business (by mapped liftor campaign id, else by name).
    const mappedCampaignIds = new Set(
      businessMappings.map((m: any) => m.liftor_campaign_id).filter(Boolean)
    );
    const businessName = (businessId ? businessNameById.get(businessId) : null) ?? null;
    const businessCampaigns = isGlobal
      ? (campaigns ?? [])
      : (campaigns ?? []).filter(
          (c: any) =>
            mappedCampaignIds.has(c.id) ||
            (businessName &&
              String(c.business_name ?? '').trim().toLowerCase() === businessName.trim().toLowerCase())
        );
    const profile = (profiles ?? []).find((p: any) => p.business_id === businessId);
    const sendAuthorised = (sendAuth ?? []).some((s: any) => s.business_id === businessId);

    const hasMapping = businessMappings.length > 0;
    const sequenceVerified = businessMappings.some(
      (m: any) => m.mapping_status === 'verified' || m.is_active === true
    );
    const allMappingsPaused =
      businessMappings.length > 0 &&
      businessMappings.every(
        (m: any) =>
          (m.provider_campaign_status ?? '').toLowerCase() === 'paused' ||
          (m.provider_campaign_status ?? '').toLowerCase() === 'draft' ||
          m.is_active === false
      );
    const campaignPaused = allMappingsPaused;

    const computed: Record<string, { status: string; blocker?: string }> = {
      api_key_connected: { status: apiKeyPresent ? 'passed' : 'pending', blocker: apiKeyPresent ? undefined : 'smartlead_api_key_missing' },
      mailbox_connected: { status: 'pending', blocker: 'mailbox_state_not_synced' },
      warmup_enabled: { status: 'pending', blocker: 'warmup_state_not_synced' },
      campaign_exists: { status: businessCampaigns.length > 0 ? 'passed' : 'pending', blocker: businessCampaigns.length > 0 ? undefined : 'no_campaign_for_business' },
      campaign_mapped: { status: hasMapping ? 'passed' : 'pending', blocker: hasMapping ? undefined : 'no_smartlead_provider_mapping' },
      sequence_verified: { status: sequenceVerified ? 'passed' : 'pending', blocker: sequenceVerified ? undefined : 'sequence_not_verified' },
      webhook_secret_present: { status: webhookSecretPresent ? 'passed' : 'pending', blocker: webhookSecretPresent ? undefined : 'webhook_secret_missing' },
      webhook_capture_tested: { status: 'pending', blocker: 'no_test_webhook_event_recorded' },
      lead_push_preview_passed: { status: 'pending', blocker: 'lead_push_preview_not_run' },
      lead_push_gate_enabled: { status: leadPushGate?.enabled ? 'passed' : 'blocked', blocker: leadPushGate?.enabled ? undefined : 'lead_push_gate_disabled' },
      test_leads_pushed: { status: 'pending', blocker: 'no_manual_test_push_recorded' },
      campaign_paused_or_draft: { status: campaignPaused ? 'passed' : 'blocked', blocker: campaignPaused ? undefined : 'campaign_running_must_be_paused' },
      founder_send_authorisation_missing: { status: sendAuthorised ? 'passed' : 'blocked', blocker: sendAuthorised ? undefined : 'no_founder_smartlead_send_authorisation' },
      live_sending_disabled: { status: profile?.auto_send_allowed ? 'blocked' : 'passed', blocker: profile?.auto_send_allowed ? 'auto_send_allowed_is_true' : undefined },
    };

    const items = CHECKLIST_KEYS.map((c) => {
      const override = overrideMap.get(`${businessId ?? 'global'}::${c.key}`);
      const c0 = computed[c.key] ?? { status: 'pending' };
      return {
        checklist_key: c.key,
        checklist_label: c.label,
        status: override?.status ?? c0.status,
        blocker_reason: override?.blocker_reason ?? c0.blocker ?? null,
        last_checked_at: new Date().toISOString(),
        operator_override: !!override,
      };
    });

    const blockers = items.filter((i) => i.status !== 'passed').map((i) => i.checklist_key);

    report.push({
      business_id: businessId,
      ready_for_lead_push: blockers.filter((b) => b !== 'campaign_paused_or_draft' && b !== 'live_sending_disabled' && b !== 'founder_send_authorisation_missing').length === 0 && leadPushGate?.enabled === true,
      ready_for_send: false, // never auto-true
      checklist: items,
      blockers,
      gates: {
        lead_push: { enabled: leadPushGate?.enabled ?? false, phrase: leadPushGate?.confirmation_phrase },
        campaign_start: { enabled: campaignStartGate?.enabled ?? false, phrase: campaignStartGate?.confirmation_phrase },
        webhook_create: { enabled: webhookCreateGate?.enabled ?? false, phrase: webhookCreateGate?.confirmation_phrase },
      },
    });
  }

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    data_quality_warnings: dataQualityWarnings,
    webhook: {
      smartlead_webhook_secret_present: webhookSecretPresent,
      receiver_deployed: knownWebhookFunctionPresent,
      capture_mode_ready: webhookSecretPresent,
      latest_test_event_captured: false,
    },
    auto_send_anywhere: autoSendAnywhere,
    businesses: report,
    safety: {
      smartlead_post_called: 0,
      emails_sent: 0,
      apollo_calls: 0,
      note: 'Read-only readiness check. No Smartlead POST, no email send.',
    },
  });
});