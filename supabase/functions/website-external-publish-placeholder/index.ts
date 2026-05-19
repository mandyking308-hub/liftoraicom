import { corsHeaders, json, requireFounder, logAudit } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  await logAudit(a.admin, { business_id: body.business_id ?? "00000000-0000-0000-0000-000000000000", action: "provider_attempt_blocked", action_status: "blocked", result_json: { reason: "website_external_publish_not_enabled" } });
  return json({
    ok: true, blocked: true, reason: "website_external_publish_not_enabled",
    external_api_calls: 0, pages_published: 0, live_forms_created: 0, payments_created: 0, emails_sent: 0,
    no_external_action: true,
  }, 403);
});