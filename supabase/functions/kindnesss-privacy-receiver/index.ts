import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { handleKindnesssPrivacyNotification } from "../_shared/kindnesssPrivacyReceiver.ts";
import { createKindnesssPrivacyStore } from "../_shared/kindnesssPrivacyStore.ts";

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  // Dedicated privacy gate. Commercial handoff flags never enable this receiver.
  const enabledFlag = Deno.env.get("KINDNESSS_PRIVACY_RECEIVER_ENABLED");
  if (enabledFlag !== "true") return json({ ok: false, reason: "receiver_disabled" }, 503);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ ok: false, reason: "receiver_unavailable" }, 503);

  const rawBody = new Uint8Array(await req.arrayBuffer());
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const result = await handleKindnesssPrivacyNotification(rawBody, {
    source: req.headers.get("x-liftor-source"),
    eventType: req.headers.get("x-liftor-event-type"),
    eventId: req.headers.get("x-liftor-event-id"),
    timestamp: req.headers.get("x-liftor-timestamp"),
    signature: req.headers.get("x-liftor-signature"),
  }, {
    enabledFlag,
    secret: Deno.env.get("KINDNESSS_PRIVACY_SIGNING_SECRET"),
    commercialSecret: Deno.env.get("KINDNESSS_HANDOFF_SIGNING_SECRET"),
    store: createKindnesssPrivacyStore(admin),
  });
  return json(result.body, result.status);
});
