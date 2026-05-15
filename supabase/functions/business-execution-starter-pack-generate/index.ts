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
    const { business_id, training_run_id, confirm, dry_run = false } = body
    if (!business_id) return j({ ok:false, error:'business_id required' }, 400)
    if (!dry_run && confirm !== 'CREATE BUSINESS STARTER PACK') return j({ ok:false, error:'confirmation phrase required' }, 400)

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: run } = training_run_id
      ? await svc.from('business_training_runs').select('*').eq('id', training_run_id).maybeSingle()
      : await svc.from('business_training_runs').select('*').eq('business_id', business_id).order('created_at',{ ascending:false }).limit(1).maybeSingle()

    const pack = {
      business_id, training_run_id: run?.id ?? null, pack_status: 'draft',
      business_summary: run?.business_summary ?? 'Run training first to populate summary.',
      icp_summary: 'Initial ICP — refine after reviewing customer list.',
      offers: [{ name: 'Starter offer', notes: 'Derived from offer/pricing uploads' }],
      approved_tone: run?.brand_voice_summary ?? 'Professional, concise, helpful.',
      email_templates: [
        { key: 'first_reply', subject: 'Following up', body_outline: 'Acknowledge → context → next step.' },
        { key: 'followup', subject: 'Quick check-in', body_outline: 'Reference last message → value add → CTA.' },
      ],
      social_content_plan: [
        { week: 1, posts: ['intro post','value post','case study'] },
        { week: 2, posts: ['behind the scenes','customer story','offer teaser'] },
      ],
      marketing_assets_needed: ['lead magnet PDF','landing page hero','case study deck'],
      proposal_outline: 'Cover → problem → solution → scope → pricing → next step.',
      onboarding_flow: [{ step:1, name:'Welcome message' },{ step:2, name:'Kickoff call' },{ step:3, name:'Bedding-in checklist' }],
      survey_plan: [{ trigger:'after onboarding', survey:'CSAT short' },{ trigger:'quarterly', survey:'NPS' }],
      support_faqs: [{ q:'How do I get help?', a:'Reply to any message — internal draft only until approved.' }],
      complaints_flow: [{ step:1, name:'Acknowledge within 24h' },{ step:2, name:'Investigate' },{ step:3, name:'Resolve and document' }],
      prospecting_targets: [{ segment:'ICP A', count_target: 100 }],
      automation_recommendations: ['Connect Smartlead campaign mapping','Approve external templates','Enable webhook (founder approval)'],
      go_live_blockers: ['Templates pending approval','Smartlead campaign mapping missing','Customer data import incomplete'],
      founder_review_required: true,
    }

    if (dry_run) return j({ ok:true, dry_run:true, planned: pack, external_actions_gate:'LOCKED' })
    const { data, error } = await svc.from('business_execution_starter_packs').insert(pack).select().single()
    if (error) return j({ ok:false, error: error.message }, 500)
    return j({ ok:true, pack: data, external_actions_gate:'LOCKED', no_external_send:true })
  } catch (e) { return j({ ok:false, error:String(e) }, 500) }
})
function j(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }