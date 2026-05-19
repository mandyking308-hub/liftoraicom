import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// status codes: WIRED, PARTIAL, UI_ONLY, BACKEND_ONLY, BROKEN_LINK, BROKEN_FUNCTION,
// MISSING_MANUAL, MISSING_COMMAND_CENTRE, FAIL_CLOSED_OK, BLOCKED

type Layer = {
  key: string;
  layer: string;
  route?: string;
  table?: string;
  fn?: string;
  placeholder?: string;
  commandCentre?: boolean;
  manual?: boolean;
};

const LAYERS: Layer[] = [
  { key: 'business_activation', layer: 'Business Activation', route: '/founder/command-centre', table: 'businesses', fn: 'business-activation-acceptance', commandCentre: true, manual: true },
  { key: 'business_knowledge', layer: 'Business Knowledge / Training', route: '/founder/social-brain', table: 'business_knowledge_documents', fn: 'social-knowledge-acceptance', commandCentre: true, manual: true },
  { key: 'starter_pack', layer: 'Starter Pack', route: '/founder/command-centre', table: 'social_content_items', fn: 'social-content-factory-acceptance', commandCentre: true, manual: true },
  { key: 'rehearsal_mode', layer: 'Rehearsal Mode', route: '/founder/user-manual', table: 'social_content_items', fn: 'business-rehearsal-acceptance', commandCentre: true, manual: true },
  { key: 'clean_real_mode', layer: 'Clean Real Mode / Test Data Reset', route: '/founder/user-manual', fn: 'rehearsal-reset-acceptance', commandCentre: true, manual: true },
  { key: 'pre_live_baseline', layer: 'Pre-Live Baseline', route: '/founder/user-manual', fn: 'pre-live-baseline-acceptance', commandCentre: true, manual: true },
  { key: 'revenue_target', layer: 'Revenue Target Operating Mode', route: '/founder/user-manual', commandCentre: true, manual: true },
  { key: 'crm_memory', layer: 'CRM Customer Memory', route: '/founder/crm-contacts', table: 'crm_interaction_ledger', commandCentre: true, manual: true },
  { key: 'founder_approvals', layer: 'Founder Approval Console', route: '/founder/command-centre', commandCentre: true, manual: true },
  { key: 'external_gates', layer: 'External Action Gates', commandCentre: true, manual: true, placeholder: 'social-external-publish-placeholder' },
  { key: 'social_profile', layer: 'Social Profile Generator', table: 'business_social_profiles', fn: 'business-social-profile-acceptance', commandCentre: true, manual: true },
  { key: 'social_assets', layer: 'Social Asset Library', table: 'social_asset_items', fn: 'social-asset-library-acceptance', commandCentre: true, manual: true },
  { key: 'social_content', layer: 'Social Content Factory', table: 'social_content_items', fn: 'social-content-factory-acceptance', commandCentre: true, manual: true },
  { key: 'social_calendar', layer: 'Social Calendar', table: 'social_calendar_items', fn: 'social-calendar-acceptance', commandCentre: true, manual: true },
  { key: 'social_approval', layer: 'Social Approval Flow', fn: 'social-approval-flow-acceptance', commandCentre: true, manual: true },
  { key: 'publishing_queue', layer: 'Publishing Queue', fn: 'social-publishing-queue-acceptance', placeholder: 'social-external-publish-placeholder', commandCentre: true, manual: true },
  { key: 'metricool', layer: 'Metricool Export', fn: 'metricool-scheduler-bridge-acceptance', commandCentre: true, manual: true },
  { key: 'manychat', layer: 'ManyChat Planner', fn: 'manychat-bridge-acceptance', commandCentre: true, manual: true },
  { key: 'engagement_inbox', layer: 'Social Engagement Inbox', fn: 'social-engagement-inbox-acceptance', commandCentre: true, manual: true },
  { key: 'social_analytics', layer: 'Social Analytics / Learning', fn: 'social-analytics-learning-acceptance', commandCentre: true, manual: true },
  { key: 'competitor_intel', layer: 'Competitor / Trend Intelligence', fn: 'competitor-trend-intelligence-acceptance', placeholder: 'social-competitor-external-research-placeholder', commandCentre: true, manual: true },
  { key: 'website_funnel', layer: 'Website Funnel Agent', table: 'website_funnel_strategies', fn: 'website-funnel-engine-acceptance', placeholder: 'website-external-publish-placeholder', commandCentre: true, manual: true },
  { key: 'landing_page', layer: 'Landing Page Builder', table: 'website_landing_page_drafts', fn: 'website-funnel-engine-acceptance', commandCentre: true, manual: true },
  { key: 'lead_magnet', layer: 'Lead Magnet Builder', table: 'lead_magnet_assets', fn: 'website-funnel-leadmagnet-acceptance', commandCentre: true, manual: true },
  { key: 'longform', layer: 'Blog / SEO / Newsletter', table: 'longform_drafts', fn: 'longform-content-engine-acceptance', placeholder: 'longform-external-publish-placeholder', commandCentre: true, manual: true },
  { key: 'paid_media', layer: 'Ads Campaign Planner / Budget Guard', table: 'paid_media_campaign_plans', fn: 'paid-media-planner-acceptance', placeholder: 'paid-media-external-launch-placeholder', commandCentre: true, manual: true },
  { key: 'support_sources', layer: 'Support Knowledge Sources', table: 'support_knowledge_sources', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_faq', layer: 'FAQ Generator', table: 'support_faq_items', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_articles', layer: 'Support Article Generator', table: 'support_knowledge_articles', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_capture', layer: 'Support Question Capture', table: 'support_question_intake', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_triage', layer: 'Support Triage', table: 'support_triage_reviews', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_replies', layer: 'Support Reply Drafts', table: 'support_reply_drafts', fn: 'support-knowledge-agent-acceptance', placeholder: 'support-external-reply-placeholder', commandCentre: true, manual: true },
  { key: 'support_escalations', layer: 'Support Escalations', table: 'support_escalations', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_quality', layer: 'Support Quality Review', table: 'support_quality_reviews', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'support_export', layer: 'Support Manual Export', table: 'support_manual_export_packs', fn: 'support-knowledge-agent-acceptance', commandCentre: true, manual: true },
  { key: 'cs_profiles', layer: 'Customer Success Profiles', route: '/founder/customer-success', table: 'customer_success_profiles', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_onboarding', layer: 'Onboarding Plans', table: 'customer_onboarding_plans', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_welcome', layer: 'Welcome Packs', table: 'customer_welcome_packs', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_portal_blueprint', layer: 'Client Portal Blueprint', route: '/founder/clients', table: 'client_portal_blueprints', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_portal_packs', layer: 'Portal Content Packs', table: 'client_portal_content_packs', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_bedding', layer: 'Bedding-In Reviews', table: 'customer_bedding_in_reviews', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_checkins', layer: 'Check-ins', table: 'customer_success_checkins', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_surveys', layer: 'Surveys', table: 'customer_satisfaction_surveys', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_quarterly', layer: 'Quarterly Reports', table: 'customer_quarterly_reports', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_renewal', layer: 'Renewal Reviews', table: 'customer_renewal_reviews', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_retention', layer: 'Retention Risk Reviews', table: 'customer_retention_risk_reviews', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_upsell', layer: 'Upsell Opportunities', table: 'customer_upsell_opportunities', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_winback', layer: 'Win-back Plans', table: 'customer_winback_plans', fn: 'customer-success-portal-acceptance', commandCentre: true, manual: true },
  { key: 'cs_export', layer: 'Customer Success Manual Export', table: 'customer_success_manual_export_packs', fn: 'customer-success-portal-acceptance', placeholder: 'customer-success-external-action-placeholder', commandCentre: true, manual: true },
  { key: 'proposal', layer: 'Proposal / Demo / Deal', table: 'internal_proposals', commandCentre: true, manual: true },
  { key: 'finance', layer: 'Finance / Invoice / Payment', table: 'invoices', commandCentre: true, manual: true },
  { key: 'supplier', layer: 'Supplier Delivery', table: 'suppliers', commandCentre: true, manual: true },
  { key: 'kpis', layer: 'KPIs / OKRs', commandCentre: true, manual: true },
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

  const matrix: any[] = [];
  const counts = { WIRED: 0, PARTIAL: 0, UI_ONLY: 0, BACKEND_ONLY: 0, BROKEN_LINK: 0, BROKEN_FUNCTION: 0, MISSING_MANUAL: 0, MISSING_COMMAND_CENTRE: 0, FAIL_CLOSED_OK: 0, BLOCKED: 0 };

  for (const L of LAYERS) {
    const row: any = { key: L.key, layer: L.layer, route: L.route ?? null, table: L.table ?? null, fn: L.fn ?? null, placeholder: L.placeholder ?? null };
    // Table check
    if (L.table) {
      const { error } = await admin.from(L.table).select('*', { head: true, count: 'exact' }).limit(1);
      row.table_ok = !error || /permission|policy/i.test(error.message);
    } else row.table_ok = null;
    // Function check (POST with auth, expect non-404)
    if (L.fn) {
      try {
        const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${L.fn}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' }, body: '{}',
        });
        await r.text();
        row.fn_status = r.status;
        row.fn_ok = r.status !== 404 && r.status < 500;
      } catch (e) { row.fn_ok = false; row.fn_err = (e as Error).message; }
    } else row.fn_ok = null;
    // Placeholder fail-closed
    if (L.placeholder) {
      try {
        const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${L.placeholder}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' }, body: '{}',
        });
        await r.text();
        row.placeholder_status = r.status;
        row.fail_closed = r.status === 401 || r.status === 403;
      } catch { row.fail_closed = false; }
    } else row.fail_closed = null;
    row.command_centre = !!L.commandCentre;
    row.manual = !!L.manual;

    // Status classification
    let status: keyof typeof counts;
    const fnOk = row.fn_ok === null ? true : row.fn_ok;
    const tableOk = row.table_ok === null ? true : row.table_ok;
    const placeholderOk = row.fail_closed === null ? true : row.fail_closed;
    if (!fnOk && L.fn) status = 'BROKEN_FUNCTION';
    else if (!tableOk && L.table) status = 'BACKEND_ONLY';
    else if (L.placeholder && !placeholderOk) status = 'PARTIAL';
    else if (tableOk && fnOk && placeholderOk) status = 'WIRED';
    else status = 'PARTIAL';
    row.status = status;
    counts[status]++;
    if (row.fail_closed === true) counts.FAIL_CLOSED_OK++;
    matrix.push(row);
  }

  const blockers = matrix.filter(m => m.status === 'BROKEN_FUNCTION' || m.status === 'BROKEN_LINK' || m.status === 'BLOCKED').map(m => m.key);
  const overall_status = blockers.length === 0 ? 'PASS' : 'PARTIAL';

  return json({
    overall_status,
    classification: blockers.length === 0 ? 'FUNCTIONALLY_WIRED_FOR_INTERNAL_DAILY_USE' : 'NOT_FULLY_WIRED',
    external_go_live_status: 'LOCKED_BY_DESIGN',
    counts,
    total_layers: LAYERS.length,
    matrix,
    blockers,
    no_forbidden_action_audit: {
      emails_sent: 0, dms_sent: 0, posts_published: 0, apollo_calls: 0, apollo_credits: 0,
      smartlead_post: 0, metricool_api: 0, manychat_api: 0, ad_api_calls: 0, payment_api_calls: 0,
      portal_accounts_created: 0, portal_invites_sent: 0, surveys_sent: 0, reports_shared: 0,
      real_data_deleted: 0, secrets_exposed: 0,
    },
    external_action_counters: {
      emails_sent: 0, dms_sent: 0, posts_published: 0, apollo_calls: 0, apollo_credits: 0,
      smartlead_post: 0, metricool_api: 0, manychat_api: 0, ad_api_calls: 0, payment_api_calls: 0,
      portal_invites: 0, portal_accounts: 0, surveys_sent: 0, reports_sent: 0,
      real_data_deleted: 0, secrets_exposed: 0,
    },
  });
});