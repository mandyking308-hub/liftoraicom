import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Input {
  contact_id?: string | null;
  business_id?: string | null;
  campaign_key?: string | null;
  jurisdiction_code?: string | null;
  last_interaction_at?: string | null;
  contact_status?: string | null;
}

const STAGE_HOURS: Record<string, number[]> = {
  new: [24, 72, 168],
  engaged: [12, 48, 120],
  warm: [6, 24, 72],
  cold: [168, 336, 720],
  unresponsive: [336, 720],
  replied: [2, 8, 24],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = (await req.json().catch(() => ({}))) as Input;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let contactTz: any = null;
    if (input.contact_id) {
      const { data } = await admin
        .from("contact_timezone_profiles")
        .select("*")
        .eq("contact_id", input.contact_id)
        .maybeSingle();
      contactTz = data;
    }

    const tz = contactTz?.detected_timezone ?? "Europe/London";
    const status = (input.contact_status ?? "new").toLowerCase();
    const cadence = STAGE_HOURS[status] ?? STAGE_HOURS.new;

    const lastTs = input.last_interaction_at ? new Date(input.last_interaction_at).getTime() : Date.now();
    const recommendations = cadence.map((h, i) => ({
      step: i + 1,
      offset_hours: h,
      earliest_at_utc: new Date(lastTs + h * 3600 * 1000).toISOString(),
      timezone: tz,
      note: i === 0 ? "first follow-up" : i === cadence.length - 1 ? "final attempt" : "mid-cycle nudge",
    }));

    return new Response(JSON.stringify({
      contact_id: input.contact_id ?? null,
      business_id: input.business_id ?? null,
      campaign_key: input.campaign_key ?? null,
      jurisdiction_code: input.jurisdiction_code ?? null,
      contact_status: status,
      timezone: tz,
      cadence_hours: cadence,
      recommendations,
      queue_mutated: false,
      send_triggered: false,
      note: "Recommendation only. No queue mutation, no send.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});