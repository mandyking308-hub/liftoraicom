// Founder/admin-only read-only bridge to the private Kindness Habits aggregate feed.
// No personal data, database writes, provider mutations, email or activation.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { founderGuard } from "../_shared/founderGuard.ts";
import {
  KINDNESS_HABITS_BUSINESS_ID,
  KINDNESS_HABITS_FEED_URL,
  parseKindnessHabitsSummary,
} from "../_shared/kindnessHabitsFeed.ts";

const cors = {
  ...corsHeaders,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const denied = await founderGuard(req, cors);
  if (denied) return denied;
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const businessId = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).business_id
    : null;
  if (businessId !== KINDNESS_HABITS_BUSINESS_ID) {
    return json({ ok: false, error: "business_not_connected" }, 403);
  }

  const feedKey = (Deno.env.get("LIFTOR_FEED_KEY") ?? "").trim();
  if (!feedKey) return json({ ok: false, error: "feed_key_not_configured" }, 503);

  let upstream: Response;
  try {
    upstream = await fetch(KINDNESS_HABITS_FEED_URL, {
      method: "GET",
      headers: { "x-liftor-feed-key": feedKey, "Accept": "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return json({ ok: false, error: "feed_unavailable" }, 502);
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return json({ ok: false, error: "feed_key_rejected" }, 502);
  }
  if (!upstream.ok) return json({ ok: false, error: "feed_unavailable" }, 502);

  let raw: unknown;
  try {
    const text = await upstream.text();
    if (text.length > 65536) return json({ ok: false, error: "invalid_feed_response" }, 502);
    raw = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_feed_response" }, 502);
  }

  const parsed = parseKindnessHabitsSummary(raw);
  if (!parsed.ok) return json({ ok: false, error: "invalid_feed_response" }, 502);

  return json({
    ok: true,
    business_id: KINDNESS_HABITS_BUSINESS_ID,
    source: "Kindness Habits",
    summary: parsed.summary,
  });
});
