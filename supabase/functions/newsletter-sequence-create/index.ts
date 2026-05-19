import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS, complianceWarnings, genericOutline } from "../_shared/longformContentLogic.ts";
const PHRASE = "CREATE NEWSLETTER SEQUENCE PLAN";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, sequence_name, sequence_type = "nurture", email_count = 5, sequence_outline, create_draft_emails = false, dry_run = true, confirmation_phrase, is_test_data = false, ...rest } = body;
  if (!business_id || !sequence_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  }
  const outline = sequence_outline ?? Array.from({length: Math.max(1, Math.min(email_count,12))}).map((_,i) => ({ index: i+1, subject_idea: `${sequence_type} email ${i+1}`, email_goal: "internal draft", cadence_note: i === 0 ? "on signup" : `+${i*2} days` }));
  const { data: seq, error } = await a.admin.from("newsletter_sequence_plans").insert({
    business_id, sequence_name, sequence_type, email_count: outline.length,
    strategy_id: rest.strategy_id ?? null,
    target_audience: rest.target_audience ?? null,
    sequence_goal: rest.sequence_goal ?? null,
    linked_funnel_strategy_id: rest.linked_funnel_strategy_id ?? null,
    linked_lead_magnet_id: rest.linked_lead_magnet_id ?? null,
    cadence_notes: rest.cadence_notes ?? "every 2-3 days, manual configuration",
    sequence_outline: outline,
    compliance_warnings: complianceWarnings("newsletter"),
    risk_flags: ["No email send — internal only"],
    founder_notes: rest.founder_notes ?? null,
    is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  let drafts_created = 0;
  if (create_draft_emails && seq?.id) {
    const rows = outline.map((o: any) => ({
      business_id, strategy_id: rest.strategy_id ?? null,
      draft_title: o.subject_idea ?? `${sequence_name} #${o.index}`,
      draft_type: "newsletter_sequence_email",
      section_json: genericOutline("newsletter_sequence_email", o.email_goal ?? ""),
      proof_placeholders: ["[CUSTOMER_STORY_PLACEHOLDER]"],
      compliance_warnings: complianceWarnings("newsletter_sequence_email"),
      is_test_data,
      metadata: { newsletter_sequence_id: seq.id, sequence_index: o.index },
    }));
    const { data: ins } = await a.admin.from("longform_content_drafts").insert(rows).select("id");
    drafts_created = ins?.length ?? 0;
  }
  await logAudit(a.admin, { business_id, sequence_id: seq?.id, action: "newsletter_sequence_created", after_json: seq ?? {}, result_json: { drafts_created }, is_test_data });
  return json({ ok: true, sequence: seq, drafts_created, safety: SAFETY_FLAGS });
});