import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Input {
  business_id?: string | null;
  contact_id?: string | null;
  market_key?: string | null;
  action_type?: string | null;
}

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nowInTz(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, weekday: "long",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return {
    weekday: (parts.weekday ?? "").toLowerCase(),
    hour: Number(parts.hour ?? "0"),
    minute: Number(parts.minute ?? "0"),
    iso_local: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function inWindow(h: number, m: number, start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const cur = h * 60 + m;
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s <= e) return cur >= s && cur < e;
  return cur >= s || cur < e; // wraps midnight
}

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

    let market: any = null;
    if (input.market_key) {
      const { data } = await admin.from("global_market_profiles").select("*").eq("market_key", input.market_key).maybeSingle();
      market = data;
    }
    let contactTz: any = null;
    if (input.contact_id) {
      const { data } = await admin
        .from("contact_timezone_profiles")
        .select("*")
        .eq("contact_id", input.contact_id)
        .maybeSingle();
      contactTz = data;
      if (contactTz?.detected_country && !market) {
        const { data: m } = await admin
          .from("global_market_profiles")
          .select("*")
          .eq("country_code", contactTz.detected_country)
          .limit(1)
          .maybeSingle();
        market = m;
      }
    }
    if (!market) {
      const { data } = await admin.from("global_market_profiles").select("*").eq("market_key", "uk").maybeSingle();
      market = data;
    }

    const tz = contactTz?.detected_timezone ?? market?.default_timezone ?? "Europe/London";
    const now = nowInTz(tz);
    const businessDays: string[] = (market?.business_days ?? []).map((d: string) => d.toLowerCase());
    const isBusinessDay = businessDays.includes(now.weekday);

    const start = (market?.business_start_time ?? "09:00").slice(0, 5);
    const end = (market?.business_end_time ?? "17:00").slice(0, 5);
    const quietStart = (market?.quiet_hours_start ?? "20:00").slice(0, 5);
    const quietEnd = (market?.quiet_hours_end ?? "08:00").slice(0, 5);

    const inBusiness = isBusinessDay && inWindow(now.hour, now.minute, start, end);
    const inQuiet = inWindow(now.hour, now.minute, quietStart, quietEnd);

    const blockers: string[] = [];
    if (!isBusinessDay) blockers.push(`Non-business day (${now.weekday}).`);
    if (!inBusiness) blockers.push("Outside business hours.");
    if (inQuiet) blockers.push("Within quiet hours.");

    // Recommendations
    function nextBusinessOpen() {
      // simple: today if before start and business day; else next business day at start
      const offsets: string[] = [];
      const startIdx = DAY_KEYS.indexOf(now.weekday);
      for (let i = 0; i < 8; i++) {
        const day = DAY_KEYS[(startIdx + i) % 7];
        if (businessDays.includes(day)) {
          if (i === 0 && now.hour * 60 + now.minute < Number(start.split(":")[0]) * 60 + Number(start.split(":")[1])) {
            return { in_days: 0, day, time: start };
          }
          if (i > 0) return { in_days: i, day, time: start };
        }
      }
      return { in_days: 1, day: businessDays[0] ?? "monday", time: start };
    }

    const externalWindow = inBusiness && !inQuiet ? { status: "open_now", day: now.weekday, time: `${start}-${end}` } : nextBusinessOpen();

    return new Response(JSON.stringify({
      market: market ? { key: market.market_key, name: market.market_name, tz: market.default_timezone } : null,
      timezone: tz,
      local_time: now.iso_local,
      weekday: now.weekday,
      market_status: inBusiness && !inQuiet ? "open" : "closed",
      is_business_day: isBusinessDay,
      in_business_hours: inBusiness,
      in_quiet_hours: inQuiet,
      next_safe_internal_action: { allowed_now: true, note: "Internal actions are not time-gated." },
      next_safe_external_window: externalWindow,
      blockers,
      action_type: input.action_type ?? null,
      contact_timezone_resolved: contactTz?.detected_timezone ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});