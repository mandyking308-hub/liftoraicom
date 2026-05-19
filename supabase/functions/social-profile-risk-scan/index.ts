import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildSocialOperatingProfile } from "../_shared/socialProfileGenerator.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireFounder(req);
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  const dry_run = body.dry_run !== false;

  const [{ data: brain }, { data: sources }] = await Promise.all([
    admin.from("business_social_brain_profiles").select("*").eq("business_id", business_id).maybeSingle(),
    admin.from("business_social_knowledge_sources")
      .select("id,source_type,title,pasted_text,summary,approved_for_social_training")
      .eq("business_id", business_id),
  ]);

  const generated = buildSocialOperatingProfile({
    business_id, brain,
    sources: (sources ?? []).filter((s: any) => s.approved_for_social_training !== false),
  });
  const flags = generated.risk_flags;

  if (dry_run) {
    return json({
      ok: true, dry_run: true, no_records_mutated: true,
      detected: flags.length, sensitive_sectors: generated.sensitive_sectors, risk_flags: flags,
    });
  }
  if (body.confirmation_phrase !== "SAVE SOCIAL RISK FLAGS")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "SAVE SOCIAL RISK FLAGS" }, 400);

  const rows = flags.map((r: any) => ({
    business_id, risk_type: r.risk_type, risk_level: r.risk_level,
    risk_description: r.risk_description, affected_platforms: r.affected_platforms ?? [],
    suggested_guardrail: r.suggested_guardrail,
    founder_review_required: r.founder_review_required ?? true,
    legal_review_required: r.legal_review_required ?? false,
  }));
  const saved = rows.length
    ? (await admin.from("business_social_risk_flags").insert(rows).select("id")).data?.length ?? 0
    : 0;
  return json({ ok: true, dry_run: false, saved, sensitive_sectors: generated.sensitive_sectors });
});