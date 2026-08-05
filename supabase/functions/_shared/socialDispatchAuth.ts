/**
 * Auth for machine-triggered social distribution endpoints.
 * Accepts EITHER a founder/admin JWT (manual "run now") OR a scheduler
 * shared secret (SOCIAL_DISPATCH_SECRET) sent as x-dispatch-secret.
 * The secret itself is never returned, logged or audited.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { json, requireFounder } from "./socialAuth.ts";

export async function requireFounderOrScheduler(req: Request) {
  const secret = (Deno.env.get("SOCIAL_DISPATCH_SECRET") ?? "").trim();
  const provided = (req.headers.get("x-dispatch-secret") ?? "").trim();
  if (secret && provided && provided === secret) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    return { admin, trigger_source: "scheduler" as const };
  }
  if (provided && !secret) {
    return { error: json({ ok: false, error: "dispatch_secret_not_configured" }, 401) } as const;
  }
  const a = await requireFounder(req);
  if ("error" in a) return a;
  return { admin: a.admin, trigger_source: "founder" as const };
}

export function dispatchScheduleRegistered(): boolean {
  return (Deno.env.get("SOCIAL_DISPATCH_CRON_REGISTERED") ?? "").trim().toLowerCase() === "true";
}