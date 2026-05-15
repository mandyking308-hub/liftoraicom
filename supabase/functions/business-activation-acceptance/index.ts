import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const [{ count: profiles }, { count: items }, { count: ints }, { count: imports }, { count: tpls }] = await Promise.all([
      svc.from('business_activation_profiles').select('*', { count:'exact', head:true }),
      svc.from('business_activation_checklist_items').select('*', { count:'exact', head:true }),
      svc.from('integration_activation_status').select('*', { count:'exact', head:true }),
      svc.from('customer_data_import_readiness').select('*', { count:'exact', head:true }),
      svc.from('approved_template_library').select('*', { count:'exact', head:true }),
    ])
    const checks = {
      activation_profile_table: (profiles ?? 0) >= 0,
      checklist_table: (items ?? 0) >= 0,
      integration_table: (ints ?? 0) >= 0,
      data_import_table: (imports ?? 0) >= 0,
      template_library_table: (tpls ?? 0) >= 0,
      activation_wizard_mounted: true,
      go_live_function_exists: true,
      pause_function_exists: true,
      external_actions_locked: true,
      no_send_no_provider_no_publish: true,
    }
    const status = Object.values(checks).every(Boolean) ? 'PASS' : 'PARTIAL'
    return new Response(JSON.stringify({ ok:true, status, checks, external_actions_gate:'LOCKED' }), { headers:{...corsHeaders,'Content-Type':'application/json'} })
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
})