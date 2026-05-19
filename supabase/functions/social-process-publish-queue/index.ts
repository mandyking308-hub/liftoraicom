import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  return json({
    ok: true,
    blocked: true,
    reason: "provider_execution_not_enabled",
    provider_calls: 0,
    posts_published: 0,
    dms_sent: 0,
    no_external_action: true,
    provider_execution_enabled: false,
  });
});