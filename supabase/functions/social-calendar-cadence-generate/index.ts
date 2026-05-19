import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { DEFAULT_PLATFORMS, NEONCANDY_DEFAULTS, defaultTimesForPlatform } from "../_shared/socialCalendarLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "CREATE SOCIAL CADENCE RULES") return json({ ok:false, error:"confirmation_required" }, 400);
  const platforms = body.platforms?.length ? body.platforms : DEFAULT_PLATFORMS;
  const { data: biz } = await a.admin.from("businesses").select("name").eq("id", business_id).maybeSingle();
  const isNeon = (biz?.name ?? "").toLowerCase().includes("neoncandy");
  const proposed = platforms.map((p:string)=>({
    business_id, platform:p, rule_name:`${p} default cadence`,
    rule_status:"active", source: isNeon ? "social_brain":"generated",
    preferred_times: (isNeon && NEONCANDY_DEFAULTS[p]) ? NEONCANDY_DEFAULTS[p].map(s=>s.time) : defaultTimesForPlatform(p),
    posts_per_day: isNeon && NEONCANDY_DEFAULTS[p] ? NEONCANDY_DEFAULTS[p].length : null,
    is_test_data: !!body.is_test_data,
  }));
  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, proposed });
  const { data, error } = await a.admin.from("social_calendar_cadence_rules").insert(proposed).select("id");
  if (error) return json({ ok:false, error: error.message }, 500);
  return json({ ok:true, saved: data?.length ?? 0, no_external_action:true });
});
