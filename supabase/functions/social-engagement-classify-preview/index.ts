import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { classifyText, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, engagement_event_id, limit = 25 } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  let q = (a.admin as any).from("social_engagement_events").select("*").eq("business_id", business_id);
  if (engagement_event_id) q = q.eq("id", engagement_event_id);
  else q = q.in("event_status", ["captured", "classified"]).order("created_at", { ascending: false }).limit(Math.min(100, Number(limit) || 25));
  const { data } = await q;
  const previews = (data ?? []).map((e: any) => ({ id: e.id, message_text: e.message_text, platform: e.platform, classification: classifyText(e.message_text, e.detected_keyword) }));
  return json({ ok: true, no_records_mutated: true, count: previews.length, previews, ...SAFETY_FLAGS });
});