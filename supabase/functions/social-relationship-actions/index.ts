import { corsHeaders, json, requireFounder, loadContext, audit, gateAction } from "../_shared/socialRelationshipDb.ts";
import {
  buildIdempotencyKey,
  confirmationAccepted,
  decisionToStatus,
  externalCallsAllowed,
  jitterDelaySeconds,
  CANCELLABLE_ACTION_STATUSES,
  SEND_CONFIRMATION_PHRASE,
} from "../_shared/socialRelationshipLogic.ts";
import { renderTemplate, runDueActions } from "../_shared/socialRelationshipRunner.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req);
  if ("error" in a) return a.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "list");
  const ctx = await loadContext(a.admin, business_id);

  if (action === "list") {
    let q = a.admin.from("social_relationship_action_queue")
      .select("*, profile:social_relationship_profiles(full_name, company_name, job_title, profile_url)")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(200);
    if (body.status) q = q.eq("action_status", String(body.status));
    const { data } = await q;
    return json({ ok: true, actions: data ?? [], mode: ctx.mode });
  }

  if (action === "enqueue_from_list") {
    const target_list_id = String(body.target_list_id ?? "");
    const action_type = String(body.action_type ?? "send_invitation");
    const template = String(body.message ?? "");
    const { data: list } = await a.admin.from("social_relationship_target_lists")
      .select("*").eq("id", target_list_id).eq("business_id", business_id).maybeSingle();
    if (!list) return json({ ok: false, error: "list_not_found" }, 404);
    if (list.status !== "approved") return json({ ok: false, error: "target_list_not_approved" }, 400);
    const { data: account } = await a.admin.from("social_relationship_accounts")
      .select("*").eq("id", list.account_id ?? body.account_id ?? "").eq("business_id", business_id).maybeSingle();
    if (!account) return json({ ok: false, error: "account_not_found" }, 404);

    const { data: targets } = await a.admin.from("social_relationship_targets")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("business_id", business_id).eq("target_list_id", target_list_id).eq("target_status", "approved").limit(500);

    const batch_id = crypto.randomUUID();
    const created: any[] = [];
    let blocked = 0;
    for (const t of targets ?? []) {
      const gate = await gateAction(a.admin, ctx, {
        business_id, action_type, account, profile: t.profile, target: t, batch_approved: false,
        connect_then_dm: body.connect_then_dm === true, ignore_working_hours: true,
      });
      const idempotency_key = buildIdempotencyKey({
        business_id, account_id: account.id, action_type,
        target_ref: t.profile?.provider_profile_id ?? t.profile_id, nonce: batch_id.slice(0, 8),
      });
      // Canonical vocabulary only. A freshly queued action is NEVER 'ready':
      // it always waits for explicit batch approval.
      const status = gate.decision === "blocked" ? "blocked"
        : gate.decision === "draft" ? decisionToStatus("draft")
        : "pending_approval";
      if (status === "blocked") blocked++;
      const { data: row } = await a.admin.from("social_relationship_action_queue").insert({
        business_id, account_id: account.id, target_id: t.id, profile_id: t.profile_id,
        network: account.network, action_type, action_status: status,
        blocked_reason: gate.blockers[0] ?? null,
        payload: { message: template, connect_then_dm: body.connect_then_dm === true },
        rendered_preview: renderTemplate(template, t.profile),
        batch_id, idempotency_key,
      }).select("*").maybeSingle();
      if (row) created.push(row);
    }
    await audit(a.admin, { business_id, account_id: account.id, event: "queue_enqueued", actor: "founder", actor_user_id: a.user.id, detail: { batch_id, created: created.length, blocked, mode: ctx.mode } });
    return json({ ok: true, batch_id, created: created.length, blocked, mode: ctx.mode, actions: created, external_actions_taken: 0 });
  }

  if (action === "preview") {
    const { data: row } = await a.admin.from("social_relationship_action_queue")
      .select("*, profile:social_relationship_profiles(*)").eq("id", String(body.action_id ?? "")).eq("business_id", business_id).maybeSingle();
    if (!row) return json({ ok: false, error: "action_not_found" }, 404);
    const { data: account } = await a.admin.from("social_relationship_accounts").select("*").eq("id", row.account_id).eq("business_id", business_id).maybeSingle();
    const gate = await gateAction(a.admin, ctx, {
      business_id, action_type: row.action_type, account, profile: row.profile,
      target: row.target_id ? (await a.admin.from("social_relationship_targets").select("*").eq("id", row.target_id).eq("business_id", business_id).maybeSingle()).data : null,
      batch_approved: Boolean(row.approved_at),
    });
    return json({ ok: true, action: row, rendered: renderTemplate(row.payload?.message ?? "", row.profile), gate, no_external_action: true });
  }

  if (action === "approve_batch" || action === "approve_actions") {
    const ids: string[] = Array.isArray(body.action_ids) ? body.action_ids.map(String) : [];
    const batch_id = body.batch_id ? String(body.batch_id) : null;
    if (!ids.length && !batch_id) return json({ ok: false, error: "action_ids_or_batch_id_required" }, 400);
    if (ctx.mode === "test_only" || ctx.mode === "draft_actions") {
      return json({ ok: false, error: "mode_blocks_approval", mode: ctx.mode, hint: "Switch policy mode to approval_required or approved_batch_autopilot." }, 400);
    }
    let sel = a.admin.from("social_relationship_action_queue").select("*").eq("business_id", business_id).in("action_status", ["pending_approval", "draft"]);
    sel = batch_id ? sel.eq("batch_id", batch_id) : sel.in("id", ids);
    const { data: rows } = await sel;
    let approved = 0;
    let offset = 0;
    for (const r of rows ?? []) {
      offset += jitterDelaySeconds(ctx.policy);
      await a.admin.from("social_relationship_action_queue").update({
        action_status: "ready",
        approved_by: a.user.id,
        approved_at: new Date().toISOString(),
        scheduled_for: new Date(Date.now() + offset * 1000).toISOString(),
        not_before: new Date(Date.now() + offset * 1000).toISOString(),
      }).eq("id", r.id).eq("business_id", business_id);
      approved++;
    }
    await audit(a.admin, { business_id, event: "queue_approved", actor: "founder", actor_user_id: a.user.id, detail: { approved, batch_id } });
    return json({ ok: true, approved, scheduled_window_seconds: offset });
  }

  if (action === "cancel") {
    const ids: string[] = Array.isArray(body.action_ids) ? body.action_ids.map(String) : [];
    const { data } = await a.admin.from("social_relationship_action_queue")
      .update({ action_status: "cancelled", blocked_reason: "founder_cancelled" })
      .in("id", ids).eq("business_id", business_id)
      .in("action_status", CANCELLABLE_ACTION_STATUSES).select("id");
    await audit(a.admin, { business_id, event: "queue_cancelled", actor: "founder", actor_user_id: a.user.id, detail: { count: (data ?? []).length } });
    return json({ ok: true, cancelled: (data ?? []).length });
  }

  if (action === "run_due") {
    // Explicit founder confirmation is mandatory before ANYTHING leaves Liftor.
    if (!confirmationAccepted(body.confirmation)) {
      return json({
        ok: false,
        error: "confirmation_required",
        required_phrase: SEND_CONFIRMATION_PHRASE,
        hint: `Type "${SEND_CONFIRMATION_PHRASE}" to dispatch approved actions.`,
      }, 400);
    }
    if (!externalCallsAllowed(ctx.mode)) {
      return json({ ok: false, error: "mode_blocks_external_actions", mode: ctx.mode }, 400);
    }
    await audit(a.admin, { business_id, event: "manual_dispatch_confirmed", event_status: "approval", actor: "founder", actor_user_id: a.user.id, detail: { mode: ctx.mode } });
    const result = await runDueActions(a.admin, {
      business_id, limit: Number(body.limit ?? 5), actor: "founder", actor_user_id: a.user.id,
    });
    return json({ ok: true, ...result });
  }

  if (action === "resolve_unknown") {
    const outcome = String(body.outcome ?? "sent");
    const { data } = await a.admin.from("social_relationship_action_queue").update({
      action_status: outcome === "sent" ? "sent" : "dead_letter",
      completed_at: new Date().toISOString(),
      blocked_reason: outcome === "sent" ? null : "founder_marked_not_sent",
    }).eq("id", String(body.action_id ?? "")).eq("business_id", business_id).eq("action_status", "submission_unknown").select("id").maybeSingle();
    await audit(a.admin, { business_id, action_id: body.action_id ?? null, event: "submission_unknown_resolved", actor: "founder", actor_user_id: a.user.id, detail: { outcome } });
    return json({ ok: true, resolved: Boolean(data) });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
