import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
const PHRASE = "CONFIRM MANYCHAT MANUAL SETUP";
const LIVE_PHRASE = "CONFIRM MANYCHAT FLOW IS LIVE";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_id, flow_id, keyword_rule_id, confirmation_notes, mark_live = false, dry_run = true, confirmation_phrase, live_confirmation_phrase } = body;
  if (!business_id || (!export_id && !flow_id && !keyword_rule_id)) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE || (mark_live && live_confirmation_phrase !== LIVE_PHRASE)) {
    return json({
      ok: true, dry_run: true, would_mark_live: mark_live,
      phrase_required: PHRASE, live_phrase_required: mark_live ? LIVE_PHRASE : null,
      no_records_mutated: true, ...SAFETY_FLAGS,
    });
  }
  const setupStatus = mark_live ? "manually_live" : "manually_configured";
  const flowStatus = mark_live ? "manually_live" : "manually_configured";
  const updates: any[] = [];
  if (export_id) {
    const patch: any = { manual_setup_status: setupStatus, founder_notes: confirmation_notes ?? null };
    if (mark_live) { patch.confirmed_live_at = new Date().toISOString(); patch.confirmed_live_by = a.user.email ?? a.user.id; }
    const { data } = await a.admin.from("social_manychat_manual_exports").update(patch).eq("id", export_id).eq("business_id", business_id).select().maybeSingle();
    updates.push({ table: "manual_exports", row: data });
  }
  if (flow_id) {
    const { data } = await a.admin.from("social_dm_flow_blueprints").update({ flow_status: flowStatus }).eq("id", flow_id).eq("business_id", business_id).select().maybeSingle();
    updates.push({ table: "dm_flow_blueprints", row: data });
  }
  if (keyword_rule_id) {
    const { data } = await a.admin.from("social_keyword_trigger_rules").update({ rule_status: "manually_configured" }).eq("id", keyword_rule_id).eq("business_id", business_id).select().maybeSingle();
    updates.push({ table: "keyword_trigger_rules", row: data });
  }
  await a.admin.from("social_engagement_flow_audit").insert({
    business_id, export_id: export_id ?? null, flow_id: flow_id ?? null, keyword_rule_id: keyword_rule_id ?? null,
    action: mark_live ? "manual_live_confirmed" : "manual_setup_confirmed", action_status: "recorded",
    after_json: { updates, notes: confirmation_notes }, ...SAFETY_FLAGS,
  });
  return json({ ok: true, updates, ...SAFETY_FLAGS, customer_engagement_claimed: false });
});