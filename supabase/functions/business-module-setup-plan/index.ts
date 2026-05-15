import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PLAN_TEMPLATES: Record<string, string[]> = {
  social_media_brain: [
    'Confirm brand voice + audience profile',
    'Pick primary platforms',
    'Seed social profile (internal-only)',
  ],
  social_content_factory: [
    'Generate first 30-day pack (internal draft)',
    'Mandy approves first 7 posts',
  ],
  CRM_customer_memory: [
    'Import contacts',
    'Run customer memory enrichment',
    'Tag warm leads',
  ],
  agent_control_room: [
    'Enable agents in observe-only mode',
    'Configure approval gates',
  ],
  proposal_engine: [
    'Set offer focus + pricing tiers',
    'Generate one preview proposal',
  ],
  finance_invoices_payments: [
    'Connect billing entity',
    'Import open invoices',
  ],
}

function defaultPlan(moduleName: string) {
  return [
    `Audit ${moduleName} configuration`,
    `Define internal-only readiness criteria`,
    `Mark module configured for this business`,
  ]
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

    let body: any = {}
    try { body = await req.json() } catch (_) {}
    const businessId: string | undefined = body?.business_id
    const moduleKeys: string[] = Array.isArray(body?.module_keys) ? body.module_keys : (body?.module_key ? [body.module_key] : [])
    const confirm: boolean = body?.confirm === true
    if (!businessId || moduleKeys.length === 0) return json({ error: 'business_id and module_key(s) required' }, 400)

    const { data: business } = await svc.from('businesses').select('id,name').eq('id', businessId).maybeSingle()
    if (!business) return json({ error: 'business not found' }, 404)
    const { data: mods } = await svc.from('command_centre_modules').select('module_key,module_name,module_category,primary_route').in('module_key', moduleKeys)
    const moduleList = (mods ?? []) as any[]

    const plans = moduleList.map((m) => ({
      module_key: m.module_key,
      module_name: m.module_name,
      category: m.module_category,
      primary_route: m.primary_route,
      steps: PLAN_TEMPLATES[m.module_key] ?? defaultPlan(m.module_name),
    }))

    let createdStatusRows = 0
    let approvalItemId: string | null = null
    if (confirm) {
      // Upsert business_module_status rows as 'planned'
      const upserts = plans.map((p) => ({
        business_id: businessId,
        module_key: p.module_key,
        status: 'planned',
        configured: false,
        live_internal: false,
        external_actions_enabled: false,
        next_action: p.steps[0] ?? null,
        last_checked_at: new Date().toISOString(),
        metadata: { plan_steps: p.steps, source: 'business-module-setup-plan' },
      }))
      const { data: upserted, error: upErr } = await svc
        .from('business_module_status')
        .upsert(upserts, { onConflict: 'business_id,module_key' })
        .select('id')
      if (upErr) return json({ error: upErr.message }, 500)
      createdStatusRows = (upserted ?? []).length

      // Create founder approval item summarising the plan
      const { data: appr, error: aErr } = await svc.from('founder_approval_items').insert({
        business_id: businessId,
        approval_type: 'module_setup_plan',
        source_system: 'business-module-setup-plan',
        source_table: 'business_module_status',
        agent_key: 'capability_matrix',
        title: `Module setup plan — ${business.name} (${plans.length} module${plans.length === 1 ? '' : 's'})`,
        summary: plans.map((p) => `${p.module_name}: ${p.steps.join(' → ')}`).join('\n'),
        recommended_action: 'Review plan and configure each module',
        priority_level: 'normal',
        status: 'pending',
        execution_enabled: false,
        auto_execute_allowed: false,
        send_allowed: false,
        risk_flags: [],
        compliance_flags: [],
      }).select('id').maybeSingle()
      if (aErr) return json({ error: aErr.message }, 500)
      approvalItemId = appr?.id ?? null
    }

    return json({
      ok: true,
      business_id: businessId,
      business_name: business.name,
      plans,
      confirmed: confirm,
      created_status_rows: createdStatusRows,
      approval_item_id: approvalItemId,
      safety: { external_action: false, no_send: true, requires_founder_review: true },
    })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function json(p: any, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}