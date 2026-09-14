import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Temporary founder-only read-only Winnr inspector used to reconcile the GHAT
 * estate against the live provider. Returns sanitised metadata only: no
 * passwords, tokens or credential-shaped fields are ever echoed.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SECRETISH = /(password|token|secret|api_key|apikey|credential)/i;
const sanitize = (o: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (SECRETISH.test(k)) { out[k] = "[redacted]"; continue; }
    out[k] = typeof v === "object" && v !== null ? JSON.stringify(v).slice(0, 200) : v;
  }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const TOKEN = Deno.env.get("WINNR_API_TOKEN") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const path = String(body.path ?? "/domains");
  const query = (body.query ?? {}) as Record<string, string | number>;

  const provider = String(body.provider ?? "winnr");
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? "";
  const url = provider === "smartlead"
    ? new URL(`https://server.smartlead.ai/api/v1${path}`)
    : new URL(`https://api.winnr.app/v1${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  if (provider === "smartlead") url.searchParams.set("api_key", SMARTLEAD_API_KEY);

  const method = String(body.method ?? "GET").toUpperCase();
  const postBody = (body.body ?? {}) as Record<string, unknown>;
  const resp = await fetch(url.toString(), {
    method,
    ...(method === "GET" ? {} : { body: JSON.stringify(postBody) }),
    headers: provider === "smartlead"
      ? { Accept: "application/json" }
      : { Authorization: `Bearer ${TOKEN}`, Accept: "application/json", "Content-Type": "application/json" },
  });
  const text = await resp.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.data)
      ? ((parsed as Record<string, unknown>).data as unknown[])
      : [];

  if (body.probe_csv_headers === true) {
    const dl = (parsed as { data?: { download_url?: string } } | null)?.data?.download_url;
    if (!dl) return json({ ok: false, error: "no_download_url", http_status: resp.status });
    const csv = await (await fetch(dl)).text();
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    return json({
      ok: true,
      header: lines[0] ?? null,
      row_count: Math.max(0, lines.length - 1),
      first_row_field_lengths: (lines[1] ?? "").split(",").map((c) => c.length),
    });
  }

  return json({
    ok: resp.ok,
    http_status: resp.status,
    path,
    query,
    envelope_keys: parsed && !Array.isArray(parsed) ? Object.keys(parsed as Record<string, unknown>) : null,
    envelope_meta: parsed && !Array.isArray(parsed)
      ? sanitize(Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v !== "object")))
      : null,
    raw_envelope: JSON.stringify(parsed).replace(/"[^"]*(password|token|secret)[^"]*"\s*:\s*"[^"]*"/gi, '"[redacted]"').slice(0, 800),
    count: arr.length,
    rows: arr.slice(0, 60).map((r) => sanitize(r as Record<string, unknown>)),
  });
});
