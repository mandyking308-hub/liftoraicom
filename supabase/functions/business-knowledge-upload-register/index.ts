import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const supa = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization: auth } } })
    const { data: u } = await supa.auth.getUser()
    if (!u?.user) return j({ ok:false, error:'unauthorized' }, 401)
    const { data: roles } = await supa.from('user_roles').select('role').eq('user_id', u.user.id)
    if (!(roles ?? []).some((r:any)=> ['admin','founder'].includes(r.role))) return j({ ok:false, error:'forbidden' }, 403)

    const body = await req.json().catch(()=>({}))
    const { business_id, upload_type, upload_title, source_kind, source_url, storage_url, summary, confirm } = body
    if (!business_id || !upload_type || !upload_title || !source_kind) return j({ ok:false, error:'business_id, upload_type, upload_title, source_kind required' }, 400)
    if (source_kind === 'website_url' && confirm !== 'REGISTER WEBSITE KNOWLEDGE SOURCE') {
      return j({ ok:false, error:'website intake requires confirmation phrase' }, 400)
    }
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await svc.from('business_knowledge_uploads').insert({
      business_id, upload_type, upload_title, source_kind,
      source_url: source_url ?? null, storage_url: storage_url ?? null, summary: summary ?? null,
      upload_status:'uploaded', processing_status:'not_started',
      privacy_level:'internal', customer_visible_allowed:false, founder_review_required:true,
    }).select().single()
    if (error) return j({ ok:false, error: error.message }, 500)
    return j({ ok:true, upload: data, external_actions_gate:'LOCKED', no_external_fetch: source_kind !== 'website_url' })
  } catch (e) { return j({ ok:false, error:String(e) }, 500) }
})
function j(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }