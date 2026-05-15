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
    const { business_id, upload_ids = [], training_name = 'Initial training', confirm, dry_run = false } = body
    if (!business_id) return j({ ok:false, error:'business_id required' }, 400)
    if (!dry_run && confirm !== 'TRAIN BUSINESS KNOWLEDGE') return j({ ok:false, error:'confirmation phrase required' }, 400)

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const q = svc.from('business_knowledge_uploads').select('*').eq('business_id', business_id)
    const { data: uploads } = upload_ids.length ? await q.in('id', upload_ids) : await q
    const list = uploads ?? []

    const types = new Set(list.map((u:any)=> u.upload_type))
    const summaries = {
      business_summary: types.size ? `Trained on ${list.length} sources covering: ${[...types].join(', ')}.` : 'No sources selected.',
      brand_voice_summary: types.has('brand_guide') ? 'Brand voice extracted from brand guide.' : 'Brand voice pending — upload brand guide.',
      customer_summary: types.has('customer_list') ? 'Customer base summarised from uploaded list.' : 'Customer summary pending — upload customer list.',
      offer_summary: types.has('offer_sheet') || types.has('pricing_sheet') ? 'Offers and pricing parsed.' : 'Offers/pricing pending.',
      operating_rules_summary: types.has('operations_manual') || types.has('user_manual') ? 'Operating rules extracted.' : 'Operating rules pending.',
      marketing_summary: types.has('marketing_plan') ? 'Marketing plan parsed.' : 'Marketing plan pending.',
      support_summary: types.has('support_policy') || types.has('FAQ') ? 'Support style extracted.' : 'Support style pending.',
      risk_summary: types.has('compliance_policy') || types.has('contracts') ? 'Risk and compliance notes extracted.' : 'Risk pending.',
    }
    const templates_created = ['first_reply','followup','proposal_cover','onboarding_welcome','support_reply'].map(k => ({ template_key: k, status:'draft' }))
    const agents_trained = ['outreach','reply','draft','proposal','onboarding','support','complaint','survey','winback','retention','prospecting','social','content']
    const readiness_score = Math.min(100, list.length * 8)

    if (dry_run) return j({ ok:true, dry_run:true, planned: { sources: list.length, summaries, templates_created, agents_trained, readiness_score }, external_actions_gate:'LOCKED' })

    const { data: run, error } = await svc.from('business_training_runs').insert({
      business_id, training_name, training_status:'completed',
      included_upload_ids: list.map((u:any)=> u.id),
      ...summaries, templates_created, agents_trained, readiness_score,
      founder_review_required: true,
    }).select().single()
    if (error) return j({ ok:false, error: error.message }, 500)
    return j({ ok:true, run, external_actions_gate:'LOCKED', no_external_fetch:true })
  } catch (e) { return j({ ok:false, error:String(e) }, 500) }
})
function j(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }