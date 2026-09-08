import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function founderContext(req: Request) {
  if (req.method !== "POST") throw new RequestError("method_not_allowed", 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) throw new RequestError("backend_configuration_missing", 503);
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new RequestError("auth_missing", 401);
  const client = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new RequestError("auth_invalid", 401);
  const db = createClient(url, service, { auth: { persistSession: false } });
  const roles = await db.from("user_roles").select("role").eq("user_id", data.user.id);
  if (roles.error) throw new RequestError("role_lookup_failed", 503);
  if (!roles.data?.some(r => r.role === "founder" || r.role === "admin")) throw new RequestError("forbidden", 403);
  return { db, userId: data.user.id, apiKey: Deno.env.get("SMARTLEAD_API_KEY") ?? "" };
}
export async function objectBody(req: Request): Promise<Record<string, unknown>> {
  let b: unknown;
  try { b = await req.json(); } catch { throw new RequestError("invalid_json"); }
  if (!b || typeof b !== "object" || Array.isArray(b)) throw new RequestError("json_object_required");
  return b as Record<string, unknown>;
}
export const errorResponse = (error: unknown) => json({ ok: false, error: error instanceof RequestError ? error.message : "smartlead_operation_failed" }, error instanceof RequestError ? error.status : 500);
