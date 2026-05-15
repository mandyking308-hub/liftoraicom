import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const { business_id, confirm } = body
    if (!business_id) return json({ ok:false, error:'business_id required' }, 400)
    if (confirm !== 'PAUSE BUSINESS OPERATIONS') return json({ ok:false, error:'confirmation phrase required' }, 400)

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await svc.from('business_activation_profiles').update({
      activation_status: 'paused',
      operating_mode: 'sandbox',
      go_live_allowed: false,
      paused_at: new Date().toISOString(),
      metadata: { paused_by: u.user.id, auto_send:false, outbound_cron:false, external_gate_locked:true },
    }).eq('business_id', business_id).select().single()
    if (error) return json({ ok:false, error: error.message }, 500)
    return json({ ok:true, profile: data, external_actions_gate:'LOCKED', auto_send:false, outbound_cron:false, no_external_notification:true })
  } catch (e) { return json({ ok:false, error:String(e) }, 500) }
})
function json(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }