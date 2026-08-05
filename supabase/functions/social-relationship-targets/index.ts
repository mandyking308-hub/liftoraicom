import { corsHeaders, json, requireFounder, audit } from "../_shared/socialRelationshipDb.ts";
import { scoreProfile } from "../_shared/socialRelationshipLogic.ts";

const LIST_APPROVAL = "APPROVE SOCIAL TARGET LIST";
const TARGET_APPROVAL = "APPROVE SOCIAL TARGETS";
const SUPPRESSION_REASONS = new Set(["opt_out","negative_reply","complaint","do_not_contact","client","supplier","duplicate_person","high_risk","manual"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "list");

  if (action === "list") {
    const { data } = await auth.admin.from("social_relationship_target_lists").select("*")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(50);
    return json({ ok: true, lists: data ?? [] });
  }
  if (action === "list_targets") {
    const { data } = await auth.admin.from("social_relationship_targets")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("business_id", business_id).eq("target_list_id", String(body.target_list_id ?? ""))
      .order("score", { ascending: false }).limit(500);
    return json({ ok: true, targets: data ?? [] });
  }

  if (action === "create_list") {
    const account_id = body.account_id ? String(body.account_id) : null;
    let network = String(body.network ?? "linkedin");
    if (account_id) {
      const { data: account } = await auth.admin.from("social_relationship_accounts").select("id,network")
        .eq("id", account_id).eq("business_id", business_id).maybeSingle();
      if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
      network = account.network;
    }
    const { data } = await auth.admin.from("social_relationship_target_lists").insert({
      business_id, name: String(body.name ?? "Untitled list").slice(0, 200), network,
      account_id, objective: body.objective ?? null, status: "draft",
    }).select("*").maybeSingle();
    await audit(auth.admin, { business_id, event: "target_list_created", actor: "founder", actor_user_id: auth.user.id, detail: { list_id: data?.id } });
    return json({ ok: true, list: data });
  }

  if (action === "add_profiles") {
    const target_list_id = String(body.target_list_id ?? "");
    const profile_ids: string[] = Array.isArray(body.profile_ids) ? [...new Set(body.profile_ids.map(String))].slice(0, 500) : [];
    if (!target_list_id || !profile_ids.length) return json({ ok: false, error: "target_list_id_and_profile_ids_required" }, 400);
    const { data: list } = await auth.admin.from("social_relationship_target_lists").select("*")
      .eq("id", target_list_id).eq("business_id", business_id).maybeSingle();
    if (!list) return json({ ok: false, error: "list_not_found" }, 404);
    if (!["draft","pending_approval"].includes(list.status)) return json({ ok: false, error: "approved_or_closed_list_cannot_be_modified" }, 409);
    const { data: profiles } = await auth.admin.from("social_relationship_profiles").select("*")
      .in("id", profile_ids).eq("business_id", business_id);
    let added = 0, skipped = profile_ids.length - (profiles?.length ?? 0);
    for (const profile of profiles ?? []) {
      if (profile.network !== list.network || profile.relationship_status === "blocked") { skipped++; continue; }
      const { data: exists } = await auth.admin.from("social_relationship_targets").select("id")
        .eq("business_id", business_id).eq("target_list_id", target_list_id).eq("profile_id", profile.id).maybeSingle();
      if (exists) { skipped++; continue; }
      const { score, reasons } = scoreProfile(profile, body.criteria ?? {});
      await auth.admin.from("social_relationship_targets").insert({
        business_id, target_list_id, profile_id: profile.id, score, score_reasons: reasons, target_status: "pending",
      });
      added++;
    }
    const { count } = await auth.admin.from("social_relationship_targets").select("id", { count: "exact", head: true })
      .eq("business_id", business_id).eq("target_list_id", target_list_id);
    await auth.admin.from("social_relationship_target_lists").update({
      targets_count: count ?? 0, status: "pending_approval", updated_at: new Date().toISOString(),
    }).eq("id", target_list_id).eq("business_id", business_id);
    await audit(auth.admin, { business_id, event: "target_list_populated", actor: "founder", actor_user_id: auth.user.id, detail: { target_list_id, added, skipped } });
    return json({ ok: true, added, skipped, targets_count: count ?? 0 });
  }

  if (action === "approve_list" || action === "reject_list") {
    const approved = action === "approve_list";
    if (approved && body.confirmation_phrase !== LIST_APPROVAL) return json({ ok: false, error: "confirmation_required", confirmation_phrase: LIST_APPROVAL }, 400);
    const { data } = await auth.admin.from("social_relationship_target_lists").update({
      status: approved ? "approved" : "rejected", approved_by: auth.user.id,
      approved_at: new Date().toISOString(), approval_note: body.note ?? null, updated_at: new Date().toISOString(),
    }).eq("id", String(body.target_list_id ?? "")).eq("business_id", business_id)
      .in("status", ["draft","pending_approval","approved"]).select("*").maybeSingle();
    if (!data) return json({ ok: false, error: "list_not_found_or_not_mutable" }, 404);
    await audit(auth.admin, { business_id, event: approved ? "target_list_approved" : "target_list_rejected", event_status: approved ? "approval" : "override", actor: "founder", actor_user_id: auth.user.id, detail: { target_list_id: data.id } });
    return json({ ok: true, list: data });
  }

  if (action === "approve_targets" || action === "reject_targets") {
    const approved = action === "approve_targets";
    if (approved && body.confirmation_phrase !== TARGET_APPROVAL) return json({ ok: false, error: "confirmation_required", confirmation_phrase: TARGET_APPROVAL }, 400);
    const ids: string[] = Array.isArray(body.target_ids) ? [...new Set(body.target_ids.map(String))].slice(0, 500) : [];
    if (!ids.length) return json({ ok: false, error: "target_ids_required" }, 400);
    const { data } = await auth.admin.from("social_relationship_targets").update({
      target_status: approved ? "approved" : "rejected", approved_by: auth.user.id,
      approved_at: new Date().toISOString(), blocked_reason: approved ? null : String(body.reason ?? "founder_rejected").slice(0, 300),
      updated_at: new Date().toISOString(),
    }).in("id", ids).eq("business_id", business_id).in("target_status", ["pending","approved","rejected"]).select("id");
    await audit(auth.admin, { business_id, event: approved ? "targets_approved" : "targets_rejected", event_status: approved ? "approval" : "override", actor: "founder", actor_user_id: auth.user.id, detail: { count: data?.length ?? 0 } });
    return json({ ok: true, updated: data?.length ?? 0 });
  }

  if (action === "suppress_profile") {
    const reason = String(body.reason ?? "manual");
    if (!SUPPRESSION_REASONS.has(reason)) return json({ ok: false, error: "suppression_reason_invalid" }, 400);
    const provider_profile_id = body.provider_profile_id ? String(body.provider_profile_id) : null;
    const profile_url = body.profile_url ? String(body.profile_url) : null;
    if (!provider_profile_id && !profile_url && !body.email) return json({ ok: false, error: "suppression_identity_required" }, 400);
    const { data: existing } = await auth.admin.from("social_relationship_suppressions").select("*")
      .eq("business_id", business_id).eq("scope", "business")
      .eq("network", body.network ?? null).eq("provider_profile_id", provider_profile_id).maybeSingle();
    if (existing) return json({ ok: true, suppression: existing, deduped: true });
    const { data } = await auth.admin.from("social_relationship_suppressions").insert({
      business_id, scope: "business", network: body.network ?? null,
      provider_profile_id, profile_url, email: body.email ?? null, reason,
      detail: body.detail ?? null, created_by: auth.user.id,
    }).select("*").maybeSingle();
    await audit(auth.admin, { business_id, event: "suppression_added", actor: "founder", actor_user_id: auth.user.id, detail: { reason } });
    return json({ ok: true, suppression: data });
  }

  if (action === "list_suppressions") {
    const { data } = await auth.admin.from("social_relationship_suppressions").select("*")
      .or(`business_id.eq.${business_id},business_id.is.null`).order("created_at", { ascending: false }).limit(200);
    return json({ ok: true, suppressions: data ?? [] });
  }
  return json({ ok: false, error: "unknown_action" }, 400);
});
