import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "CREATE PAID MEDIA BUDGET GUARD";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id || !body.guard_name) return json({ ok: false, error: "missing_required_fields" }, 400);
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, safety: SAFETY_FLAGS });
  const { data, error } = await a.admin.from("paid_media_budget_guards").insert({
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null,
    guard_name: body.guard_name, currency: body.currency ?? "GBP",
    total_budget_cap: body.total_budget_cap ?? null, daily_budget_cap: body.daily_budget_cap ?? null,
    weekly_budget_cap: body.weekly_budget_cap ?? null, monthly_budget_cap: body.monthly_budget_cap ?? null,
    test_budget_cap: body.test_budget_cap ?? null,
    max_cac_target: body.max_cac_target ?? null, max_cpl_target: body.max_cpl_target ?? null,
    min_roas_target: body.min_roas_target ?? null, stop_loss_rules: body.stop_loss_rules ?? [],
    risk_level: body.risk_level ?? "high", assumptions: body.assumptions ?? [], caveats: body.caveats ?? [],
    is_test_data: !!body.is_test_data,
  }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, budget_guard_id: data.id, action: "budget_guard_created", after_json: data });
  return json({ ok: true, guard: data, safety: SAFETY_FLAGS });
});
