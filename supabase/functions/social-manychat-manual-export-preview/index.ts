import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { operatorChecklist, validateFlow, SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, flow_id, keyword_rule_id } = body;
  if (!business_id || !flow_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: flow } = await a.admin.from("social_dm_flow_blueprints").select("*").eq("id", flow_id).eq("business_id", business_id).maybeSingle();
  if (!flow) return json({ ok: false, error: "flow_not_found" }, 404);
  const { data: steps } = await a.admin.from("social_dm_flow_steps").select("*").eq("flow_id", flow_id).order("step_order");
  const { data: kw } = keyword_rule_id
    ? await a.admin.from("social_keyword_trigger_rules").select("*").eq("id", keyword_rule_id).maybeSingle()
    : { data: null as any };
  const validation = validateFlow(flow, steps ?? [], true);
  const copy_blocks = [
    { type: "keyword", value: kw?.keyword ?? null },
    { type: "public_reply", value: flow.public_reply_text },
    { type: "dm_opening", value: flow.dm_opening_text },
    { type: "button", value: { label: flow.button_label, url: flow.button_url } },
    { type: "follow_up", value: flow.follow_up_question },
    { type: "qualification", value: flow.qualification_questions ?? [] },
    { type: "opt_out", value: "Reply STOP to opt out." },
  ];
  const instructions = [
    `Open ManyChat (or chosen tool) for ${flow.platform}.`,
    `Create a keyword trigger using: ${kw?.keyword ?? "<no keyword linked>"}`,
    `Paste the public reply, DM opening, button and follow-up below.`,
    `Configure escalation routing to founder/operator.`,
    `Test in sandbox before enabling.`,
    `Return to Liftor and confirm manual setup once complete.`,
  ].join("\n");
  return json({
    ok: true, dry_run: true,
    setup_instructions: instructions, copy_blocks,
    checklist: operatorChecklist(),
    validation,
    no_records_mutated: true, ...SAFETY_FLAGS,
  });
});