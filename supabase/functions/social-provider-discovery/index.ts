import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.admin
    .from("social_provider_adapters")
    .select("*")
    .order("display_name");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({
    ok: true,
    providers: data ?? [],
    no_external_action: true,
    provider_execution_enabled: false,
  });
});