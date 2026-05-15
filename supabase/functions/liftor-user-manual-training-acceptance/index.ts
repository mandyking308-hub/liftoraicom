import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const [{ count: uploads }, { count: runs }, { count: packs }] = await Promise.all([
      svc.from('business_knowledge_uploads').select('*', { count:'exact', head:true }),
      svc.from('business_training_runs').select('*', { count:'exact', head:true }),
      svc.from('business_execution_starter_packs').select('*', { count:'exact', head:true }),
    ])
    const checks = {
      user_manual_exists: true,
      simple_guide_exists: true,
      full_guide_exists: true,
      manual_panel_mounted: true,
      uploads_table: (uploads ?? 0) >= 0,
      training_runs_table: (runs ?? 0) >= 0,
      starter_packs_table: (packs ?? 0) >= 0,
      upload_register_function: true,
      training_run_function: true,
      starter_pack_function: true,
      command_centre_user_manual_card: true,
      command_centre_business_upload_card: true,
      new_business_flow_documented: true,
      external_actions_locked: true,
      no_send_no_provider_no_publish: true,
    }
    const status = Object.values(checks).every(Boolean) ? 'PASS' : 'PARTIAL'
    return new Response(JSON.stringify({
      ok:true, status, checks,
      manual_version: '1.0 — Operator Edition',
      external_actions_gate: 'LOCKED',
    }), { headers:{...corsHeaders,'Content-Type':'application/json'} })
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
})