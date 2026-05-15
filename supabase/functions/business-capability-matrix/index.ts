import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const READY_BUCKETS: Record<string, string[]> = {
  internal: ['command_centre', 'business_knowledge_brain', 'CRM_customer_memory', 'founder_approval_console'],
  social: ['social_media_brain', 'social_content_factory', 'social_engagement_inbox'],
  outbound: ['provider_router', 'campaign_mapping', 'lead_push_preview'],
  agents: ['agent_control_room', 'approved_action_execution'],
  revenue: ['proposal_engine', 'deal_pipeline', 'finance_invoices_payments'],
}

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

    const [{ data: businesses }, { data: modules }, { data: statuses }, { data: socialProfiles }] = await Promise.all([
      svc.from('businesses').select('id,name'),
      svc.from('command_centre_modules').select('module_key,module_name,module_category,business_scoped,primary_route,component_name,command_centre_section'),
      svc.from('business_module_status').select('*'),
      svc.from('social_business_profiles').select('business_id,social_status'),
    ])

    const mods = (modules ?? []) as any[]
    const sts = (statuses ?? []) as any[]

    const rows: any[] = []
    const readinessByBusiness: Record<string, any> = {}
    let missingTotal = 0

    for (const b of businesses ?? []) {
      const bMissing: string[] = []
      const ready: Record<string, boolean> = { internal: true, social: true, outbound: true, agents: true, revenue: true }
      for (const m of mods) {
        if (!m.business_scoped) continue
        const s = sts.find((x) => x.business_id === b.id && x.module_key === m.module_key)
        // Heuristic seed for social_media_brain from social_business_profiles
        const socialSeeded = m.module_key === 'social_media_brain' && (socialProfiles ?? []).some((p: any) => p.business_id === b.id)
        const blockers = Array.isArray(s?.blockers) ? s.blockers : []
        const live = !!s?.live_internal || socialSeeded
        const configured = !!s?.configured || socialSeeded
        const ext = !!s?.external_actions_enabled
        const status = !s && !socialSeeded ? 'missing'
          : blockers.length > 0 ? 'blocked'
          : live ? 'active'
          : configured ? 'partial'
          : 'missing'
        if (status === 'missing' || status === 'blocked') bMissing.push(m.module_key)
        rows.push({
          business_id: b.id,
          business_name: b.name,
          module_key: m.module_key,
          module_name: m.module_name,
          module_category: m.module_category,
          status,
          readiness_score: Number(s?.readiness_score ?? (status === 'active' ? 1 : status === 'partial' ? 0.5 : 0)),
          live_internal: live,
          external_actions_enabled: ext,
          blockers,
          next_action: s?.next_action ?? `Configure ${m.module_name}`,
          primary_route: m.primary_route,
        })
        for (const [bucket, keys] of Object.entries(READY_BUCKETS)) {
          if (keys.includes(m.module_key) && status !== 'active') ready[bucket] = false
        }
      }
      missingTotal += bMissing.length
      readinessByBusiness[b.id] = {
        business_id: b.id,
        business_name: b.name,
        ready_for_internal_use: ready.internal,
        ready_for_social: ready.social,
        ready_for_outbound: ready.outbound,
        ready_for_agents: ready.agents,
        ready_for_revenue: ready.revenue,
        missing_modules: bMissing,
        missing_count: bMissing.length,
      }
    }

    const categories = Array.from(new Set(mods.map((m) => m.module_category)))
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      categories,
      businesses_count: (businesses ?? []).length,
      modules_count: mods.length,
      missing_total: missingTotal,
      readiness: readinessByBusiness,
      rows,
      safety: { external_action: false, no_send: true, read_only: true },
    })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function json(p: any, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}