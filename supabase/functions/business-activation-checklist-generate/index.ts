import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const AREAS: Array<{area:string; items:string[]; external_risk?:boolean}> = [
  { area:'business_identity', items:['Confirm legal name','Confirm trading name','Confirm primary contact'] },
  { area:'legal_entity', items:['Entity verified','Tax/VAT registration confirmed'] },
  { area:'brand', items:['Logo uploaded','Brand voice doc approved'] },
  { area:'offers_packages', items:['Offer catalog populated','Pricing tiers approved'] },
  { area:'pricing', items:['Currency confirmed','Discount policy set'] },
  { area:'CRM', items:['CRM populated','Customer memory verified'] },
  { area:'integrations', items:['Required integrations listed','Credentials staged (no secrets in plaintext)'] },
  { area:'outbound', items:['Outbound policy reviewed','Send brake confirmed LOCKED'], external_risk:true },
  { area:'Smartlead', items:['Account connected','Mailbox connected','Campaign mapped','Webhook live','Warmup verified'], external_risk:true },
  { area:'Apollo', items:['Account connected','Credit cap configured','POST disabled'], external_risk:true },
  { area:'native_email', items:['IONOS lane safe-blocked','Approved templates only'], external_risk:true },
  { area:'social', items:['Accounts connected','Publish lane disabled'], external_risk:true },
  { area:'content', items:['Content factory templates approved'] },
  { area:'marketing', items:['Funnels mapped','Lead magnets approved'] },
  { area:'proposals', items:['Proposal template approved','Send lane disabled'], external_risk:true },
  { area:'demos', items:['Demo flow documented'] },
  { area:'invoicing', items:['Invoice template approved','Send lane disabled'], external_risk:true },
  { area:'support', items:['Support inbox routed','Auto-reply disabled'] },
  { area:'onboarding', items:['Onboarding flow approved','First message disabled until founder OK'], external_risk:true },
  { area:'surveys', items:['Survey template approved','Send lane disabled'], external_risk:true },
  { area:'complaints', items:['Complaint workflow defined'] },
  { area:'retention', items:['Retention metrics baseline set'] },
  { area:'winback', items:['Winback template approved','Send lane disabled'], external_risk:true },
  { area:'suppliers', items:['Suppliers listed','Contract status verified'] },
  { area:'privacy', items:['Privacy notice in place','DSAR process verified'] },
  { area:'compliance', items:['Compliance posture reviewed'] },
  { area:'security', items:['Secrets confirmed in vault','RLS verified'] },
  { area:'templates', items:['All external templates approved'] },
  { area:'documents', items:['Data room populated'] },
  { area:'testing', items:['Acceptance suite run','Dry-run PASS'] },
  { area:'Command_Centre', items:['Activation panel mounted','Cards visible','Manual link working'] },
]

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
    const business_id = body.business_id
    const dry_run = body.dry_run !== false
    const confirm = body.confirm
    if (!business_id) return json({ ok:false, error:'business_id required' }, 400)
    if (!dry_run && confirm !== 'CREATE BUSINESS ACTIVATION CHECKLIST') {
      return json({ ok:false, error:'confirmation phrase required' }, 400)
    }

    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const planned = AREAS.flatMap(a => a.items.map(it => ({
      business_id, checklist_area: a.area, checklist_item: it,
      external_action_risk: !!a.external_risk, founder_approval_required: true,
      required_for_go_live: true, item_status: 'pending',
    })))

    if (dry_run) return json({ ok:true, dry_run:true, planned_count: planned.length, areas: AREAS.length, external_actions_gate:'LOCKED' })

    let { data: profile } = await svc.from('business_activation_profiles').select('*').eq('business_id', business_id).maybeSingle()
    if (!profile) {
      const { data: created } = await svc.from('business_activation_profiles').insert({ business_id }).select().single()
      profile = created
    }
    const rows = planned.map(p => ({ ...p, activation_profile_id: profile!.id }))
    const { error } = await svc.from('business_activation_checklist_items').upsert(rows, { onConflict: 'business_id,checklist_area,checklist_item', ignoreDuplicates: true })
    if (error) return json({ ok:false, error: error.message }, 500)
    return json({ ok:true, created: rows.length, profile_id: profile!.id, external_actions_gate:'LOCKED' })
  } catch (e) { return json({ ok:false, error:String(e) }, 500) }
})
function json(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} }) }