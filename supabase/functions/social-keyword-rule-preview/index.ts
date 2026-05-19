import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { normalizeKeyword, SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, keyword, platform, trigger_type = "comment_keyword", campaign_plan_id, content_item_id, calendar_item_id } = body;
  if (!business_id || !keyword || !platform) return json({ ok: false, error: "missing_fields" }, 400);
  const normalized = normalizeKeyword(keyword);
  const { data: dupes } = await a.admin
    .from("social_keyword_trigger_rules")
    .select("id, keyword, keyword_normalized, platform, rule_status")
    .eq("business_id", business_id)
    .eq("platform", platform)
    .eq("keyword_normalized", normalized);
  const warnings: string[] = [];
  if ((dupes ?? []).length) warnings.push("duplicate_keyword_on_platform");
  const risk: string[] = [];
  if (/refund|guarantee|cure|investment|advice/i.test(keyword)) risk.push("regulated_language_in_keyword");
  return json({
    ok: true, dry_run: true,
    normalized, suggested_public_reply_required: true, suggested_dm_flow_required: true,
    duplicates: dupes ?? [], duplicate_warning: warnings,
    compliance_warnings: risk,
    links: { campaign_plan_id, content_item_id, calendar_item_id },
    no_records_mutated: true, ...SAFETY_FLAGS,
  });
});