// Records a new user's legal acceptance with the server-seen IP address.
// Works before email confirmation (no session yet): only accepted for an account
// created in the last 15 minutes that has no acceptance recorded yet.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const userId = String(body.user_id ?? "");
  const terms = String(body.terms_version ?? "").slice(0, 20);
  const privacy = String(body.privacy_version ?? "").slice(0, 20);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !terms || !privacy) return json({ error: "invalid_input" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u } = await admin.auth.admin.getUserById(userId);
  if (!u?.user || Date.now() - new Date(u.user.created_at).getTime() > 15 * 60 * 1000) return json({ error: "not_allowed" }, 403);
  const { count } = await admin.from("user_legal_acceptance").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return json({ ok: true, already: true });

  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim().slice(0, 64);
  const { error } = await admin.from("user_legal_acceptance").insert({
    user_id: userId, terms_version: terms, privacy_version: privacy,
    ip_address: ip || null, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500),
  });
  if (error) return json({ error: "save_failed" }, 500);
  return json({ ok: true });
});
