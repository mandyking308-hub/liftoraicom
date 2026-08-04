import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { bufferGraphQL, bufferKeyPresent, ORGANIZATIONS_QUERY } from "../_shared/bufferClient.ts";
import { audit } from "../_shared/socialDistributionDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const business_id: string | null = body.business_id ?? null;

  if (!bufferKeyPresent()) {
    await audit(a.admin, { business_id, action: "buffer_connection_test", result_json: { ok: false, error: "buffer_api_key_missing" } });
    return json({ ok: false, key_configured: false, error: "buffer_api_key_missing", message: "Add the BUFFER_API_KEY secret in Project Settings > Secrets." });
  }

  const res = await bufferGraphQL<{ account: { organizations: Array<{ id: string; name: string; ownerEmail: string }> } }>(ORGANIZATIONS_QUERY);
  if (!res.ok) {
    await audit(a.admin, { business_id, action: "buffer_connection_test", result_json: { ok: false, error: res.errorMessage }, error_message: res.errorMessage });
    return json({ ok: false, key_configured: true, error: res.errorMessage }, 200);
  }

  const orgs = (res.data?.account?.organizations ?? []).map((o) => ({
    id: o.id, name: o.name, owner_email_masked: (o.ownerEmail ?? "").replace(/^(.).*(@.*)$/, "$1***$2"),
  }));

  if (business_id) {
    const { data: existing } = await a.admin.from("social_provider_connections").select("id")
      .eq("business_id", business_id).eq("provider", "buffer").maybeSingle();
    const patch = { connection_status: "connected", last_checked_at: new Date().toISOString(), last_error: null, capabilities_json: { organizations: orgs.length } };
    if (existing) await a.admin.from("social_provider_connections").update(patch).eq("id", existing.id);
    else await a.admin.from("social_provider_connections").insert({ business_id, provider: "buffer", connection_name: "Buffer", connection_mode: "test", ...patch });
  }

  await audit(a.admin, { business_id, action: "buffer_connection_test", result_json: { ok: true, organizations: orgs.length } });
  return json({ ok: true, key_configured: true, organizations: orgs, no_posts_created: true });
});
