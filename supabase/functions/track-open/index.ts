// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PIXEL = Uint8Array.from([
  0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,0x01,0x00,0x80,0x00,0x00,
  0xff,0xff,0xff,0x00,0x00,0x00,0x21,0xf9,0x04,0x01,0x00,0x00,0x00,
  0x00,0x2c,0x00,0x00,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0x02,0x02,
  0x44,0x01,0x00,0x3b,
]);

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
  try {
    const url = new URL(req.url);
    const t = url.searchParams.get("t"); // tracking_token
    const q = url.searchParams.get("q"); // queue_id (optional)
    if (t || q) {
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
        event_type: "open",
        ip_hash: ip ? await sha256(ip) : null,
        user_agent_hash: ua ? await sha256(ua) : null,
        source: "pixel",
        metadata: { token_present: !!t, queue_param: !!q },
      });
    }
  } catch (_) { /* never fail the pixel */ }
  return new Response(PIXEL, {
    headers: {
      ...cors,
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
});