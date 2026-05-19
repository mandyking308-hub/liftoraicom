import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  await logAudit(a.admin, {
    business_id: body.business_id ?? "00000000-0000-0000-0000-000000000000",
    action: "external_ad_attempt_blocked", action_status: "blocked",
    result_json: { reason: "paid_media_external_launch_not_enabled" },
  });
  return json({
    ok: true, blocked: true, reason: "paid_media_external_launch_not_enabled",
    external_api_calls: 0, campaigns_launched: 0, ads_created_externally: 0,
    money_spent: 0, payment_methods_created: 0, pixels_created: 0,
    safety: SAFETY_FLAGS,
  }, 403);
});
