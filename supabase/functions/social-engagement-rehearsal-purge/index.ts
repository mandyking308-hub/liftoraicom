import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  if (confirmation_phrase !== PHRASES.purge) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.purge }, 400);
  const tables = [
    "social_engagement_reply_drafts","social_engagement_classifications","social_engagement_crm_matches",
    "social_engagement_escalations","social_engagement_audit","social_engagement_import_batches",
  ];
  const deleted: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await (a.admin as any).from(t).delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
    deleted[t] = count ?? 0;
  }
  const { count: ev } = await (a.admin as any).from("social_engagement_events").delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
  deleted["social_engagement_events"] = ev ?? 0;
  return json({ ok: true, deleted, ...SAFETY_FLAGS });
});