/**
 * Founder gate for edge functions: lets through only
 *  - a signed-in founder/admin (JWT + user_roles), or
 *  - Liftor's own scheduled jobs presenting x-liftor-cron-token that matches
 *    the locked public.internal_cron_token row.
 * Returns a Response to reject, or null to continue. OPTIONS passes through.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authorizeFounderOrAdmin, authJson, callerCorsHeaders } from "./callerAuth.ts";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function founderGuard(req: Request, headers: Record<string, string> = callerCorsHeaders): Promise<Response | null> {
  if (req.method === "OPTIONS") return null;
  const cronToken = (req.headers.get("x-liftor-cron-token") ?? "").trim();
  if (cronToken) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await admin.from("internal_cron_token").select("token").eq("id", 1).maybeSingle();
    if (error) return authJson({ ok: false, error: "cron_token_lookup_failed" }, 503, headers as typeof callerCorsHeaders);
    if (data?.token && safeEqual(cronToken, data.token)) return null;
    return authJson({ ok: false, error: "forbidden" }, 403, headers as typeof callerCorsHeaders);
  }
  const auth = await authorizeFounderOrAdmin(req, headers as typeof callerCorsHeaders);
  return "error" in auth ? auth.error : null;
}
