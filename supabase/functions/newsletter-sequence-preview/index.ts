import { corsHeaders, json, requireFounder, SAFETY_FLAGS, complianceWarnings } from "../_shared/longformContentLogic.ts";
function defaultSequence(type: string, count: number) {
  const goals: Record<string,string[]> = {
    welcome: ["Welcome + set expectations","Share top resource","Soft CTA","Story/proof","Direct invite"],
    nurture: ["Teach core idea","Show transformation","Common objection","Story","Soft offer"],
    onboarding: ["Activate account","First win","Common pitfalls","Power feature","Ask for feedback"],
    win_back: ["Empathy + we miss you","What's new","Story","Limited offer (manual)","Final goodbye"],
    upsell: ["Show usage","Reveal next tier","Story","Risk reversal","Direct invite"],
    retention: ["Celebrate progress","Tip","Behind the scenes","Community spotlight","Renewal nudge"],
    customer_success: ["Adoption tip","Advanced tip","Power case","Roadmap teaser","Office hours invite"],
    education_series: ["Foundations","Method","Worked example","Pitfalls","Next step"],
    newsletter_series: ["Insight","Story","Resource","Founder note","CTA"],
    lead_magnet_delivery_later: ["Welcome","Tip 1","Tip 2","Case","Soft offer"],
    other: ["Email 1","Email 2","Email 3","Email 4","Email 5"],
  };
  const base = goals[type] ?? goals.other;
  const n = Math.max(1, Math.min(count || base.length, 12));
  return Array.from({length:n}).map((_,i) => ({ index: i+1, subject_idea: `[${type}] ${base[i % base.length]}`, email_goal: base[i % base.length], cadence_note: i === 0 ? "send immediately on signup (external tool)" : `+${i*2} days` }));
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, sequence_type = "nurture", email_count = 5, target_audience, sequence_goal } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  return json({
    ok: true, no_records_mutated: true,
    sequence: {
      sequence_type, target_audience: target_audience ?? null, sequence_goal: sequence_goal ?? null,
      sequence_outline: defaultSequence(sequence_type, email_count),
      cadence_notes: "Every 2-3 days; adjust externally in your email tool.",
      compliance_warnings: complianceWarnings("newsletter"),
      risk_flags: ["No email send — internal draft only"],
    },
    safety: SAFETY_FLAGS,
  });
});