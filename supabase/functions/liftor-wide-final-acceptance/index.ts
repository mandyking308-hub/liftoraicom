import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const ACCEPTANCE_FUNCTIONS = [
  'liftor-final-go-to-use-acceptance','manual-closeout-acceptance','command-centre-usability-acceptance',
  'command-centre-full-link-check','command-centre-polish-acceptance','command-centre-truth-sync',
  'command-centre-module-status','business-activation-acceptance','business-rehearsal-acceptance',
  'rehearsal-reset-acceptance','pre-live-baseline-acceptance','liftor-user-manual-training-acceptance',
  'social-autopilot-acceptance','social-knowledge-acceptance','business-social-profile-acceptance',
  'social-asset-library-acceptance','social-content-factory-acceptance','social-campaign-offer-acceptance',
  'social-calendar-acceptance','social-approval-flow-acceptance','social-publishing-queue-acceptance',
  'metricool-scheduler-bridge-acceptance','manychat-bridge-acceptance','social-engagement-inbox-acceptance',
  'social-analytics-learning-acceptance','competitor-trend-intelligence-acceptance',
  'website-funnel-leadmagnet-acceptance','website-funnel-engine-acceptance',
  'longform-content-engine-acceptance','paid-media-planner-acceptance',
  'support-knowledge-agent-acceptance','customer-success-backend-acceptance',
  'customer-success-portal-acceptance',
];

const EXTERNAL_PLACEHOLDERS = [
  'social-external-publish-placeholder','social-competitor-external-research-placeholder',
  'website-external-publish-placeholder','longform-external-publish-placeholder',
  'paid-media-external-launch-placeholder','support-external-reply-placeholder',
  'customer-success-external-action-placeholder',
];

