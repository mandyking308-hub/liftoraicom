import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  let q = auth.admin.from("social_accounts").select("*").order("created_at", { ascending: false });
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) return json({ ok: false, error: error.message }, 500);
  const accounts = data ?? [];
  return json({
    ok: true,
    business_id,
    accounts,
    accounts_count: accounts.length,
    connected_count: accounts.filter((a: any) =>
      ["connected", "connected_read_only", "connected_publish_locked"].includes(a.connection_status)
    ).length,
    no_external_action: true,
    provider_execution_enabled: false,
  });
});