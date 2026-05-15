import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE CUSTOMER QUARTERLY REPORT';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

function quarterLabel(end: string) {
  const d = new Date(end);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return { quarter: `Q${q}`, year: d.getUTCFullYear() };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin','founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id, contact_id, deal_id, organisation_id, reporting_period_start, reporting_period_end, dry_run = true, confirmation } = body ?? {};
    if (!contact_id || !reporting_period_start || !reporting_period_end) {
      return new Response(JSON.stringify({ error: 'contact_id, reporting_period_start, reporting_period_end required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const start = reporting_period_start, end = reporting_period_end;
    const inRange = (col: string) => ({ gte: start, lte: end, col });

    const contact = await safe(async () => (await admin.from('contacts').select('id,name,email,company,assigned_business,status').eq('id', contact_id).maybeSingle()).data, null as any);
    const memory = await safe(async () => (await admin.from('customer_memory_profiles').select('*').eq('contact_id', contact_id).maybeSingle()).data, null as any);
    const ledger = await safe(async () => (await admin.from('crm_interaction_ledger').select('id,interaction_type,direction,channel,subject,occurred_at').eq('contact_id', contact_id).gte('occurred_at', start).lte('occurred_at', end).limit(500)).data ?? [], [] as any[]);
    const conversations = await safe(async () => (await admin.from('conversations').select('id,last_message_at,status').eq('contact_id', contact_id).gte('last_message_at', start).lte('last_message_at', end).limit(200)).data ?? [], [] as any[]);
    const proposals = await safe(async () => (await admin.from('proposals').select('id,status,created_at,total_value').eq('contact_id', contact_id).gte('created_at', start).lte('created_at', end).limit(100)).data ?? [], [] as any[]);
    const deals = await safe(async () => (await admin.from('deals').select('id,status,value,created_at').eq('contact_id', contact_id).gte('created_at', start).lte('created_at', end).limit(100)).data ?? [], [] as any[]);
    const invoices = await safe(async () => (await admin.from('invoices').select('id,status,amount,created_at').eq('contact_id', contact_id).gte('created_at', start).lte('created_at', end).limit(100)).data ?? [], [] as any[]);
    const payments = await safe(async () => (await admin.from('payments').select('id,amount,received_at').eq('contact_id', contact_id).gte('received_at', start).lte('received_at', end).limit(100)).data ?? [], [] as any[]);
    const support = await safe(async () => (await admin.from('support_interaction_reviews').select('id,severity,theme,objection,created_at').eq('contact_id', contact_id).gte('created_at', start).lte('created_at', end).limit(100)).data ?? [], [] as any[]);
    const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('csat_score,nps_score,sentiment,key_needs,competitor_mentions,created_at').eq('contact_id', contact_id).gte('created_at', start).lte('created_at', end).limit(100)).data ?? [], [] as any[]);
    const successPlans = await safe(async () => (await admin.from('customer_success_plans').select('id,plan_status,risks,next_best_actions,follow_up_due_at').eq('contact_id', contact_id).limit(20)).data ?? [], [] as any[]);
    const upsells = await safe(async () => (await admin.from('customer_upsell_recommendations').select('id,recommendation_status,reason,fit_score,customer_need_matched').eq('contact_id', contact_id).limit(50)).data ?? [], [] as any[]);
    const demos = await safe(async () => (await admin.from('demo_events').select('id,event_type,occurred_at').eq('contact_id', contact_id).gte('occurred_at', start).lte('occurred_at', end).limit(100)).data ?? [], [] as any[]);

    const csat = surveys.map((s: any) => s.csat_score).filter((n: any) => typeof n === 'number');
    const nps = surveys.map((s: any) => s.nps_score).filter((n: any) => typeof n === 'number');
    const avgCsat = csat.length ? csat.reduce((a: number, b: number) => a + b, 0) / csat.length : null;
    const avgNps = nps.length ? nps.reduce((a: number, b: number) => a + b, 0) / nps.length : null;

    const usageScore = Math.min(1, (ledger.length + conversations.length + demos.length) / 30);
    const engagementScore = Math.min(1, (conversations.length + demos.length) / 10);
    const satisfactionScore = avgCsat != null ? avgCsat / 5 : null;
    const healthScore = [usageScore, engagementScore, satisfactionScore].filter((x) => typeof x === 'number').reduce((a: any, b: any) => a + b, 0) / Math.max(1, [usageScore, engagementScore, satisfactionScore].filter((x) => typeof x === 'number').length);

    const openIssues = support.filter((s: any) => (s.severity ?? '').toLowerCase() === 'high').map((s: any) => ({ kind: 'support', severity: s.severity, theme: s.theme }));
    const competitorMentions = surveys.flatMap((s: any) => Array.isArray(s.competitor_mentions) ? s.competitor_mentions : []).filter(Boolean);
    const upsellInternal = upsells.map((u: any) => ({ status: u.recommendation_status, fit: u.fit_score, reason: u.reason, needs: u.customer_need_matched }));
    const renewalRisks: string[] = [];
    if (avgCsat != null && avgCsat < 3) renewalRisks.push('low_csat');
    if (openIssues.length) renewalRisks.push('open_high_severity_support');
    if (Array.isArray(memory?.risk_flags)) for (const r of memory.risk_flags) renewalRisks.push(String(r));

    const { quarter, year } = quarterLabel(end);
    const reportRow = {
      business_id: business_id ?? contact?.assigned_business ?? null,
      contact_id,
      organisation_id: organisation_id ?? null,
      deal_id: deal_id ?? null,
      reporting_period_start: start,
      reporting_period_end: end,
      report_quarter: quarter,
      report_year: year,
      report_status: 'draft',
      internal_summary: `Internal: ${ledger.length} interactions, ${proposals.length} proposals, ${invoices.length} invoices, ${support.length} support items. Renewal risks: ${renewalRisks.join(', ') || 'none'}. Competitor mentions (internal only): ${competitorMentions.join(', ') || 'none'}.`,
      customer_facing_summary: `Hi ${contact?.name ?? 'there'} — here's a recap of ${quarter} ${year}. We focused on delivering measurable outcomes and are ready to plan the next quarter together.`,
      usage_summary: `${ledger.length} interactions across ${new Set(ledger.map((l: any) => l.channel)).size} channel(s).`,
      engagement_summary: `${conversations.length} conversations · ${demos.length} demo touchpoints.`,
      value_summary: `${invoices.length} invoices issued · ${payments.length} payments received · ${proposals.length} proposals shared.`,
      support_summary: support.length ? `${support.length} support touchpoints — ${openIssues.length} high-severity.` : 'No support issues this period.',
      feedback_summary: surveys.length ? `${surveys.length} responses · CSAT avg ${avgCsat?.toFixed(1) ?? '—'} · NPS avg ${avgNps?.toFixed(1) ?? '—'}.` : 'No feedback captured this period.',
      satisfaction_summary: avgCsat != null ? (avgCsat >= 4 ? 'High satisfaction.' : avgCsat >= 3 ? 'Stable satisfaction.' : 'Recovery needed.') : 'No satisfaction signal yet.',
      open_issues: openIssues,
      completed_actions: (successPlans.flatMap((p: any) => Array.isArray(p.next_best_actions) ? p.next_best_actions : [])).slice(0, 8),
      recommendations: ['Schedule a quarterly business review call', 'Confirm next-quarter goals', 'Resolve any open support items'],
      next_quarter_plan: ['Define top 3 outcomes', 'Lock delivery cadence', 'Founder check-in mid-quarter'],
      upsell_opportunities: upsellInternal,
      renewal_risk_flags: renewalRisks,
      founder_review_required: true,
      customer_share_allowed: false,
      metadata: { sources: { ledger: ledger.length, conversations: conversations.length, proposals: proposals.length, deals: deals.length, invoices: invoices.length, payments: payments.length, support: support.length, surveys: surveys.length, demos: demos.length, success_plans: successPlans.length, upsells: upsells.length }, scores: { usage: usageScore, engagement: engagementScore, satisfaction: satisfactionScore, health: healthScore }, competitor_mentions_internal_only: competitorMentions },
    };

    const usageRow = {
      business_id: reportRow.business_id, contact_id,
      snapshot_period_start: start, snapshot_period_end: end,
      usage_source: 'aggregate',
      interactions_count: ledger.length,
      conversations_count: conversations.length,
      proposals_count: proposals.length,
      demos_count: demos.length,
      support_requests_count: support.length,
      invoices_count: invoices.length,
      payments_count: payments.length,
      assignments_count: 0,
      portal_visits_count: 0,
      content_engagement_count: 0,
      key_activities: ledger.slice(0, 10),
      usage_score: usageScore, engagement_score: engagementScore, satisfaction_score: satisfactionScore, health_score: healthScore,
    };

    if (dry_run || confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ dry_run: true, proposed_report: reportRow, proposed_usage: usageRow, external_send: false, note: `Provide confirmation "${CONFIRM}" with dry_run=false to persist.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: report, error: e1 } = await admin.from('customer_quarterly_reports').insert(reportRow).select('*').single();
    if (e1) throw e1;
    const { data: usage, error: e2 } = await admin.from('customer_usage_snapshots').insert(usageRow).select('*').single();
    if (e2) throw e2;
    const { data: review, error: e3 } = await admin.from('customer_account_reviews').insert({
      business_id: reportRow.business_id, contact_id, quarterly_report_id: report.id,
      review_type: 'quarterly', review_status: 'draft',
      account_health: healthScore >= 0.66 ? 'healthy' : healthScore >= 0.33 ? 'watch' : 'at_risk',
      customer_goal: memory?.customer_summary ?? null,
      current_needs: memory?.known_needs ?? [],
      recent_feedback: surveys.slice(0, 5),
      risks: renewalRisks,
      opportunities: upsellInternal.slice(0, 5),
      recommended_human_touch: avgCsat != null && avgCsat < 3 ? 'Founder call to recover satisfaction' : 'Quarterly review call',
      recommended_next_action: openIssues.length ? 'Resolve open high-severity support items' : 'Send approved quarterly report and book QBR',
      owner_agent_key: 'customer_success_agent',
      founder_review_required: true,
    }).select('*').single();
    if (e3) throw e3;

    // Optional: log a founder approval item
    try {
      await admin.from('founder_approval_items').insert({
        approval_type: 'customer_quarterly_report',
        target_table: 'customer_quarterly_reports',
        target_id: report.id,
        status: 'pending',
        metadata: { contact_id, business_id: reportRow.business_id },
      });
    } catch {}

    return new Response(JSON.stringify({ report, usage, review, external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});