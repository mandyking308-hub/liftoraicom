import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const isFounder = (roles ?? []).some((r: any) => ['admin','founder'].includes(r.role));
    if (!isFounder) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const invoke = async (name: string, body: any = {}) => {
      try {
        const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
          body: JSON.stringify(body),
        });
        return await r.json();
      } catch (e) { return { error: String(e) }; }
    };

    const linkCheck = await invoke('command-centre-link-check');
    const journey = await invoke('customer-journey-flow-status');

    const journeyReady = Array.isArray(journey?.steps) && journey.steps.length >= 25;
    const linksReady = (linkCheck?.broken_links ?? 0) === 0 && (linkCheck?.missing_routes ?? 0) === 0;

    let final = 'PASS';
    if (!journeyReady || !linksReady) final = 'FIXED';
    if ((linkCheck?.external_actions_without_gate ?? 0) > 0) final = 'BLOCKED';

    return new Response(JSON.stringify({
      journey_flow_ready: journeyReady,
      command_links_ready: linksReady,
      broken_links_count: linkCheck?.broken_links ?? 0,
      missing_anchor_count: linkCheck?.missing_anchors ?? 0,
      modules_without_journey_step: linkCheck?.modules_without_command_link ?? 0,
      journey_steps_without_route: journey?.steps?.filter((s: any) => s.status === 'not_configured').length ?? 0,
      external_actions_without_gate: linkCheck?.external_actions_without_gate ?? 0,
      stale_copy_items: linkCheck?.stale_links ?? 0,
      final_status: final,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});