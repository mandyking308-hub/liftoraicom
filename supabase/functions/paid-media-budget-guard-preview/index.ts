import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const total = Number(body.total_budget_cap ?? 0);
  const daily = Number(body.daily_budget_cap ?? (total ? total / 30 : 0));
  return json({
    ok: true, no_records_mutated: true,
    proposed: {
      total_budget_cap: total || null, daily_budget_cap: daily || null,
      stop_loss_rules: [
        { rule: "pause_if_no_conversions_after_spend", threshold: total ? total * 0.25 : null },
        { rule: "pause_if_cac_exceeds_target", threshold: body.max_cac_target ?? null },
      ],
      founder_approval_required: true, approval_required_for_spend: true,
    },
    caveats: ["Liftor cannot enforce spend. Operator must apply caps in ad platform manually."],
    safety: SAFETY_FLAGS,
  });
});
