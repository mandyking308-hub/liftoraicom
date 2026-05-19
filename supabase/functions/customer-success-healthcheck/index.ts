import { corsHeaders, json, requireFounder } from '../_shared/customerSuccessLogic.ts';

async function count(admin: any, table: string, filter?: (q: any) => any): Promise<number> {
  try {
    let q = admin.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}
async function sum(admin: any, table: string, col: string): Promise<number> {
  try {
    const { data } = await admin.from(table).select(col).limit(10000);
    return (data ?? []).reduce((a: number, r: any) => a + Number(r?.[col] ?? 0), 0);
  } catch { return 0; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const a = auth.admin;
  const in60 = new Date(Date.now() + 60*24*3600*1000).toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  const result = {
    success_profiles_total: await count(a, 'customer_success_profiles'),
    onboarding_plans_total: await count(a, 'customer_onboarding_plans'),
    onboarding_needing_review: await count(a, 'customer_onboarding_plans', (q: any) => q.eq('approval_status','needs_review')),
    welcome_packs_total: await count(a, 'customer_welcome_packs'),
    portal_blueprints_total: await count(a, 'client_portal_blueprints'),
    portal_content_packs_total: await count(a, 'client_portal_content_packs'),
    bedding_reviews_due: await count(a, 'customer_bedding_in_reviews', (q: any) => q.in('review_status', ['scheduled','due'])),
    checkins_due: await count(a, 'customer_success_checkins', (q: any) => q.in('checkin_status', ['scheduled','due'])),
    surveys_draft_total: await count(a, 'customer_satisfaction_surveys', (q: any) => q.eq('survey_status','draft')),
    survey_responses_recorded: await count(a, 'customer_satisfaction_surveys', (q: any) => q.eq('survey_status','response_recorded')),
    quarterly_reports_total: await count(a, 'customer_quarterly_reports'),
    quarterly_reports_needing_review: await count(a, 'customer_quarterly_reports', (q: any) => q.eq('approval_status','needs_review')),
    renewals_due_60d: await count(a, 'customer_renewal_reviews', (q: any) => q.lte('renewal_date', in60).gte('renewal_date', today)),
    retention_risk_reviews_total: await count(a, 'customer_retention_risk_reviews'),
    high_risk_customers: await count(a, 'customer_success_profiles', (q: any) => q.in('retention_risk_level', ['high','critical'])),
    upsell_opportunities_total: await count(a, 'customer_upsell_opportunities'),
    winback_plans_total: await count(a, 'customer_winback_plans'),
    manual_exports_total: await count(a, 'customer_success_manual_export_packs'),
    customer_messages_sent_total: await sum(a, 'customer_success_audit', 'customer_messages_sent'),
    portal_accounts_created_total: await sum(a, 'customer_success_audit', 'portal_accounts_created'),
    portal_invites_sent_total: await sum(a, 'customer_success_audit', 'portal_invites_sent'),
    surveys_sent_total: await sum(a, 'customer_success_audit', 'surveys_sent'),
    reports_shared_total: await sum(a, 'customer_success_audit', 'reports_shared'),
    payments_created_total: await sum(a, 'customer_success_audit', 'payments_created'),
    subscriptions_changed_total: await sum(a, 'customer_success_audit', 'subscriptions_changed'),
    fake_customer_data_created_total: await sum(a, 'customer_success_audit', 'fake_customer_data_created'),
    no_external_action: true,
  };
  return json(result);
});
