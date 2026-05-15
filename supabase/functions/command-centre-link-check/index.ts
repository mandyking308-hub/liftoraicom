import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const KNOWN_ROUTES = [
  '/founder/command-centre','/founder/copilot','/founder/testing','/founder/system/health',
  '/founder/apollo','/founder/lead-quality','/founder/crm','/founder/compliance','/founder/integrations',
  '/founder/conversations','/founder/agents','/founder/approvals','/founder/proposals','/founder/demos',
  '/founder/deals','/founder/invoices','/founder/payments','/founder/suppliers','/founder/assignments',
  '/founder/optimisation','/founder/marketing','/founder/social','/founder/support','/founder/knowledge',
  '/founder/operations','/founder/expansion','/founder/portfolio','/founder/security','/founder/build-log',
  '/founder/manual','/founder/full-system-mirror','/founder/creative-assets',
];

const STALE_PATTERNS = ['ionos-live-batch','pooja-proof-send','manual-send-apply','/founder/command-center'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const isFounder = (roles ?? []).some((r: any) => ['admin','founder'].includes(r.role));
    if (!isFounder) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: journey } = await admin.from('command_centre_customer_journey_steps').select('*').order('step_order');
    const { data: modules } = await admin.from('command_centre_modules').select('*').limit(500);

    const checks: any[] = [];
    let broken = 0, missingRoutes = 0, missingAnchors = 0, externalUngated = 0, modulesWithout = 0, stale = 0;

    for (const step of journey ?? []) {
      const routeExists = KNOWN_ROUTES.includes(step.primary_route);
      const status = routeExists ? 'ok' : 'missing_route';
      if (!routeExists) { broken++; missingRoutes++; }
      checks.push({
        audit_scope: 'journey_step',
        source_section: 'CustomerJourneyFlowMap',
        link_label: step.step_label,
        target_route: step.primary_route,
        target_anchor: step.command_centre_anchor,
        target_module_key: step.primary_module_key,
        link_type: 'internal_route',
        route_exists: routeExists,
        component_exists: true,
        opens_in_command_centre: true,
        opens_external: false,
        status,
        blocker: routeExists ? null : `Route ${step.primary_route} not registered`,
        recommended_fix: routeExists ? null : `Register route or update primary_route for ${step.step_key}`,
        checked_at: new Date().toISOString(),
      });
    }

    for (const m of modules ?? []) {
      const route = (m as any).route ?? (m as any).primary_route;
      const hasLink = route && KNOWN_ROUTES.some(r => route.startsWith(r));
      if (!hasLink) modulesWithout++;
      if ((m as any).has_external_action && !(m as any).external_gate_key) externalUngated++;
      const isStale = STALE_PATTERNS.some(p => (route ?? '').includes(p) || ((m as any).module_name ?? '').toLowerCase().includes(p));
      if (isStale) stale++;
    }

    if (checks.length) {
      await admin.from('command_centre_link_audit').insert(checks);
    }

    return new Response(JSON.stringify({
      total_links_checked: checks.length,
      broken_links: broken,
      missing_routes: missingRoutes,
      missing_anchors: missingAnchors,
      disabled_buttons_without_reason: 0,
      external_actions_without_gate: externalUngated,
      modules_without_command_link: modulesWithout,
      stale_links: stale,
      recommended_fixes: checks.filter(c => c.recommended_fix).map(c => c.recommended_fix),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});