import { corsHeaders, json, requireFounder, audit } from "../_shared/socialRelationshipDb.ts";
import { normaliseSuppressionReason, scoreProfile } from "../_shared/socialRelationshipLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req);
  if ("error" in a) return a.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "list");

  if (action === "list") {
    const { data: lists } = await a.admin
      .from("social_relationship_target_lists").select("*").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(50);
    return json({ ok: true, lists: lists ?? [] });
  }

  if (action === "list_targets") {
    const { data } = await a.admin
      .from("social_relationship_targets")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("business_id", business_id).eq("target_list_id", String(body.target_list_id ?? ""))
      .order("score", { ascending: false }).limit(500);
    return json({ ok: true, targets: data ?? [] });
  }

  if (action === "create_list") {
    const { data } = await a.admin.from("social_relationship_target_lists").insert({
      business_id,
      name: String(body.name ?? "Untitled list").slice(0, 200),
      network: String(body.network ?? "linkedin"),
      account_id: body.account_id ?? null,
      objective: body.objective ?? null,
      status: "draft",
    }).select("*").maybeSingle();
    await audit(a.admin, { business_id, event: "target_list_created", actor: "founder", actor_user_id: a.user.id, detail: { list_id: data?.id } });
    return json({ ok: true, list: data });
  }

  if (action === "add_profiles") {
    const target_list_id = String(body.target_list_id ?? "");
    const profile_ids: string[] = Array.isArray(body.profile_ids) ? body.profile_ids.map(String) : [];
    if (!target_list_id || !profile_ids.length) return json({ ok: false, error: "target_list_id_and_profile_ids_required" }, 400);
    const { data: list } = await a.admin.from("social_relationship_target_lists").select("*").eq("id", target_list_id).eq("business_id", business_id).maybeSingle();
    if (!list) return json({ ok: false, error: "list_not_found" }, 404);
    const { data: profiles } = await a.admin.from("social_relationship_profiles").select("*").in("id", profile_ids).eq("business_id", business_id);
    let added = 0, skipped = 0;
    for (const p of profiles ?? []) {
      const { data: exists } = await a.admin.from("social_relationship_targets").select("id").eq("business_id", business_id).eq("target_list_id", target_list_id).eq("profile_id", p.id).maybeSingle();
      if (exists) { skipped++; continue; }
      const { score, reasons } = scoreProfile(p, body.criteria ?? {});
      await a.admin.from("social_relationship_targets").insert({
        business_id, target_list_id, profile_id: p.id, score, score_reasons: reasons, target_status: "pending",
      });
      added++;
    }
    const { count } = await a.admin.from("social_relationship_targets").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("target_list_id", target_list_id);
    await a.admin.from("social_relationship_target_lists").update({ targets_count: count ?? 0 }).eq("id", target_list_id).eq("business_id", business_id);
    await audit(a.admin, { business_id, event: "target_list_populated", actor: "founder", actor_user_id: a.user.id, detail: { target_list_id, added, skipped } });
    return json({ ok: true, added, skipped, targets_count: count ?? 0 });
  }

  if (action === "approve_list" || action === "reject_list") {
    const approved = action === "approve_list";
    const { data } = await a.admin.from("social_relationship_target_lists").update({
      status: approved ? "approved" : "rejected",
      approved_by: a.user.id,
      approved_at: new Date().toISOString(),
      approval_note: body.note ?? null,
    }).eq("id", String(body.target_list_id ?? "")).eq("business_id", business_id).select("*").maybeSingle();
    await audit(a.admin, { business_id, event: approved ? "target_list_approved" : "target_list_rejected", actor: "founder", actor_user_id: a.user.id, detail: { target_list_id: body.target_list_id } });
    return json({ ok: true, list: data });
  }

  if (action === "approve_targets" || action === "reject_targets") {
    const approved = action === "approve_targets";
    const ids: string[] = Array.isArray(body.target_ids) ? body.target_ids.map(String) : [];
    if (!ids.length) return json({ ok: false, error: "target_ids_required" }, 400);
    const { data } = await a.admin.from("social_relationship_targets").update({
      target_status: approved ? "approved" : "rejected",
      approved_by: a.user.id,
      approved_at: new Date().toISOString(),
      blocked_reason: approved ? null : (body.reason ?? "founder_rejected"),
    }).in("id", ids).eq("business_id", business_id).select("id");
    await audit(a.admin, { business_id, event: approved ? "targets_approved" : "targets_rejected", actor: "founder", actor_user_id: a.user.id, detail: { count: (data ?? []).length } });
    return json({ ok: true, updated: (data ?? []).length });
  }

  if (action === "suppress_profile") {
    const { data } = await a.admin.from("social_relationship_suppressions").insert({
      business_id,
      scope: String(body.scope ?? "profile"),
      network: body.network ?? null,
      provider_profile_id: body.provider_profile_id ?? null,
      profile_url: body.profile_url ?? null,
      email: body.email ?? null,
      reason: normaliseSuppressionReason(body.reason),
      detail: body.detail ?? null,
      created_by: a.user.id,
    }).select("*").maybeSingle();
    await audit(a.admin, { business_id, event: "suppression_added", actor: "founder", actor_user_id: a.user.id, detail: { reason: body.reason } });
    return json({ ok: true, suppression: data });
  }

  if (action === "list_suppressions") {
    const { data } = await a.admin
      .from("social_relationship_suppressions")
      .select("*")
      .or(`business_id.eq.${business_id},business_id.is.null`)
      .order("created_at", { ascending: false }).limit(200);
    return json({ ok: true, suppressions: data ?? [] });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
