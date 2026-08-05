import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { BUSINESS_OBJECTIVES, VIRAL_CONFIRMATIONS, VIRAL_SAFETY_FLAGS, confirmationAccepted } from "../_shared/socialViralLogic.ts";

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 100)
  : typeof v === "string" && v.trim() ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 100)
  : [];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const ad = a.admin as any;
  const b = await req.json().catch(() => ({} as any));
  const business_id = b.business_id;
  const action = b.action ?? "list";
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  if (action === "list") {
    const { data, error } = await ad.from("social_viral_watchlists")
      .select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(200);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, watchlists: data ?? [], ...VIRAL_SAFETY_FLAGS });
  }

  if (action === "create" || action === "update") {
    const w = b.watchlist ?? {};
    if (!w.watchlist_name) return json({ ok: false, error: "watchlist_name_required" }, 400);
    const objective = BUSINESS_OBJECTIVES.includes(w.business_objective) ? w.business_objective : "awareness";
    const row = {
      business_id,
      watchlist_name: String(w.watchlist_name).slice(0, 160),
      niche: w.niche ?? null,
      audience_description: w.audience_description ?? null,
      business_objective: objective,
      geographies: arr(w.geographies),
      languages: arr(w.languages),
      platforms: arr(w.platforms),
      keywords: arr(w.keywords),
      competitor_handles: arr(w.competitor_handles).map((h) => h.replace(/^@/, "")),
      excluded_topics: arr(w.excluded_topics),
      conversion_route: w.conversion_route ?? null,
      watchlist_status: ["active", "paused", "archived"].includes(w.watchlist_status) ? w.watchlist_status : "active",
      is_test_data: !!w.is_test_data,
    };
    if (b.dry_run !== false) {
      return json({ ok: true, dry_run: true, no_records_mutated: true, preview: row, phrase_required: VIRAL_CONFIRMATIONS.create_watchlist, ...VIRAL_SAFETY_FLAGS });
    }
    if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.create_watchlist)) {
      return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.create_watchlist}` }, 400);
    }
    let data: any, error: any;
    if (action === "update" && b.watchlist_id) {
      ({ data, error } = await ad.from("social_viral_watchlists").update(row)
        .eq("id", b.watchlist_id).eq("business_id", business_id).select().maybeSingle());
    } else {
      ({ data, error } = await ad.from("social_viral_watchlists")
        .upsert(row, { onConflict: "business_id,watchlist_name" }).select().maybeSingle());
    }
    if (error) return json({ ok: false, error: error.message }, 500);
    await ad.from("social_viral_audit").insert({
      business_id, actor_user_id: a.user.id, action: `watchlist_${action}d`,
      entity_type: "watchlist", entity_id: data?.id ?? null, after_json: row, is_test_data: row.is_test_data,
    });
    return json({ ok: true, watchlist: data, ...VIRAL_SAFETY_FLAGS });
  }

  if (action === "pause" || action === "resume" || action === "archive") {
    if (!b.watchlist_id) return json({ ok: false, error: "watchlist_id_required" }, 400);
    const status = action === "pause" ? "paused" : action === "resume" ? "active" : "archived";
    const { data, error } = await ad.from("social_viral_watchlists")
      .update({ watchlist_status: status })
      .eq("id", b.watchlist_id).eq("business_id", business_id).select().maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!data) return json({ ok: false, error: "watchlist_not_found_for_business" }, 404);
    await ad.from("social_viral_audit").insert({
      business_id, actor_user_id: a.user.id, action: `watchlist_${status}`,
      entity_type: "watchlist", entity_id: data.id,
    });
    return json({ ok: true, watchlist: data, ...VIRAL_SAFETY_FLAGS });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});