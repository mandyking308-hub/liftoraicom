import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global: { headers: { Authorization: auth } } })
    const { data: u } = await supa.auth.getUser()
    if (!u?.user) return json({ ok:false, error:'unauthorized' }, 401)
    const isFounder = await hasRole(supa, u.user.id, ['admin','founder'])
    if (!isFounder) return json({ ok:false, error:'forbidden' }, 403)

    const body = req.method === 'POST' ? await req.json().catch(()=>({})) : {}
    const business_id = body.business_id ?? new URL(req.url).searchParams.get('business_id')
    if (!business_id) return json({ ok:false, error:'business_id required' }, 400)

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const [profile, items, integrations, imports, templates] = await Promise.all([
      svc.from('business_activation_profiles').select('*').eq('business_id', business_id).maybeSingle(),
      svc.from('business_activation_checklist_items').select('*').eq('business_id', business_id),
      svc.from('integration_activation_status').select('*').eq('business_id', business_id),
      svc.from('customer_data_import_readiness').select('*').eq('business_id', business_id),
      svc.from('approved_template_library').select('*').eq('business_id', business_id),
    ])

    const checklist = items.data ?? []
    const blockers = checklist.filter((i:any)=> i.required_for_go_live && i.item_status !== 'complete')
    const total = checklist.length || 1
    const done = checklist.filter((i:any)=> i.item_status === 'complete').length
    const readiness_score = Math.round((done/total)*100)
    const go_live_allowed = readiness_score >= 90 && blockers.length === 0

    const next_actions = blockers.slice(0,10).map((b:any)=>({
      area: b.checklist_area, item: b.checklist_item,
      next_action: b.next_action ?? 'Set status to complete after verification',
      blocker: b.blocker, founder_approval_required: b.founder_approval_required,
    }))

    return json({
      ok: true, business_id, readiness_score, go_live_allowed,
      external_actions_gate: 'LOCKED',
      activation_profile: profile.data,
      checklist_count: checklist.length,
      checklist_complete: done,
      checklist_blockers: blockers.length,
      integrations: integrations.data ?? [],
      data_imports: imports.data ?? [],
      template_library: templates.data ?? [],
      missing_modules: blockers.map((b:any)=> b.checklist_area),
      next_actions,
    })
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500)
  }
})

async function hasRole(supa:any, uid:string, roles:string[]){
  const { data } = await supa.from('user_roles').select('role').eq('user_id', uid)
  return (data ?? []).some((r:any)=> roles.includes(r.role))
}
function json(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }