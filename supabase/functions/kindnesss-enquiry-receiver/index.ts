import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { handleKindnesssUnifiedEnquiry } from "../_shared/kindnesssUnifiedReceiver.ts";
import { createUnifiedInboundStore } from "../_shared/unifiedInboundStore.ts";

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  // Both gates are deliberately opt-in. Missing schema/secrets fail closed with no send.
  const enabledFlag = Deno.env.get("KINDNESSS_HANDOFF_RECEIVER_ENABLED");
  const fanInEnabledFlag = Deno.env.get("UNIFIED_INBOUND_FANIN_ENABLED");
  if (enabledFlag !== "true" || fanInEnabledFlag !== "true") {
    return json({ ok: false, reason: "receiver_disabled" }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ ok: false, reason: "receiver_unavailable" }, 503);

  const rawBody = await req.text();
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const result = await handleKindnesssUnifiedEnquiry(rawBody, {
    source: req.headers.get("x-liftor-source"),
    timestamp: req.headers.get("x-liftor-timestamp"),
    signature: req.headers.get("x-liftor-signature"),
  }, {
    enabledFlag,
    fanInEnabledFlag,
    secret: Deno.env.get("KINDNESSS_HANDOFF_SIGNING_SECRET"),
    store: createUnifiedInboundStore(admin),
  });
  return json(result.body, result.status);
});
