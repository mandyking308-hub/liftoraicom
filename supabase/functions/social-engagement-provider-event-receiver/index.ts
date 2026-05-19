import { corsHeaders, json } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ ok: false, blocked: true, reason: "provider_event_receiver_not_enabled", records_created: 0, ...SAFETY_FLAGS }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});