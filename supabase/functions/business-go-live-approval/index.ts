import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_MODES = ['sandbox','internal_only','founder_approved_live','limited_external_live','full_autopilot_locked']
const READINESS_THRESHOLD = 90

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const supa = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization: auth } } })
    const { data: u } = await supa.auth.getUser()
    if (!u?.user) return json({ ok:false, error:'unauthorized' }, 401)
    const { data: roles } = await supa.from('user_roles').select('role').eq('user_id', u.user.id)
    if (!(roles ?? []).some((r:any)=> ['admin','founder'].includes(r.role))) return json({ ok:false, error:'forbidden' }, 403)

    const body = await req.json().catch(()=>({}))
    const { business_id, operating_mode, confirm } = body
    if (!business_id || !operating_mode) return json({ ok:false, error:'business_id and operating_mode required' }, 400)
    if (!ALLOWED_MODES.includes(operating_mode)) return json({ ok:false, error:'invalid operating_mode' }, 400)
    if (confirm !== 'APPROVE BUSINESS GO LIVE') return json({ ok:false, error:'confirmation phrase required' }, 400)
    // Hard safety: never enable full external autopilot
    if (operating_mode === 'full_autopilot_locked') {
      return json({ ok:false, error:'full_autopilot_locked is reserved and cannot be enabled by this function' }, 400)
    }

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: items } = await svc.from('business_activation_checklist_items').select('*').eq('business_id', business_id)
    const checklist = items ?? []
    const total = checklist.length || 1
    const done = checklist.filter((i:any)=> i.item_status === 'complete').length
    const score = Math.round((done/total)*100)
    const blockers = checklist.filter((i:any)=> i.required_for_go_live && i.item_status !== 'complete')
    if (score < READINESS_THRESHOLD || blockers.length > 0) {
      return json({ ok:false, error:'readiness threshold not met', readiness_score: score, blockers: blockers.length }, 400)
    }

    const allow_external = operating_mode === 'limited_external_live'
    const { data: updated, error } = await svc.from('business_activation_profiles').update({
      activation_status: 'active',
      operating_mode,
      readiness_score: score,
      go_live_allowed: true,
      activated_at: new Date().toISOString(),
      paused_at: null,
      metadata: { auto_send: false, outbound_cron: false, external_gate_locked: !allow_external, approved_by: u.user.id, approved_at: new Date().toISOString() },
    }).eq('business_id', business_id).select().single()
    if (error) return json({ ok:false, error: error.message }, 500)

    return json({ ok:true, profile: updated, readiness_score: score, external_actions_gate: allow_external ? 'LIMITED' : 'LOCKED', auto_send:false, outbound_cron:false })
  } catch (e) { return json({ ok:false, error:String(e) }, 500) }
})
function json(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }