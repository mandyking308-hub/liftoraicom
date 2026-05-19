import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const u = new URL(req.url);
  const business_id = u.searchParams.get("business_id");
  if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);

  const count = async (t:string, f?: (q:any)=>any) => {
    let q:any = a.admin.from(t).select("*", { count:"exact", head:true }).eq("business_id", business_id);
    if (f) q = f(q);
    const { count: c } = await q; return c ?? 0;
  };
  const calendars_count = await count("social_calendars");
  const active_calendars_count = await count("social_calendars", (q)=>q.in("calendar_status",["draft","needs_review","approved_internal","ready_for_queue_review"]));
  const calendar_items_count = await count("social_calendar_items");
  const items_needing_review = await count("social_calendar_items", (q)=>q.in("status",["needs_review","needs_asset","needs_content"]));
  const items_blocked = await count("social_calendar_items", (q)=>q.eq("status","blocked"));
  const items_ready_for_queue_review = await count("social_calendar_items", (q)=>q.in("queue_readiness",["ready_for_review","ready_for_queue"]));
  const cadence_rules_count = await count("social_calendar_cadence_rules", (q)=>q.eq("rule_status","active"));
  const gap_reviews_open = await count("social_calendar_gap_reviews", (q)=>q.eq("status","open"));
  const critical_gaps = await count("social_calendar_gap_reviews", (q)=>q.eq("status","open").eq("severity","critical"));
  const missing_assets_count = await count("social_calendar_items", (q)=>q.eq("asset_status","missing"));
  const compliance_blocked_count = await count("social_calendar_items", (q)=>q.eq("compliance_status","blocked"));
  return json({ ok:true,
    calendars_count, active_calendars_count, calendar_items_count,
    items_needing_review, items_blocked, items_ready_for_queue_review,
    cadence_rules_count, gap_reviews_open, critical_gaps,
    missing_assets_count, compliance_blocked_count,
    ready_for_approval_flow: items_needing_review > 0,
    ready_for_publish_queue: items_ready_for_queue_review > 0 && items_blocked === 0,
    no_external_action: true,
  });
});
