import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const KNOWN_FOUNDER_ROUTES = [
  '/founder/command-centre','/founder/co-pilot','/founder/brain','/founder/decisions','/founder/strategy',
  '/founder/agents','/founder/conversations','/founder/crm','/founder/crm/contacts','/founder/crm/inboxes',
  '/founder/finance','/founder/integrations','/founder/outreach','/founder/outreach/queue','/founder/apollo',
  '/founder/system','/founder/system/health','/founder/testing','/founder/internal-proposals','/founder/approvals',
  '/founder/analytics','/founder/optimisation','/founder/compliance','/founder/security','/founder/marketing',
  '/founder/support','/founder/clients','/founder/social','/founder/operations','/founder/expansion',
  '/founder/manual','/founder/manual/full','/founder/build-log','/founder/revenue','/founder/projects',
  '/founder/proposals','/founder/deals','/founder/suppliers','/founder/assignments','/founder/knowledge',
  '/founder/organisations','/founder/access-control','/founder/templates','/founder/assets','/founder/legal',
  '/founder/activity','/founder/documents','/founder/monitoring','/founder/workflows','/founder/executions',
  '/founder/processes','/founder/architectures','/founder/deployments',
]

const STALE_PATTERNS = ['ionos primary','pooja proof-send','pooja loop','ionos as main priority']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth) return json({ error: 'unauthorized' }, 401)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
    const { data: u } = await userClient.auth.getUser()
    if (!u?.user) return json({ error: 'unauthorized' }, 401)
    const svc = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: roles } = await svc.from('user_roles').select('role').eq('user_id', u.user.id)
    const ok = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder')
    if (!ok) return json({ error: 'forbidden' }, 403)

    let body: any = {}
    try { body = await req.json() } catch (_) {}
    const knownRoutes: string[] = Array.isArray(body?.known_routes) && body.known_routes.length
      ? body.known_routes : KNOWN_FOUNDER_ROUTES
    const ccText: string = String(body?.command_centre_text ?? '')

    const [{ data: modules }, { data: businesses }, { data: statuses }] = await Promise.all([
      svc.from('command_centre_modules').select('*'),
      svc.from('businesses').select('id,name,status'),
      svc.from('business_module_status').select('business_id,module_key,status,next_action'),
    ])

    const mods = modules ?? []
    const moduleRoutes = new Set(mods.map((m: any) => m.primary_route).filter(Boolean))

    const lost_features = knownRoutes
      .filter((r) => !moduleRoutes.has(r))
      .map((r) => ({ route: r, reason: 'route_not_registered_in_module_registry' }))

    const hidden_pages = mods
      .filter((m: any) => m.primary_route && !m.command_centre_section)
      .map((m: any) => ({ module_key: m.module_key, route: m.primary_route, reason: 'no_command_centre_card' }))

    const seenComponents = new Map<string, string[]>()
    for (const m of mods) {
      if (!m.component_name) continue
      const arr = seenComponents.get(m.component_name) ?? []
      arr.push(m.module_key); seenComponents.set(m.component_name, arr)
    }
    const duplicate_modules = [...seenComponents.entries()]
      .filter(([_, keys]) => keys.length > 1)
      .map(([component, keys]) => ({ component, module_keys: keys }))

    const missing_gates = mods
      .filter((m: any) => m.has_external_action && !m.external_gate_required)
      .map((m: any) => ({ module_key: m.module_key, reason: 'external_action_without_gate' }))

    const businessScopedKeys = mods.filter((m: any) => m.business_scoped).map((m: any) => m.module_key)
    const presentByBiz = new Map<string, Set<string>>()
    for (const s of statuses ?? []) {
      if (!s.business_id) continue
      if (!presentByBiz.has(s.business_id)) presentByBiz.set(s.business_id, new Set())
      presentByBiz.get(s.business_id)!.add(s.module_key)
    }
    const missing_business_scope: any[] = []
    for (const b of businesses ?? []) {
      const present = presentByBiz.get(b.id) ?? new Set()
      const missing = businessScopedKeys.filter((k) => !present.has(k))
      if (missing.length) missing_business_scope.push({ business_id: b.id, business_name: b.name, missing_modules: missing })
    }

    const modules_without_route = mods.filter((m: any) => !m.primary_route).map((m: any) => m.module_key)
    const modules_without_panel = mods.filter((m: any) => !m.component_name).map((m: any) => m.module_key)
    const modules_without_next_action = mods.filter((m: any) => m.command_centre_section && !m.next_action_label).map((m: any) => m.module_key)

    const stale_copy: string[] = []
    if (ccText) {
      const lower = ccText.toLowerCase()
      for (const p of STALE_PATTERNS) if (lower.includes(p)) stale_copy.push(p)
    }

    const recommended_fixes: string[] = []
    if (lost_features.length) recommended_fixes.push(`Register ${lost_features.length} routes in command_centre_modules`)
    if (hidden_pages.length) recommended_fixes.push(`Add Command Centre section for ${hidden_pages.length} modules`)
    if (missing_gates.length) recommended_fixes.push(`Attach external action gate for ${missing_gates.length} modules`)
    if (missing_business_scope.length) recommended_fixes.push(`Backfill business_module_status for ${missing_business_scope.length} businesses`)
    if (duplicate_modules.length) recommended_fixes.push(`Resolve ${duplicate_modules.length} duplicate panels`)
    if (stale_copy.length) recommended_fixes.push(`Demote stale copy: ${stale_copy.join(', ')}`)

    const totalChecks = 7
    const failed = [
      lost_features.length, hidden_pages.length, missing_gates.length,
      missing_business_scope.length, duplicate_modules.length,
      modules_without_panel.length, modules_without_next_action.length,
    ].filter((n) => n > 0).length
    const score = Math.max(0, Math.round(((totalChecks - failed) / totalChecks) * 100))

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      score,
      lost_features,
      hidden_pages,
      duplicate_modules,
      missing_gates,
      missing_business_scope,
      modules_without_route,
      modules_without_panel,
      modules_without_next_action,
      stale_copy,
      recommended_fixes,
      safety: { external_action: false, mutates_data: false, read_only: true },
    })
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500)
  }
})

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}