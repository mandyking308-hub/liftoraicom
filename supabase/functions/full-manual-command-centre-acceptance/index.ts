import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function pct(num: number, den: number) {
  if (!den) return 0
  return Math.max(0, Math.min(100, Math.round((num / den) * 100)))
}
function classify(score: number, ready: string, partial: string, not_ready: string) {
  if (score >= 90) return ready
  if (score >= 60) return partial
  return not_ready
}

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

    const [
      { data: registry }, { data: workflows }, { data: dataFlows },
      { data: modules }, { data: businesses }, { data: bizStatus },
    ] = await Promise.all([
      svc.from('command_centre_manual_registry').select('object_kind,command_centre_section,readiness_status,visibility_status,external_action_risk,requires_founder_approval,business_scoped'),
      svc.from('command_centre_workflow_registry').select('workflow_key,readiness_status,external_action_risk,founder_approval_required'),
      svc.from('command_centre_data_flow_registry').select('flow_key,readiness_status'),
      svc.from('command_centre_modules').select('module_key,module_category,command_centre_section,business_scoped,primary_route,component_name'),
      svc.from('businesses').select('id,name,status'),
      svc.from('business_module_status').select('business_id,module_key'),
    ])

    const reg = registry ?? []
    const wfs = workflows ?? []
    const dfs = dataFlows ?? []
    const mods = modules ?? []
    const bizs = businesses ?? []
    const status = bizStatus ?? []

    // Manual coverage: registered & visible
    const visible = reg.filter((r: any) => r.command_centre_section).length
    const manual_coverage_score = pct(visible, reg.length)

    // CC visibility: modules that have CC section
    const ccVisible = mods.filter((m: any) => m.command_centre_section).length
    const command_centre_visibility_score = pct(ccVisible, mods.length || 1)

    // Workflow coverage: workflows registered & not failed
    const wfReady = wfs.filter((w: any) => w.readiness_status !== 'failed').length
    const workflow_coverage_score = pct(wfReady, wfs.length || 1)

    // Commercial backbone: count critical sections present in modules + workflows present
    const commercialModules = mods.filter((m: any) => ['commercial','finance','suppliers'].includes(m.module_category)).length
    const commercialWfKeys = ['proposal_to_demo','demo_to_deal','deal_to_invoice','deal_to_assignment','assignment_to_completion']
    const commercialWfPresent = wfs.filter((w: any) => commercialWfKeys.includes(w.workflow_key)).length
    const commercial_backbone_score = pct(commercialWfPresent + Math.min(commercialModules, 5), commercialWfKeys.length + 5)

    // Social/marketing
    const smModules = mods.filter((m: any) => ['social','marketing','content','assets'].includes(m.module_category)).length
    const social_marketing_score = pct(Math.min(smModules, 8), 8)

    // Support/portal
    const spModules = mods.filter((m: any) => ['support','portal','partners'].includes(m.module_category)).length
    const support_portal_score = pct(Math.min(spModules, 4), 4)

    // Multi-business
    const businessScopedKeys = mods.filter((m: any) => m.business_scoped).map((m: any) => m.module_key)
    const presentByBiz = new Map<string, Set<string>>()
    for (const s of status) {
      if (!s.business_id) continue
      if (!presentByBiz.has(s.business_id)) presentByBiz.set(s.business_id, new Set())
      presentByBiz.get(s.business_id)!.add(s.module_key)
    }
    let coverSum = 0, coverDen = 0
    for (const b of bizs) {
      const present = presentByBiz.get(b.id) ?? new Set()
      coverSum += businessScopedKeys.filter((k: string) => present.has(k)).length
      coverDen += businessScopedKeys.length
    }
    const multi_business_score = pct(coverSum, coverDen || 1)

    // External gate audit (registry items with external risk + approval required = healthy)
    const externalRows = reg.filter((r: any) => r.external_action_risk)
    const gatedExternal = externalRows.filter((r: any) => r.requires_founder_approval).length
    const external_gate_score = pct(gatedExternal, externalRows.length || 1)

    // Lost feature inline check: modules without component or section
    const lost_features = mods.filter((m: any) => m.primary_route && !m.command_centre_section).length
    const hidden_pages = mods.filter((m: any) => m.primary_route && !m.component_name).length

    const competitor_parity_score = Math.round(
      (manual_coverage_score + command_centre_visibility_score + workflow_coverage_score +
       commercial_backbone_score + social_marketing_score + support_portal_score) / 6
    )
    const overall_liftor_score = Math.round(
      (competitor_parity_score + multi_business_score + external_gate_score) / 3
    )

    const classifications = {
      manual_coverage: classify(manual_coverage_score, 'MANUAL_FULLY_VISIBLE','MANUAL_PARTIAL_VISIBLE','MANUAL_NOT_VISIBLE'),
      command_centre: classify(command_centre_visibility_score, 'COMMAND_CENTRE_CONTROL_COMPLETE','COMMAND_CENTRE_CONTROL_PARTIAL','COMMAND_CENTRE_CONTROL_NOT_READY'),
      commercial: classify(commercial_backbone_score, 'PROPOSAL_DEMO_DEAL_FINANCE_READY','PROPOSAL_DEMO_DEAL_FINANCE_PARTIAL','PROPOSAL_DEMO_DEAL_FINANCE_NOT_READY'),
      social_marketing: classify(social_marketing_score, 'SOCIAL_MARKETING_READY','SOCIAL_MARKETING_PARTIAL','SOCIAL_MARKETING_NOT_READY'),
      support_portal: classify(support_portal_score, 'SUPPORT_PORTAL_READY','SUPPORT_PORTAL_PARTIAL','SUPPORT_PORTAL_NOT_READY'),
      multi_business: classify(multi_business_score, 'MULTI_BUSINESS_READY','MULTI_BUSINESS_PARTIAL','MULTI_BUSINESS_NOT_READY'),
      overall: classify(overall_liftor_score, 'LIFTOR_READY_FOR_INTERNAL_OPERATION','LIFTOR_PARTIAL_READY_FOR_INTERNAL_OPERATION','LIFTOR_NOT_READY'),
    }

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      counts: {
        manual_objects: reg.length,
        modules: mods.length,
        workflows: wfs.length,
        data_flows: dfs.length,
        businesses: bizs.length,
        external_action_rows: externalRows.length,
        lost_features, hidden_pages,
      },
      scores: {
        manual_coverage_score,
        command_centre_visibility_score,
        workflow_coverage_score,
        commercial_backbone_score,
        social_marketing_score,
        support_portal_score,
        multi_business_score,
        external_gate_score,
        competitor_parity_score,
        overall_liftor_score,
      },
      classifications,
      safety: {
        emails_sent: 0, smartlead_post: 0, apollo_post: 0, social_publish: 0, dms_sent: 0,
        proposals_sent_external: 0, invoices_sent_external: 0, ad_spend: 0, secrets_exposed: false,
        read_only: true,
      },
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