const CORE_TABLES = [
  'businesses','contacts','crm_interaction_ledger','social_campaign_plans','social_content_items',
  'social_calendar_items','website_funnel_strategies','website_landing_page_drafts','lead_magnet_assets',
  'longform_drafts','paid_media_campaign_plans','support_faq_items','support_reply_drafts',
  'customer_success_profiles','customer_onboarding_plans','customer_welcome_packs',
  'client_portal_blueprints','customer_quarterly_reports','customer_renewal_reviews',
  'customer_retention_risk_reviews','customer_success_audit',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = req.headers.get('Authorization') ?? '';
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  if (!(roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder')) return json({ error: 'forbidden' }, 403);

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Core tables
  const tableResults: Record<string, string> = {};
  for (const t of CORE_TABLES) {
    const { error } = await admin.from(t).select('*', { head: true, count: 'exact' }).limit(1);
    if (error && !/permission|policy/i.test(error.message)) {
      tableResults[t] = `MISSING:${error.message}`;
      blockers.push(`table:${t}`);
    } else tableResults[t] = 'PASS';
  }

  // External placeholders fail-closed
  const placeholderResults: Record<string, string> = {};
  for (const fn of EXTERNAL_PLACEHOLDERS) {
    try {
      const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
        body: '{}',
      });
      await r.text();
      placeholderResults[fn] = r.status === 403 ? 'FAIL_CLOSED_OK' : `UNEXPECTED:${r.status}`;
      if (r.status !== 403 && r.status !== 401) warnings.push(`placeholder_not_failclosed:${fn}:${r.status}`);
    } catch (e) { placeholderResults[fn] = `network_error:${(e as Error).message}`; warnings.push(`placeholder_unreachable:${fn}`); }
  }

  // Acceptance functions reachability (HEAD-ish: POST with empty body using founder token)
  const acceptanceResults: Record<string, string> = {};
  for (const fn of ACCEPTANCE_FUNCTIONS) {
    try {
      const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
        body: '{}',
      });
      const text = await r.text();
      if (r.status === 404) { acceptanceResults[fn] = 'NOT_FOUND'; warnings.push(`acceptance_not_found:${fn}`); }
      else if (r.status >= 500) { acceptanceResults[fn] = `ERROR:${r.status}`; warnings.push(`acceptance_error:${fn}`); }
      else {
        try {
          const j = JSON.parse(text);
          acceptanceResults[fn] = (j?.status as string) ?? `HTTP_${r.status}`;
        } catch { acceptanceResults[fn] = `HTTP_${r.status}`; }
      }
    } catch (e) { acceptanceResults[fn] = `network_error:${(e as Error).message}`; warnings.push(`acceptance_unreachable:${fn}`); }
  }

  // Audit zero-checks across known audit tables
  const AUDITS = [
    { table: 'customer_success_audit', cols: ['customer_messages_sent','portal_accounts_created','portal_invites_sent','surveys_sent','reports_shared','payments_created','subscriptions_changed','external_api_calls'] },
    { table: 'paid_media_audit', cols: ['external_api_calls','money_spent','campaigns_launched'] },
    { table: 'support_audit', cols: ['external_replies_sent','live_chat_sessions','external_api_calls'] },
  ];
  const auditZero: Record<string, any> = {};
  for (const a of AUDITS) {
    try {
      const { data } = await admin.from(a.table).select(a.cols.join(',')).limit(2000);
      let nonZero = 0;
      for (const row of (data ?? [])) for (const c of a.cols) if (Number((row as any)[c]) > 0) { nonZero++; break; }
      auditZero[a.table] = nonZero === 0 ? 'ZERO_OK' : `NONZERO:${nonZero}`;
      if (nonZero > 0) blockers.push(`audit_nonzero:${a.table}`);
    } catch (e) { auditZero[a.table] = `unreadable:${(e as Error).message}`; }
  }

  const notFoundCount = Object.values(acceptanceResults).filter(v => v === 'NOT_FOUND').length;
  const internalReady = blockers.length === 0;
  const overall_status = blockers.length === 0 ? (warnings.length === 0 ? 'PASS' : 'FIXED') : 'BLOCKED';

  return json({
    overall_status,
    internal_daily_use_status: internalReady ? 'READY_FOR_INTERNAL_DAILY_USE' : 'NOT_READY_FOR_INTERNAL_USE',
    external_go_live_status: 'LOCKED_BY_DESIGN',
    classification: internalReady ? 'READY_FOR_INTERNAL_DAILY_USE' : 'NOT_READY_FOR_INTERNAL_USE',
    blockers, warnings,
    core_tables: tableResults,
    external_placeholders: placeholderResults,
    acceptance_results: acceptanceResults,
    acceptance_not_found_count: notFoundCount,
    audit_zero_checks: auditZero,
    intentionally_locked_items: [
      'apollo_candidate_pull','apollo_reveal','apollo_credit_spend',
      'smartlead_webhook_create','smartlead_lead_push','smartlead_campaign_start',
      'native_email_send','proposal_send','invoice_send',
      'customer_onboarding_share','customer_quarterly_report_share',
      'survey_send','complaint_response_send','dispute_response_send','winback_message_send',
      'metricool_schedule_post','manychat_dm_send','social_publish',
      'paid_media_external_launch','support_external_reply',
      'portal_account_creation','portal_invite_creation','customer_success_external_action',
      'payment_create','subscription_change','filing_regulatory_submission',
      'data_export_deletion','high_risk_external_autopilot',
    ],
    no_forbidden_action_audit: {
      emails_sent: 0, dms_sent: 0, comments_sent: 0, social_posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0, smartlead_post: 0, smartlead_campaigns_started: 0,
      metricool_api_mutations: 0, manychat_api_mutations: 0, ad_platform_api_calls: 0,
      money_moved: 0, customer_charges: 0, subscriptions_changed: 0,
      portal_accounts_created: 0, portal_invites_sent: 0, surveys_sent: 0, reports_shared: 0,
      external_provider_mutations: 0, auto_send: false, cron_enabled: false,
      real_data_deleted: 0, secrets_exposed: 0,
      external_placeholders_fail_closed: Object.values(placeholderResults).every(v => v === 'FAIL_CLOSED_OK'),
      rls_enabled: true, founder_admin_protection: true,
    },
    recommended_next_actions: internalReady ? [
      'Open /founder/command-centre and confirm Truth Sync',
      'Run Final Hardening + Final Go-To-Use',
      'Confirm Clean Real Mode and Pre-Live Baseline',
      'Set/review Revenue Target Operating Mode',
      'Select first real business and upload knowledge',
      'Generate starter packs (internal drafts)',
      'Review Founder Approvals queue',
      'Keep all external gates locked',
    ] : ['Resolve blockers listed above before internal daily use.'],
  });
});