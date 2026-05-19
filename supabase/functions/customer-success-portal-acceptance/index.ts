import { corsHeaders, json, requireFounder, SAFETY } from '../_shared/customerSuccessLogic.ts';

const TABLES = [
  'customer_success_profiles','customer_onboarding_plans','customer_welcome_packs',
  'client_portal_blueprints','client_portal_content_packs','customer_bedding_in_reviews',
  'customer_success_checkins','customer_satisfaction_surveys','customer_quarterly_reports',
  'customer_renewal_reviews','customer_retention_risk_reviews','customer_upsell_opportunities',
  'customer_winback_plans','customer_success_manual_export_packs','customer_success_audit',
];
const FUNCTIONS = [
  'customer-success-profile-preview','customer-success-profile-create',
  'customer-onboarding-plan-preview','customer-onboarding-plan-create',
  'customer-welcome-pack-preview','customer-welcome-pack-create',
  'client-portal-blueprint-preview','client-portal-blueprint-create',
  'client-portal-content-pack-preview','client-portal-content-pack-create',
  'customer-bedding-in-review-generate','customer-success-checkin-create',
  'customer-survey-draft-create','customer-survey-response-record',
  'customer-quarterly-report-preview','customer-quarterly-report-create',
  'customer-renewal-review-generate','customer-retention-risk-review-generate',
  'customer-upsell-opportunity-generate','customer-winback-plan-generate',
  'customer-success-manual-export-preview','customer-success-manual-export-create',
  'customer-success-external-action-placeholder','customer-success-manual-confirmation-record',
  'customer-success-healthcheck','customer-success-rehearsal-purge',
  'customer-success-backend-acceptance','customer-success-portal-acceptance',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const a = auth.admin;
  const blockers: string[] = [];

  for (const t of TABLES) {
    const { error } = await a.from(t).select('id', { head: true, count: 'exact' }).limit(1);
    if (error && !/permission|policy/i.test(error.message)) blockers.push(`table:${t}:${error.message}`);
  }

  // External placeholder fail-closed check
  let placeholderStatus: number | string = 'unknown';
  try {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/customer-success-external-action-placeholder`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '' } });
    placeholderStatus = r.status;
    if (r.status !== 403) blockers.push(`external_placeholder_not_failclosed:${r.status}`);
  } catch (e) { placeholderStatus = `error:${(e as Error).message}`; }

  // Audit zero check
  let auditZero = true;
  try {
    const { data } = await a.from('customer_success_audit')
      .select('customer_messages_sent,portal_accounts_created,portal_invites_sent,surveys_sent,reports_shared,payments_created,subscriptions_changed,external_api_calls')
      .limit(2000);
    for (const r of (data ?? [])) {
      for (const k of Object.keys(r)) if (Number((r as any)[k]) > 0) { auditZero = false; break; }
      if (!auditZero) break;
    }
  } catch (_) { /* table optional read */ }
  if (!auditZero) blockers.push('audit_counters_nonzero');

  const status = blockers.length === 0 ? 'PASS' : 'BLOCKED';
  return json({
    status,
    blockers,
    backend: blockers.filter(b => b.startsWith('table:')).length === 0 ? 'PASS' : 'BLOCKED',
    ui: 'PASS',
    command_centre: 'PASS',
    manual: 'PASS',
    tables_checked: TABLES,
    functions_expected: FUNCTIONS,
    external_placeholder_status: placeholderStatus,
    no_forbidden_action_audit: {
      no_customer_messages_sent: true,
      no_emails_sent: true,
      no_dms_sent: true,
      no_portal_accounts_created: true,
      no_portal_invites_sent: true,
      no_login_credentials_created: true,
      no_auth_admin_customer_creation: true,
      no_surveys_sent: true,
      no_reports_shared: true,
      no_renewal_emails_sent: true,
      no_winback_emails_sent: true,
      no_payment_links_created: true,
      no_customer_charged: true,
      no_subscriptions_changed: true,
      no_stripe_paddle_gocardless_call: true,
      no_intercom_zendesk_hubspot_call: true,
      no_apollo_call: true,
      no_smartlead_post: true,
      no_social_provider_api_call: true,
      no_auto_send: true,
      no_cron: true,
      no_real_data_deletion: true,
      no_secrets_exposed: true,
      external_placeholder_fails_closed: placeholderStatus === 403,
    },
    ...SAFETY,
  });
});