import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id");
  if (!business_id && (req.method === "POST")) { try { const b = await req.json(); business_id = b.business_id ?? null; } catch {} }
  const where = (q: any) => business_id ? q.eq("business_id", business_id) : q;
  const count = async (table: string, extra?: (q: any) => any) => {
    let q: any = (a.admin as any).from(table).select("id", { count: "exact", head: true });
    q = where(q); if (extra) q = extra(q);
    const { count: c } = await q; return c ?? 0;
  };
  const keyword_rules_total = await count("social_keyword_trigger_rules");
  const keyword_rules_approved = await count("social_keyword_trigger_rules", q => q.in("rule_status", ["approved_internal", "manually_configured"]));
  const dm_flows_total = await count("social_dm_flow_blueprints");
  const dm_flows_approved = await count("social_dm_flow_blueprints", q => q.eq("approval_status", "approved"));
  const manual_exports_total = await count("social_manychat_manual_exports");
  const manually_configured_count = await count("social_manychat_manual_exports", q => q.eq("manual_setup_status", "manually_configured"));
  const manually_live_count = await count("social_manychat_manual_exports", q => q.eq("manual_setup_status", "manually_live"));
  const validation_failed_count = await count("social_manychat_manual_exports", q => q.eq("validation_status", "failed"));
  const blocked_flows = await count("social_dm_flow_blueprints", q => q.eq("flow_status", "blocked"));
  return json({
    ok: true,
    keyword_rules_total, keyword_rules_approved,
    dm_flows_total, dm_flows_approved,
    manual_exports_total, manually_configured_count, manually_live_count,
    validation_failed_count, blocked_flows,
    provider_calls_total: 0, dms_sent_total: 0, comments_sent_total: 0,
    ready_for_manual_setup: dm_flows_approved > 0 && manual_exports_total > 0,
    no_external_action: true, ...SAFETY_FLAGS,
  });
});