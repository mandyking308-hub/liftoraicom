import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id) return json({ ok: false, error: "business_id required" }, 400);
  const dry_run = b.dry_run !== false;

  const [{ data: reqs }, { data: assets }] = await Promise.all([
    admin.from("social_asset_requirements").select("*").eq("business_id", b.business_id).neq("status","archived"),
    admin.from("social_assets").select("id,asset_type,approved_for_social,rights_status,is_test_data").eq("business_id", b.business_id),
  ]);

  const decisions: any[] = [];
  for (const r of reqs ?? []) {
    const matches = (assets ?? []).filter((a: any) =>
      a.asset_type === r.asset_type && !a.is_test_data);
    const approved = matches.find((a: any) => a.approved_for_social && a.rights_status !== "blocked");
    const any = matches[0];
    let newStatus = "missing";
    let matched_asset_id: string | null = null;
    if (approved) { newStatus = "met"; matched_asset_id = approved.id; }
    else if (any) { newStatus = "partially_met"; matched_asset_id = any.id; }
    decisions.push({ id: r.id, requirement_name: r.requirement_name, old_status: r.status, new_status: newStatus, matched_asset_id });
  }

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, decisions, total: decisions.length });
  if (b.confirmation_phrase !== "MATCH SOCIAL ASSET REQUIREMENTS")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "MATCH SOCIAL ASSET REQUIREMENTS" }, 400);

  let updated = 0;
  for (const d of decisions) {
    const { error } = await admin.from("social_asset_requirements")
      .update({ status: d.new_status, matched_asset_id: d.matched_asset_id })
      .eq("id", d.id);
    if (!error) updated++;
  }
  return json({ ok: true, updated, decisions });
});
