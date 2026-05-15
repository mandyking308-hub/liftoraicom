import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const businessId: string | null = body?.business_id ?? null

    const [{ data: modules }, { data: statuses }, { data: businesses }] = await Promise.all([
      svc.from('command_centre_modules').select('*').order('module_category').order('module_name'),
      businessId
        ? svc.from('business_module_status').select('*').eq('business_id', businessId)
        : svc.from('business_module_status').select('*'),
      svc.from('businesses').select('id,name'),
    ])

    const statusByKey: Record<string, any[]> = {}
    for (const s of statuses ?? []) {
      ;(statusByKey[s.module_key] ||= []).push(s)
    }

    const counts = { active: 0, partial: 0, blocked: 0, missing: 0, total: (modules ?? []).length }
    const modulesMissingPanel: string[] = []
    const modulesMissingRoute: string[] = []
    const modulesMissingStatusSource: string[] = []
    const businessGaps: { business_id: string; missing_modules: string[] }[] = []

    const byCategory: Record<string, any[]> = {}
    for (const m of modules ?? []) {
      const rows = statusByKey[m.module_key] ?? []
      let aggregated = aggregate(rows)
      // Re-classify: only modules with neither panel nor route count as "missing".
      // Mounted-but-unconfigured modules are "partial" (visible, setup incomplete).
      if (!m.component_name && !m.primary_route) {
        aggregated = { status: 'missing', score: 0, nextAction: `Build panel for ${m.module_name}` }
      }
      counts[aggregated.status as 'active' | 'partial' | 'blocked' | 'missing'] += 1
      if (!m.component_name) modulesMissingPanel.push(m.module_key)
      if (!m.primary_route) modulesMissingRoute.push(m.module_key)
      if (!m.status_source && !m.readiness_function) modulesMissingStatusSource.push(m.module_key)
      ;(byCategory[m.module_category] ||= []).push({
        ...m,
        aggregated_status: aggregated.status,
        readiness_score: aggregated.score,
        next_action: aggregated.nextAction ?? defaultNext(m),
        business_rows: rows,
      })
    }

    if (!businessId) {
      const businessScoped = (modules ?? []).filter((m) => m.business_scoped).map((m) => m.module_key)
      for (const b of businesses ?? []) {
        const present = new Set(((statuses ?? []).filter((s: any) => s.business_id === b.id) ?? []).map((s: any) => s.module_key))
        const missing = businessScoped.filter((k) => !present.has(k))
        if (missing.length) businessGaps.push({ business_id: b.id, missing_modules: missing })
      }
    }

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      business_id: businessId,
      counts,
      modules_by_category: byCategory,
      gaps: {
        modules_missing_panel: modulesMissingPanel,
        modules_missing_route: modulesMissingRoute,
        modules_missing_status_source: modulesMissingStatusSource,
        businesses_missing_module_status: businessGaps,
      },
      safety: { external_action: false, no_publish: true, no_dm: true, no_email_send: true },
    })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function aggregate(rows: any[]) {
  if (!rows.length) {
    // No per-business status rows yet — treat as visible-but-unconfigured.
    return {
      status: 'partial',
      score: 0,
      nextAction: 'Setup not started yet — open the panel to configure.' as string | null,
    }
  }
  const blockers = rows.filter((r) => Array.isArray(r.blockers) && r.blockers.length > 0).length
  const live = rows.filter((r) => r.live_internal).length
  const configured = rows.filter((r) => r.configured).length
  const status = blockers > 0 ? 'blocked' : live === rows.length ? 'active' : configured > 0 ? 'partial' : 'missing'
  const avg = rows.reduce((a, r) => a + Number(r.readiness_score ?? 0), 0) / rows.length
  const next = rows.find((r) => r.next_action)?.next_action ?? null
  return { status, score: Math.round(avg * 100) / 100, nextAction: next }
}

function defaultNext(m: any) {
  if (!m.component_name) return `Build panel for ${m.module_name}`
  if (!m.primary_route) return `Wire route for ${m.module_name}`
  return `Configure ${m.module_name} for at least one business`
}

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}