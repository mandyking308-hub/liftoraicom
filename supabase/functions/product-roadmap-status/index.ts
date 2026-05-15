import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

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

    const today = new Date().toISOString().slice(0, 10);

    const items = await safe(async () => (await admin.from('product_roadmap_items').select('*').order('updated_at', { ascending: false }).limit(500)).data ?? [], [] as any[]);
    const qa = await safe(async () => (await admin.from('qa_test_cases').select('*').order('updated_at', { ascending: false }).limit(500)).data ?? [], [] as any[]);
    const releases = await safe(async () => (await admin.from('release_plans').select('*').order('planned_release_date', { ascending: true, nullsFirst: false }).limit(200)).data ?? [], [] as any[]);

    const isOpen = (s: any) => !['done','released','closed','cancelled','rejected'].includes(String(s));
    const openItems = items.filter((i: any) => isOpen(i.status));
    const bugs = openItems.filter((i: any) => i.item_type === 'bug');
    const criticalBugs = bugs.filter((b: any) => ['critical','urgent','p0'].includes(String(b.priority_level).toLowerCase()));
    const customerRequests = openItems.filter((i: any) => i.customer_requested || i.item_type === 'customer_request');
    const competitorGaps = openItems.filter((i: any) => i.competitor_signal || i.item_type === 'competitor_gap');
    const features = openItems.filter((i: any) => i.item_type === 'feature');
    const aiUpgrades = openItems.filter((i: any) => i.item_type === 'AI_agent_upgrade');
    const integrations = openItems.filter((i: any) => i.item_type === 'integration');
    const compliance = openItems.filter((i: any) => i.item_type === 'compliance');
    const techDebt = openItems.filter((i: any) => i.item_type === 'technical_debt');
    const highPriority = openItems.filter((i: any) => ['high','critical','urgent','p0','p1'].includes(String(i.priority_level).toLowerCase()));
    const overdueTargets = openItems.filter((i: any) => i.target_release_date && i.target_release_date < today);

    const qaActive = qa.filter((t: any) => t.status === 'active');
    const qaFailures = qa.filter((t: any) => ['fail','failed','error'].includes(String(t.last_result).toLowerCase()));
    const qaNeverRun = qa.filter((t: any) => !t.last_run_at);

    const openReleases = releases.filter((r: any) => !['released','cancelled','rolled_back'].includes(String(r.release_status)));
    const releaseBlockers = openReleases.filter((r: any) => ['fail','failed','blocked'].includes(String(r.qa_status)));
    const releasesAwaitingApproval = openReleases.filter((r: any) => r.founder_approval_required && !r.approved_at);
    const releasesScheduled = openReleases.filter((r: any) => r.planned_release_date);

    const nextActions: any[] = [];
    for (const b of criticalBugs.slice(0, 5)) nextActions.push({ kind: 'critical_bug', label: b.title, priority: b.priority_level });
    for (const r of releaseBlockers.slice(0, 3)) nextActions.push({ kind: 'release_blocker', label: r.release_name, qa_status: r.qa_status });
    for (const r of releasesAwaitingApproval.slice(0, 3)) nextActions.push({ kind: 'release_awaiting_founder_approval', label: r.release_name, planned: r.planned_release_date });
    for (const c of customerRequests.slice(0, 5)) nextActions.push({ kind: 'customer_request', label: c.title, priority: c.priority_level });
    for (const g of competitorGaps.slice(0, 3)) nextActions.push({ kind: 'competitor_gap', label: g.title });

    return new Response(JSON.stringify({
      ok: true,
      auto_deploy_performed: false,
      production_release_executed: false,
      external_action_taken: false,
      disclaimer: 'Tracking only. No automatic deployments. Founder approval required before production release.',
      summary: {
        items_total: items.length,
        items_open: openItems.length,
        bugs_open: bugs.length,
        bugs_critical: criticalBugs.length,
        features_open: features.length,
        customer_requests_open: customerRequests.length,
        competitor_gaps_open: competitorGaps.length,
        ai_upgrades_open: aiUpgrades.length,
        integrations_open: integrations.length,
        compliance_open: compliance.length,
        tech_debt_open: techDebt.length,
        high_priority_open: highPriority.length,
        overdue_target_release: overdueTargets.length,
        qa_total: qa.length,
        qa_active: qaActive.length,
        qa_failures: qaFailures.length,
        qa_never_run: qaNeverRun.length,
        releases_total: releases.length,
        releases_open: openReleases.length,
        release_blockers: releaseBlockers.length,
        releases_awaiting_approval: releasesAwaitingApproval.length,
        releases_scheduled: releasesScheduled.length,
      },
      critical_bugs: criticalBugs.slice(0, 20),
      high_priority_items: highPriority.slice(0, 20),
      customer_requests: customerRequests.slice(0, 20),
      competitor_gaps: competitorGaps.slice(0, 20),
      qa_failures: qaFailures.slice(0, 20),
      open_releases: openReleases.slice(0, 20),
      release_blockers: releaseBlockers.slice(0, 10),
      releases_awaiting_approval: releasesAwaitingApproval.slice(0, 10),
      next_actions: nextActions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
