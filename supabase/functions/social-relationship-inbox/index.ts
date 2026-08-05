import { corsHeaders, json, requireFounder, loadContext, audit, gateAction } from "../_shared/socialRelationshipDb.ts";
import {
  buildIdempotencyKey,
  classifyIntent,
  decideReplyDisposition,
  decisionToStatus,
  detectEscalation,
  externalCallsAllowed,
  jitterDelaySeconds,
} from "../_shared/socialRelationshipLogic.ts";
import { getRelationshipAdapter } from "../_shared/socialRelationshipProvider.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req);
  if ("error" in a) return a.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "list_threads");
  const ctx = await loadContext(a.admin, business_id);

  if (action === "list_threads") {
    const { data } = await a.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(full_name, company_name, job_title, profile_url)")
      .eq("business_id", business_id)
      .order("escalation_pending", { ascending: false })
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    const { data: escalations } = await a.admin.from("social_relationship_escalations")
      .select("*").eq("business_id", business_id).eq("escalation_status", "open").limit(100);
    return json({ ok: true, conversations: data ?? [], escalations: escalations ?? [] });
  }

  if (action === "get_thread") {
    const conversation_id = String(body.conversation_id ?? "");
    const [{ data: conv }, { data: messages }] = await Promise.all([
      a.admin.from("social_relationship_conversations")
        .select("*, profile:social_relationship_profiles(*)").eq("id", conversation_id).eq("business_id", business_id).maybeSingle(),
      a.admin.from("social_relationship_messages").select("*").eq("business_id", business_id).eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true }).limit(200),
    ]);
    if (!conv) return json({ ok: false, error: "conversation_not_found" }, 404);
    return json({ ok: true, conversation: conv, messages: messages ?? [] });
  }

  if (action === "sync_thread") {
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conv } = await a.admin.from("social_relationship_conversations").select("*").eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conv) return json({ ok: false, error: "conversation_not_found" }, 404);
    const { data: account } = await a.admin.from("social_relationship_accounts").select("*").eq("id", conv.account_id).eq("business_id", business_id).maybeSingle();
    if (!account) return json({ ok: false, error: "account_not_found" }, 404);
    if (!externalCallsAllowed(ctx.mode)) {
      return json({ ok: false, error: "mode_blocks_external_actions", mode: ctx.mode, blocked: true }, 400);
    }
    const adapter = getRelationshipAdapter(account.provider);
    const r = await adapter.listMessages(conv.provider_chat_id, 50);
    if (!r.ok) return json({ ok: false, error: r.error, http_status: r.http_status }, 502);
    let imported = 0;
    for (const m of r.data ?? []) {
      const pid = String((m as any).id ?? "");
      if (!pid) continue;
      const { data: exists } = await a.admin.from("social_relationship_messages").select("id").eq("business_id", business_id).eq("provider_message_id", pid).maybeSingle();
      if (exists) continue;
      const isOut = String((m as any).is_sender ?? "0") === "1" || (m as any).direction === "outbound";
      await a.admin.from("social_relationship_messages").insert({
        business_id, conversation_id, network: conv.network,
        direction: isOut ? "outbound" : "inbound", message_status: "received",
        content: String((m as any).text ?? "").slice(0, 8000), provider_message_id: pid,
        provider_timestamp: (m as any).timestamp ?? null,
      });
      imported++;
    }
    await audit(a.admin, { business_id, conversation_id, event: "thread_synced", actor: "founder", actor_user_id: a.user.id, provider_calls: r.provider_calls, detail: { imported } });
    return json({ ok: true, imported, provider_calls: r.provider_calls });
  }

  if (action === "draft_reply") {
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conv } = await a.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)").eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conv) return json({ ok: false, error: "conversation_not_found" }, 404);
    const { data: msgs } = await a.admin.from("social_relationship_messages").select("*")
      .eq("business_id", business_id).eq("conversation_id", conversation_id).order("created_at", { ascending: false }).limit(10);
    const history = (msgs ?? []).slice().reverse();
    const lastInbound = history.filter((m: any) => m.direction === "inbound").slice(-1)[0];
    const lastOutbound = history.filter((m: any) => m.direction === "outbound").slice(-1)[0];
    const intent = classifyIntent(lastInbound?.content ?? "");
    const esc = detectEscalation(lastInbound?.content ?? "", { intent });
    const today = new Date().toISOString().slice(0, 10);
    const repliesToday = conv.ai_replies_day === today ? conv.ai_replies_today ?? 0 : 0;
    const disp = decideReplyDisposition({
      mode: ctx.mode,
      intent,
      allow_ai_autosend: ctx.policy.allow_ai_autosend === true,
      ai_replies_today: repliesToday,
      max_ai_replies_per_day: ctx.policy.max_ai_replies_per_conversation_per_day ?? 3,
      last_outbound_ai_generated: lastOutbound?.ai_generated === true,
      inbound_text: lastInbound?.content ?? "",
      escalation_pending: conv.escalation_pending === true || esc.escalate,
    });

    if (esc.escalate && !conv.escalation_pending) {
      await a.admin.from("social_relationship_conversations")
        .update({ escalation_pending: true, escalation_reason: esc.category, last_intent: intent }).eq("id", conv.id).eq("business_id", business_id);
      await a.admin.from("social_relationship_escalations").insert({
        business_id, conversation_id, category: esc.category ?? "other", severity: esc.severity ?? "medium",
        summary: (lastInbound?.content ?? "").slice(0, 300), escalation_status: "open",
      });
    }
    if (disp.disposition === "suppress") {
      return json({ ok: true, suppressed: true, reason: disp.reason, intent, escalation: esc, draft: null });
    }

    const ai = await callAIGateway({
      business_id,
      action_type: "social_relationship_reply",
      task_category: "social_relationship",
      model: "google/gemini-2.5-flash",
      conversation_id,
      risk_level: "medium",
      messages: [
        {
          role: "system",
          content:
            "You write short, human, non-salesy replies for a founder's social inbox. Max 60 words. No emojis unless the prospect used one. Never promise pricing, legal or regulatory outcomes. Never claim to be a bot or a human explicitly. If unsure, ask one clarifying question.",
        },
        {
          role: "user",
          content: `Contact: ${conv.profile?.full_name ?? "unknown"} (${conv.profile?.job_title ?? ""} at ${conv.profile?.company_name ?? ""}).
Detected intent: ${intent}.
Recent thread:
${history.map((m: any) => `${m.direction === "inbound" ? "THEM" : "US"}: ${m.content}`).join("\n").slice(0, 4000)}

Write the next reply only.`,
        },
      ],
    });
    if (ai.status !== "completed") {
      return json({ ok: false, error: ai.error ?? "ai_unavailable", ai_status: ai.status }, ai.http_status || 502);
    }
    const draft = String(ai.data?.choices?.[0]?.message?.content ?? "").trim().split(/\s+/).slice(0, 80).join(" ");
    await a.admin.from("social_relationship_conversations").update({
      last_intent: intent,
      intent_history: [...((conv.intent_history as any[]) ?? []), { intent, at: new Date().toISOString() }].slice(-20),
      ai_last_used_at: new Date().toISOString(),
    }).eq("id", conv.id).eq("business_id", business_id);
    await audit(a.admin, { business_id, conversation_id, event: "ai_reply_drafted", actor: "founder", actor_user_id: a.user.id, detail: { intent, disposition: disp.disposition } });
    return json({ ok: true, draft, intent, disposition: disp.disposition, reason: disp.reason, escalation: esc, requires_approval: disp.disposition !== "send" });
  }

  if (action === "queue_reply") {
    const conversation_id = String(body.conversation_id ?? "");
    const message = String(body.message ?? "").trim();
    if (!message) return json({ ok: false, error: "message_required" }, 400);
    const { data: conv } = await a.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)").eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conv) return json({ ok: false, error: "conversation_not_found" }, 404);
    const { data: account } = await a.admin.from("social_relationship_accounts").select("*").eq("id", conv.account_id).eq("business_id", business_id).maybeSingle();
    const gate = await gateAction(a.admin, ctx, {
      business_id, action_type: "reply_message", account, profile: conv.profile,
      target: { target_status: "approved" }, batch_approved: true, ignore_working_hours: true,
    });
    const idempotency_key = buildIdempotencyKey({
      business_id, account_id: account?.id ?? "none", action_type: "reply_message",
      target_ref: conv.provider_chat_id, nonce: `${Date.now()}`,
    });
    // Canonical vocabulary — 'ready' means gated-and-approved, awaiting the
    // founder's confirmed dispatch. It is never sent from here.
    const status = decisionToStatus(gate.decision);
    const delay = jitterDelaySeconds(ctx.policy);
    const { data: row } = await a.admin.from("social_relationship_action_queue").insert({
      business_id, account_id: account?.id ?? null, conversation_id, profile_id: conv.profile_id,
      network: conv.network, action_type: "reply_message", action_status: status,
      blocked_reason: gate.blockers[0] ?? null,
      payload: { message, provider_chat_id: conv.provider_chat_id, ai_generated: body.ai_generated === true },
      rendered_preview: message,
      approved_by: status === "ready" ? a.user.id : null,
      approved_at: status === "ready" ? new Date().toISOString() : null,
      scheduled_for: new Date(Date.now() + delay * 1000).toISOString(),
      idempotency_key,
    }).select("*").maybeSingle();
    if (body.ai_generated === true) {
      const today = new Date().toISOString().slice(0, 10);
      await a.admin.from("social_relationship_conversations").update({
        ai_replies_day: today,
        ai_replies_today: conv.ai_replies_day === today ? (conv.ai_replies_today ?? 0) + 1 : 1,
      }).eq("id", conv.id).eq("business_id", business_id);
    }
    await audit(a.admin, { business_id, conversation_id, action_id: row?.id, event: "reply_queued", actor: "founder", actor_user_id: a.user.id, detail: { status, blockers: gate.blockers } });
    return json({ ok: true, action: row, gate, queued_status: status });
  }

  if (action === "resolve_escalation") {
    const id = String(body.escalation_id ?? "");
    const { data } = await a.admin.from("social_relationship_escalations").update({
      escalation_status: "resolved", resolved_by: a.user.id, resolved_at: new Date().toISOString(),
    }).eq("id", id).eq("business_id", business_id).select("conversation_id").maybeSingle();
    if (data?.conversation_id) {
      await a.admin.from("social_relationship_conversations")
        .update({ escalation_pending: false, escalation_reason: null }).eq("id", data.conversation_id).eq("business_id", business_id);
    }
    await audit(a.admin, { business_id, event: "escalation_resolved", actor: "founder", actor_user_id: a.user.id, detail: { id } });
    return json({ ok: true });
  }

  if (action === "promote_to_crm") {
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conv } = await a.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)").eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conv?.profile) return json({ ok: false, error: "conversation_or_profile_not_found" }, 404);
    const { data: existing } = await a.admin.from("social_relationship_crm_links")
      .select("*").eq("business_id", business_id).eq("profile_id", conv.profile.id).maybeSingle();
    if (existing) return json({ ok: true, link: existing, deduped: true });
    const { data: link } = await a.admin.from("social_relationship_crm_links").insert({
      business_id, profile_id: conv.profile.id, conversation_id,
      crm_contact_id: body.crm_contact_id ?? null,
      crm_lead_status: body.crm_lead_status ?? "social_qualified",
      link_status: body.crm_contact_id ? "linked" : "pending_review",
      source_platform: conv.network,
      first_touch_at: conv.last_outbound_at ?? conv.created_at,
    }).select("*").maybeSingle();
    if (body.crm_contact_id) {
      await a.admin.from("social_relationship_conversations").update({ crm_contact_id: body.crm_contact_id }).eq("id", conversation_id).eq("business_id", business_id);
    }
    await audit(a.admin, { business_id, conversation_id, event: "crm_link_created", actor: "founder", actor_user_id: a.user.id, detail: { link_status: link?.link_status } });
    return json({ ok: true, link });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
