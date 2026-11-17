import { corsHeaders, json, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
import { founderGuard } from "../_shared/founderGuard.ts";

Deno.serve(async (req) => {
  const __guard = await founderGuard(req, corsHeaders as Record<string, string>);
  if (__guard) return __guard;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return json({
    ok: false, blocked: true, reason: "support_external_reply_not_enabled",
    external_api_calls: 0, customer_replies_sent: 0, live_chats_started: 0, tickets_created_externally: 0,
    safety: SUPPORT_SAFETY,
  }, 403);
});