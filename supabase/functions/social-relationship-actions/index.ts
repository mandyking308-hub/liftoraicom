import { corsHeaders, json, requireFounder, loadContext, audit, gateAction } from "../_shared/socialRelationshipDb.ts";
import { buildIdempotencyKey, jitterDelaySeconds } from "../_shared/socialRelationshipLogic.ts";
import { renderTemplate, runDueActions } from "../_shared/socialRelationshipRunner.ts";

const SEND_CONFIRMATION = "SEND APPROVED SOCIAL ACTIONS";
const APPROVE_CONFIRMATION = "APPROVE SOCIAL ACTION BATCH";

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
    const context = await loadContext(auth.admin, business_id);
    let query = auth.admin.from("social_relationship_action_queue")
      .select("*, profile:social_relationship_profiles(full_name,company_name,job_title,profile_url)")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(200);
    if (body.status) query = query.eq("action_status", String(body.status));
    const { data } = await query;
    return json({ ok: true, actions: data ?? [], mode: context.mode });
  }

  if (action === "enqueue_from_list") {
    const target_list_id = String(body.target_list_id ?? "");
    const action_type = String(body.action_type ?? "send_invitation");
    const template = String(body.message ?? "");
    const { data: list } = await auth.admin.from("social_relationship_target_lists")
      .select("*").eq("id", target_list_id).eq("business_id", business_id).maybeSingle();
    if (!list) return json({ ok: false, error: "list_not_found" }, 404);
    if (list.status !== "approved") return json({ ok: false, error: "target_list_not_approved" }, 400);
    const accountId = String(list.account_id ?? body.account_id ?? "");
    const { data: account } = await auth.admin.from("social_relationship_accounts")
      .select("*").eq("id", accountId).eq("business_id", business_id).maybeSingle();
    if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    const context = await loadContext(auth.admin, business_id, account.provider, account.id);

    const { data: targets } = await auth.admin.from("social_relationship_targets")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("business_id", business_id).eq("target_list_id", target_list_id)
      .eq("target_status", "approved").limit(500);
    const batch_id = crypto.randomUUID();
    const created: any[] = [];
    let blocked = 0;
    for (const target of targets ?? []) {
      if (target.profile?.business_id !== business_id) { blocked++; continue; }
      const gate = await gateAction(auth.admin, context, {
        business_id, action_type, account, profile: target.profile, target,
        batch_approved: false, connect_then_dm: body.connect_then_dm === true,
        ignore_working_hours: true,
      });
      const idempotency_key = buildIdempotencyKey({
        business_id, account_id: account.id, action_type,
        target_ref: target.profile?.provider_profile_id ?? target.profile_id,
        nonce: batch_id.slice(0, 8),
      });
      const status = gate.decision === "blocked" ? "blocked" : gate.decision === "draft" ? "draft" : "pending_approval";
      if (status === "blocked") blocked++;
      const { data: row } = await auth.admin.from("social_relationship_action_queue").insert({
        business_id, account_id: account.id, target_id: target.id, profile_id: target.profile_id,
        network: account.network, action_type, action_status: status,
        blocked_reason: gate.blockers[0] ?? gate.reasons[0] ?? null,
        payload: { message: template, connect_then_dm: body.connect_then_dm === true },
        rendered_preview: renderTemplate(template, target.profile),
        batch_id, idempotency_key,
      }).select("*").maybeSingle();
      if (row) created.push(row);
    }
    await audit(auth.admin, {
      business_id, account_id: account.id, event: "queue_enqueued", actor: "founder",
      actor_user_id: auth.user.id, detail: { batch_id, created: created.length, blocked, mode: context.mode },
    });
    return json({ ok: true, batch_id, created: created.length, blocked, mode: context.mode, actions: created, external_actions_taken: 0 });
  }

  if (action === "preview") {
    const { data: row } = await auth.admin.from("social_relationship_action_queue")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("id", String(body.action_id ?? "")).eq("business_id", business_id).maybeSingle();
    if (!row) return json({ ok: false, error: "action_not_found" }, 404);
    const { data: account } = await auth.admin.from("social_relationship_accounts")
      .select("*").eq("id", row.account_id).eq("business_id", business_id).maybeSingle();
    const context = await loadContext(auth.admin, business_id, account?.provider ?? "unipile", account?.id ?? null);
    const target = row.target_id
      ? (await auth.admin.from("social_relationship_targets").select("*").eq("id", row.target_id).eq("business_id", business_id).maybeSingle()).data
      : null;
    const gate = await gateAction(auth.admin, context, {
      business_id, action_type: row.action_type, account, profile: row.profile,
      target, batch_approved: Boolean(row.approved_at && row.approved_by),
    });
    return json({ ok: true, action: row, rendered: renderTemplate(row.payload?.message ?? "", row.profile), gate, no_external_action: true });
  }

  if (action === "approve_batch" || action === "approve_actions") {
    if (body.confirmation_phrase !== APPROVE_CONFIRMATION) {
      return json({ ok: false, error: "approval_confirmation_required", confirmation_phrase: APPROVE_CONFIRMATION }, 400);
    }
    const ids: string[] = Array.isArray(body.action_ids) ? body.action_ids.map(String) : [];
    const batch_id = body.batch_id ? String(body.batch_id) : null;
    if (!ids.length && !batch_id) return json({ ok: false, error: "action_ids_or_batch_id_required" }, 400);
    const context = await loadContext(auth.admin, business_id);
    if (!["approval_required", "approved_batch_autopilot"].includes(context.mode)) {
      return json({ ok: false, error: "mode_blocks_approval", mode: context.mode }, 409);
    }
    let selection = auth.admin.from("social_relationship_action_queue").select("*")
      .eq("business_id", business_id).in("action_status", ["pending_approval", "draft", "blocked"]);
    selection = batch_id ? selection.eq("batch_id", batch_id) : selection.in("id", ids);
    const { data: rows } = await selection;
    let approved = 0;
    let blocked = 0;
    let offset = 0;
    for (const row of rows ?? []) {
      const { data: account } = await auth.admin.from("social_relationship_accounts")
        .select("*").eq("id", row.account_id).eq("business_id", business_id).maybeSingle();
      const { data: profile } = row.profile_id
        ? await auth.admin.from("social_relationship_profiles").select("*").eq("id", row.profile_id).eq("business_id", business_id).maybeSingle()
        : { data: null };
      const { data: target } = row.target_id
        ? await auth.admin.from("social_relationship_targets").select("*").eq("id", row.target_id).eq("business_id", business_id).maybeSingle()
        : { data: null };
      const accountContext = await loadContext(auth.admin, business_id, account?.provider ?? "unipile", account?.id ?? null);
      const gate = await gateAction(auth.admin, accountContext, {
        business_id, action_type: row.action_type, account, profile, target,
        batch_approved: true, connect_then_dm: row.payload?.connect_then_dm === true,
        ignore_working_hours: true,
      });
      if (gate.decision !== "ready") {
        blocked++;
        await auth.admin.from("social_relationship_action_queue").update({
          action_status: "blocked", blocked_reason: gate.blockers[0] ?? gate.reasons[0] ?? "approval_gate_blocked",
          updated_at: new Date().toISOString(),
        }).eq("id", row.id).eq("business_id", business_id);
        continue;
      }
      offset += jitterDelaySeconds(accountContext.policy);
      const due = new Date(Date.now() + offset * 1000).toISOString();
      await auth.admin.from("social_relationship_action_queue").update({
        action_status: "ready", approved_by: auth.user.id, approved_at: new Date().toISOString(),
        scheduled_for: due, not_before: due, blocked_reason: null, updated_at: new Date().toISOString(),
      }).eq("id", row.id).eq("business_id", business_id);
      approved++;
    }
    await audit(auth.admin, {
      business_id, event: "queue_approved", event_status: "approval", actor: "founder",
      actor_user_id: auth.user.id, detail: { approved, blocked, batch_id },
    });
    return json({ ok: true, approved, blocked, scheduled_window_seconds: offset, confirmation_phrase_used: true });
  }

  if (action === "cancel") {
    const ids: string[] = Array.isArray(body.action_ids) ? body.action_ids.map(String) : [];
    const { data } = await auth.admin.from("social_relationship_action_queue")
      .update({ action_status: "cancelled", blocked_reason: "founder_cancelled", updated_at: new Date().toISOString() })
      .in("id", ids).eq("business_id", business_id)
      .not("action_status", "in", "(sent,accepted,replied,submission_unknown)").select("id");
    await audit(auth.admin, { business_id, event: "queue_cancelled", actor: "founder", actor_user_id: auth.user.id, detail: { count: data?.length ?? 0 } });
    return json({ ok: true, cancelled: data?.length ?? 0 });
  }

  if (action === "run_due") {
    if (body.confirmation_phrase !== SEND_CONFIRMATION) {
      return json({ ok: false, error: "send_confirmation_required", confirmation_phrase: SEND_CONFIRMATION }, 400);
    }
    const result = await runDueActions(auth.admin, {
      business_id, limit: Number(body.limit ?? 5), actor: "founder", actor_user_id: auth.user.id, unattended: false,
    });
    return json({ ok: true, ...result, confirmation_phrase_used: true });
  }

  if (action === "resolve_unknown") {
    const outcome = String(body.outcome ?? "not_sent");
    const provider_action_id = String(body.provider_action_id ?? "").trim();
    if (outcome === "sent" && !provider_action_id) return json({ ok: false, error: "provider_action_id_required_to_mark_sent" }, 400);
    const { data } = await auth.admin.from("social_relationship_action_queue").update({
      action_status: outcome === "sent" ? "sent" : "dead_letter",
      provider_action_id: outcome === "sent" ? provider_action_id : null,
      completed_at: new Date().toISOString(),
      blocked_reason: outcome === "sent" ? null : "founder_verified_not_sent",
      last_error: outcome === "sent" ? null : "founder_verified_not_sent",
      updated_at: new Date().toISOString(),
    }).eq("id", String(body.action_id ?? "")).eq("business_id", business_id)
      .eq("action_status", "submission_unknown").select("id").maybeSingle();
    await audit(auth.admin, {
      business_id, action_id: body.action_id ?? null, event: "submission_unknown_resolved",
      actor: "founder", actor_user_id: auth.user.id, detail: { outcome, provider_action_id: provider_action_id || null },
    });
    return json({ ok: true, resolved: Boolean(data) });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
