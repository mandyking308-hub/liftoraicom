import { corsHeaders, json, SAFETY } from '../_shared/customerSuccessLogic.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return json({ blocked: true, reason: 'customer_success_external_action_not_enabled', ...SAFETY }, 403);
});
