// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const target = url.searchParams.get("u");
  const t = url.searchParams.get("t");
  const q = url.searchParams.get("q");

  if (!target) {
    return new Response(JSON.stringify({ error: "missing u" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  let safe: URL;
  try { safe = new URL(target); } catch {
    return new Response(JSON.stringify({ error: "invalid u" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!["http:", "https:"].includes(safe.protocol)) {
    return new Response(JSON.stringify({ error: "blocked scheme" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let row: any = null;
    if (t) {
      const { data } = await supa.from("email_queue")
        .select("id, contact_id, campaign_id, business_name")
        .eq("tracking_token", t).maybeSingle();
      row = data;
    } else if (q) {
      const { data } = await supa.from("email_queue")
        .select("id, contact_id, campaign_id, business_name")
        .eq("id", q).maybeSingle();
      row = data;
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ua = req.headers.get("user-agent") || "";
    await supa.from("email_tracking_events").insert({
      queue_id: row?.id ?? null,
      contact_id: row?.contact_id ?? null,
      campaign_id: row?.campaign_id ?? null,
      business_name: row?.business_name ?? null,
      event_type: "click",
      link_url: safe.toString(),
      ip_hash: ip ? await sha256(ip) : null,
      user_agent_hash: ua ? await sha256(ua) : null,
      source: "redirect",
    });
  } catch (_) { /* never block redirect */ }

  return new Response(null, { status: 302, headers: { ...cors, Location: safe.toString() } });
});