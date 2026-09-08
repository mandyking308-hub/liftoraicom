import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { receiveSmartleadEvent } from "../_shared/smartleadEvents.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const secret = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET");
  if (!secret) return json({ ok: false, error: "webhook_secret_missing" }, 503);
  const supplied = req.headers.get("x-smartlead-signature") ?? req.headers.get("x-webhook-secret");
  if (!supplied || supplied !== secret) return json({ ok: false, error: "invalid_or_missing_secret" }, 401);
  let payload: unknown;
  try { payload = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ ok: false, error: "object_required" }, 400);
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ ok: false, error: "backend_configuration_missing" }, 503);
  const db = createClient(url, key, { auth: { persistSession: false } });
  try { return json(await receiveSmartleadEvent(db, payload as Record<string,unknown>, Deno.env.get("SMARTLEAD_EVENT_APPLY_ENABLED") === "true")); }
  catch { return json({ ok: false, error: "event_processing_failed_retry_supported" }, 500); }
});
