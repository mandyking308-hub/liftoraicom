import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

const clean = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Service configuration unavailable" }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Honeypot: legitimate forms leave this field empty.
  if (clean(body.website_confirm, 200)) return json({ ok: true });

  const type = clean(body.type, 30);
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = req.headers.get("user-agent") || "unknown";
  const rateKey = `public-intake:${await sha256(`${forwarded}|${agent}`)}`;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: allowed, error: rateError } = await admin.rpc("gr_take_rate_limit", {
    p_rate_key: rateKey,
    p_window_seconds: 900,
    p_limit: 8,
  });
  if (rateError) {
    console.error("Giving Rail intake rate-limit failure", rateError.message);
    return json({ error: "Unable to process request" }, 503);
  }
  if (!allowed) return json({ error: "Too many requests. Please try again later." }, 429);

  if (type === "pilot_lead") {
    const name = clean(body.name, 120);
    const email = clean(body.email, 254).toLowerCase();
    const organization = clean(body.organization, 180);
    const role = clean(body.role, 80);
    const consent = body.consent === true;

    if (name.length < 2 || !emailOk(email)) return json({ error: "Name and valid email are required" }, 400);
    if (!consent) return json({ error: "Consent is required" }, 400);

    const { error } = await admin.from("gr_pilot_leads").insert({
      name,
      email,
      organization: organization || null,
      role: role || null,
      source: "website",
      consent_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Giving Rail pilot lead insert failed", error.message);
      return json({ error: "Unable to save pilot interest" }, 500);
    }

    return json({ ok: true });
  }

  if (type === "complaint") {
    const email = clean(body.email, 254).toLowerCase();
    const category = clean(body.category, 80);
    const subject = clean(body.subject, 180);
    const details = clean(body.details, 5000);
    if (!emailOk(email) || category.length < 2 || subject.length < 3 || details.length < 10) {
      return json({ error: "Email, category, subject and complaint details are required" }, 400);
    }

    const reference = `GR-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { error } = await admin.from("gr_complaints").insert({
      reference,
      complainant_email: email,
      category,
      subject,
      details,
      status: "received",
    });
    if (error) {
      console.error("Giving Rail complaint insert failed", error.message);
      return json({ error: "Unable to save complaint" }, 500);
    }

    return json({ ok: true, reference });
  }

  return json({ error: "Unsupported intake type" }, 400);
});
