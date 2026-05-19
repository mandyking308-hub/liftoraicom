import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { validateFlow, SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
const PHRASE = "VALIDATE SOCIAL DM FLOW";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, flow_id, dry_run = true, confirmation_phrase, require_export = false } = body;
  if (!business_id || !flow_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: flow } = await a.admin.from("social_dm_flow_blueprints").select("*").eq("id", flow_id).eq("business_id", business_id).maybeSingle();
  if (!flow) return json({ ok: false, error: "flow_not_found" }, 404);
  const { data: steps } = await a.admin.from("social_dm_flow_steps").select("*").eq("flow_id", flow_id).order("step_order");
  const result = validateFlow(flow, steps ?? [], require_export);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, validation: result, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  await a.admin.from("social_engagement_flow_audit").insert({
    business_id, flow_id, action: "validation_run", action_status: result.status,
    result_json: result, ...SAFETY_FLAGS,
  });
  return json({ ok: true, validation: result, ...SAFETY_FLAGS });
});