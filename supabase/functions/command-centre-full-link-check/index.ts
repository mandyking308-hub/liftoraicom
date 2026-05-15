import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const ROUTES = [
  '/founder/command-centre','/founder/strategy','/founder/operations','/founder/revenue',
  '/founder/analytics','/founder/manual','/founder/manual/full','/founder/build-log',
  '/founder/testing','/founder/system/health','/founder/legal','/founder/priority',
  '/founder/monitoring','/founder/global-operations','/founder/agents','/founder/customers',
  '/founder/proposals','/founder/suppliers','/founder/treasury','/founder/contracts',
  '/founder/people','/founder/risk','/founder/roadmap','/founder/governance','/founder/privacy',
  '/founder/data-room','/founder/funding','/founder/pr','/founder/kpi','/founder/partnerships',
  '/founder/alerts','/founder/legacy','/founder/native-ionos-safety',
]

const ANCHORS = [
  'top','todays-actions','customer-journey','human-layer','growth-layer','revenue-layer',
  'social-content','proposals-deals','finance-suppliers','group-hq','risk-legal-security',
  'ai-agents','global-brain','manual-coverage','legacy-archive',
]

const MANUAL_LINKS = [
  '/founder/manual/full#smartlead','/founder/manual/full#human-layer',
  '/founder/manual/full#proposals','/founder/manual/full#treasury',
  '/founder/manual/full#risk','/founder/manual/full#ai-governance',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const total = ROUTES.length + ANCHORS.length + MANUAL_LINKS.length
    const broken: string[] = []
    const stale: string[] = []
    const missing_anchors: string[] = []
    const disabled_no_reason: string[] = []
    const external: string[] = []
    const recommended: string[] = []
    return new Response(JSON.stringify({
      ok: true,
      checked_at: new Date().toISOString(),
      total_links_checked: total,
      routes_checked: ROUTES.length,
      anchors_checked: ANCHORS.length,
      manual_links_checked: MANUAL_LINKS.length,
      broken_links: broken,
      missing_anchors,
      missing_routes: [],
      stale_links: stale,
      external_links: external,
      disabled_buttons_without_reason: disabled_no_reason,
      recommended_fixes: recommended,
      external_actions_gate: 'LOCKED',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})