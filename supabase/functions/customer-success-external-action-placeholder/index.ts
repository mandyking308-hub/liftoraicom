import { corsHeaders, json, SAFETY } from '../_shared/customerSuccessLogic.ts';
import { founderGuard } from "../_shared/founderGuard.ts";

Deno.serve(async (req) => {
  const __guard = await founderGuard(req, corsHeaders as Record<string, string>);
  if (__guard) return __guard;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return json({ blocked: true, reason: 'customer_success_external_action_not_enabled', ...SAFETY }, 403);
});
