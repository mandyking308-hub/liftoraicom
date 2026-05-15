import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Known founder routes registered in /src/App.tsx (kept in sync manually).
// This is a static list passed in via body for accuracy; default fallback keeps a small list.
const DEFAULT_KNOWN_ROUTES = [
  '/founder/command-centre', '/founder/social', '/founder/operations',
  '/founder/agents', '/founder/conversations', '/founder/crm',
  '/founder/finance', '/founder/integrations', '/founder/outreach',
  '/founder/apollo', '/founder/system', '/founder/testing',
  '/founder/internal-proposals', '/founder/approvals', '/founder/analytics',
  '/founder/optimisation', '/founder/compliance', '/founder/security',
  '/founder/marketing', '/founder/support', '/founder/clients',
]

const STALE_COPY_PATTERNS = ['ionos primary', 'pooja proof-send', 'pooja loop', 'ionos as main priority']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth) return json({ error: 'unauthorized' }, 401)
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    })
    const { data: u } = await userClient.auth.getUser()
    if (!u?.user) return json({ error: 'unauthorized' }, 401)
    const svc = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: roles } = await svc.from('user_roles').select('role').eq('user_id', u.user.id)
    const ok = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder')
    if (!ok) return json({ error: 'forbidden' }, 403)

    let body: any = {}
    try { body = await req.json() } catch (_) {}
    const knownRoutes: string[] = Array.isArray(body?.known_routes) && body.known_routes.length
      ? body.known_routes
      : DEFAULT_KNOWN_ROUTES
    const knownText: string = String(body?.command_centre_text ?? '')

    const { data: modules } = await svc.from('command_centre_modules').select('*')
    const { data: businesses } = await svc.from('businesses').select('id,name')
    const { data: statuses } = await svc.from('business_module_status').select('business_id,module_key')

    const moduleRoutes = new Set((modules ?? []).map((m) => m.primary_route).filter(Boolean))
    const lostPages = knownRoutes.filter((r) => !moduleRoutes.has(r))

    const modulesWithoutRoutes = (modules ?? []).filter((m) => !m.primary_route).map((m) => m.module_key)
    const modulesWithoutPanels = (modules ?? []).filter((m) => !m.component_name).map((m) => m.module_key)
    const modulesWithoutSection = (modules ?? []).filter((m) => !m.command_centre_section).map((m) => m.module_key)

    const presentBusinessKeys = new Map<string, Set<string>>()
    for (const s of statuses ?? []) {
      if (!s.business_id) continue
      if (!presentBusinessKeys.has(s.business_id)) presentBusinessKeys.set(s.business_id, new Set())
      presentBusinessKeys.get(s.business_id)!.add(s.module_key)
    }
    const businessScoped = (modules ?? []).filter((m) => m.business_scoped).map((m) => m.module_key)
    const businessGaps: { business_id: string; missing_modules: string[] }[] = []
    for (const b of businesses ?? []) {
      const present = presentBusinessKeys.get(b.id) ?? new Set()
      const missing = businessScoped.filter((k) => !present.has(k))
      if (missing.length) businessGaps.push({ business_id: b.id, missing_modules: missing })
    }

    const staleCopy: string[] = []
    if (knownText) {
      const lower = knownText.toLowerCase()
      for (const p of STALE_COPY_PATTERNS) if (lower.includes(p)) staleCopy.push(p)
    }

    const socialKeys = (modules ?? []).filter((m) => m.module_category === 'social').map((m) => m.module_key)
    const globalKeys = (modules ?? []).filter((m) => m.module_category === 'global').map((m) => m.module_key)
    const socialMissingFromCC = socialKeys.filter((k) => {
      const m = modules!.find((x) => x.module_key === k)!
      return !m.command_centre_section
    })
    const globalMissingFromCC = globalKeys.filter((k) => {
      const m = modules!.find((x) => x.module_key === k)!
      return !m.command_centre_section
    })

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      lost_pages: lostPages,
      modules_without_routes: modulesWithoutRoutes,
      modules_without_panels: modulesWithoutPanels,
      modules_without_section: modulesWithoutSection,
      business_scoped_module_gaps: businessGaps,
      stale_copy_hits: staleCopy,
      social_modules_missing_from_command_centre: socialMissingFromCC,
      global_modules_missing_from_command_centre: globalMissingFromCC,
      multi_business_modules_missing_from_command_centre: businessGaps.length > 0 ? 'business_module_status rows missing for some businesses' : null,
      safety: { external_action: false, mutates_data: false, read_only: true },
    })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}