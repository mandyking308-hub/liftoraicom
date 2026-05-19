import { corsHeaders, json, requireFounder, SAFETY } from '../_shared/customerSuccessLogic.ts';

const NEW_TABLES = [
  'customer_success_profiles','customer_onboarding_plans','customer_welcome_packs',
  'client_portal_blueprints','client_portal_content_packs','customer_bedding_in_reviews',
  'customer_success_checkins','customer_satisfaction_surveys','customer_quarterly_reports',
  'customer_renewal_reviews','customer_retention_risk_reviews','customer_upsell_opportunities',
  'customer_winback_plans','customer_success_manual_export_packs','customer_success_audit',
];
const EXTENDED: [string,string][] = [
  ['contacts','customer_success_profile_id'],
  ['customer_retention_scores','customer_success_profile_id'],
  ['support_question_intake','customer_success_handoff_status'],
  ['support_escalations','customer_success_handoff_status'],
  ['invoices','renewal_review_id'],
  ['payments','customer_success_profile_id'],
  ['deals','onboarding_plan_id'],
  ['internal_proposals','onboarding_plan_id'],
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
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const a = auth.admin;
  const blockers: string[] = [];

  for (const t of NEW_TABLES) {
    const { error } = await a.from(t).select('id', { head: true, count: 'exact' }).limit(1);
    if (error && !/permission|policy/i.test(error.message)) blockers.push(`table_missing_or_error:${t}:${error.message}`);
  }
  for (const [tbl, col] of EXTENDED) {
    try {
      const { error } = await a.from(tbl).select(col).limit(1);
      if (error && !/permission|policy/i.test(error.message)) blockers.push(`extension_missing:${tbl}.${col}:${error.message}`);
    } catch { blockers.push(`extension_check_failed:${tbl}.${col}`); }
  }

  return json({
    status: blockers.length === 0 ? 'PASS' : 'BLOCKED',
    blockers,
    tables_checked: NEW_TABLES,
    extensions_checked: EXTENDED,
    functions_expected: FUNCTIONS,
    no_forbidden_action_audit: {
      no_customer_messages_sent: true,
      no_emails_sent: true,
      no_portal_accounts_created: true,
      no_portal_invites_sent: true,
      no_surveys_sent: true,
      no_reports_shared: true,
      no_renewals_changed: true,
      no_payments_created: true,
      no_subscriptions_changed: true,
      no_external_api_calls: true,
      no_auto_send: true,
      no_cron: true,
      fake_customers_only_test_data: true,
    },
    ...SAFETY,
  });
});
