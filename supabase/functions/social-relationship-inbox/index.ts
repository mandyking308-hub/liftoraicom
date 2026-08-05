import { corsHeaders, json, requireFounder, loadContext, audit, gateAction } from "../_shared/socialRelationshipDb.ts";
import { buildIdempotencyKey, classifyIntent, decideReplyDisposition, detectEscalation, jitterDelaySeconds } from "../_shared/socialRelationshipLogic.ts";
import { getRelationshipAdapter } from "../_shared/socialRelationshipProvider.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";

const REPLY_CONFIRMATION = "APPROVE SOCIAL REPLY";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "list_threads");

  if (action === "list_threads") {
    const [{ data: conversations }, { data: escalations }] = await Promise.all([
      auth.admin.from("social_relationship_conversations")
        .select("*, profile:social_relationship_profiles(full_name,company_name,job_title,profile_url)")
        .eq("business_id", business_id).order("escalation_pending", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false }).limit(200),
      auth.admin.from("social_relationship_escalations").select("*")
        .eq("business_id", business_id).eq("escalation_status", "open").limit(100),
    ]);
    return json({ ok: true, conversations: conversations ?? [], escalations: escalations ?? [] });
  }

  if (action === "get_thread") {
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conversation } = await auth.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conversation) return json({ ok: false, error: "conversation_not_found" }, 404);
    const { data: messages } = await auth.admin.from("social_relationship_messages").select("*")
      .eq("business_id", business_id).eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true }).limit(200);
    return json({ ok: true, conversation, messages: messages ?? [] });
  }

  if (action === "sync_thread") {
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conversation } = await auth.admin.from("social_relationship_conversations")
      .select("*").eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conversation) return json({ ok: false, error: "conversation_not_found" }, 404);
    const { data: account } = await auth.admin.from("social_relationship_accounts").select("*")
      .eq("id", conversation.account_id).eq("business_id", business_id).maybeSingle();
    if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    const adapter = getRelationshipAdapter(account.provider);
    const result = await adapter.listMessages(conversation.provider_chat_id, 50);
    if (!result.ok) return json({ ok: false, error: result.error, http_status: result.http_status }, 502);
    let imported = 0;
    for (const raw of result.data ?? []) {
      const provider_message_id = String((raw as any).id ?? (raw as any).message_id ?? "");
      if (!provider_message_id) continue;
      const { data: exists } = await auth.admin.from("social_relationship_messages").select("id")
        .eq("business_id", business_id).eq("conversation_id", conversation_id)
        .eq("provider_message_id", provider_message_id).maybeSingle();
      if (exists) continue;
      const outbound = (raw as any).is_sender === true || String((raw as any).is_sender ?? "") === "1" || (raw as any).direction === "outbound";
      await auth.admin.from("social_relationship_messages").insert({
        business_id, conversation_id, network: conversation.network,
        direction: outbound ? "outbound" : "inbound",
        message_status: outbound ? "sent" : "received",
        content: String((raw as any).text ?? (raw as any).content ?? "").slice(0, 8000),
        provider_message_id, provider_timestamp: (raw as any).timestamp ?? (raw as any).created_at ?? null,
      });
      imported++;
    }
    await audit(auth.admin, {
      business_id, conversation_id, event: "thread_synced", actor: "founder",
      actor_user_id: auth.user.id, provider_calls: result.provider_calls, detail: { imported },
    });
    return json({ ok: true, imported, provider_calls: result.provider_calls });
  }

  if (action === "draft_reply") {
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conversation } = await auth.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conversation) return json({ ok: false, error: "conversation_not_found" }, 404);
    const { data: account } = await auth.admin.from("social_relationship_accounts").select("*")
      .eq("id", conversation.account_id).eq("business_id", business_id).maybeSingle();
    if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    const context = await loadContext(auth.admin, business_id, account.provider, account.id);
    const { data: recent } = await auth.admin.from("social_relationship_messages").select("*")
      .eq("business_id", business_id).eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false }).limit(10);
    const history = (recent ?? []).slice().reverse();
    const lastInbound = history.filter((message: any) => message.direction === "inbound").slice(-1)[0];
    const lastOutbound = history.filter((message: any) => message.direction === "outbound").slice(-1)[0];
    if (!lastInbound) return json({ ok: false, error: "no_inbound_message" }, 409);
    const intent = classifyIntent(lastInbound.content ?? "");
    const escalation = detectEscalation(lastInbound.content ?? "", { intent });
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: String(context.policy.timezone ?? "Europe/London") }).format(new Date());
    const repliesToday = conversation.ai_replies_day === today ? Number(conversation.ai_replies_today ?? 0) : 0;
    const disposition = decideReplyDisposition({
      mode: context.mode, intent,
      allow_ai_autosend: context.policy.allow_ai_autosend === true,
      ai_replies_today: repliesToday,
      max_ai_replies_per_day: Number(context.policy.max_ai_replies_per_conversation_per_day ?? 3),
      last_outbound_ai_generated: lastOutbound?.ai_generated === true,
      inbound_text: lastInbound.content ?? "",
      escalation_pending: conversation.escalation_pending === true || escalation.escalate,
    });

    if (escalation.escalate && !conversation.escalation_pending) {
      const { data: escalationRow } = await auth.admin.from("social_relationship_escalations").insert({
        business_id, conversation_id, category: escalation.category ?? "other",
        severity: escalation.severity ?? "medium", summary: String(lastInbound.content ?? "").slice(0, 300),
        escalation_status: "open",
      }).select("id").maybeSingle();
      await auth.admin.from("social_relationship_conversations").update({
        escalation_pending: true, escalation_reason: escalation.category,
        conversation_status: "escalated", last_intent: intent, updated_at: new Date().toISOString(),
      }).eq("id", conversation.id).eq("business_id", business_id);
      if (escalationRow?.id) await auth.admin.from("founder_approval_items").insert({
        approval_type: "social_relationship_escalation", business_id,
        agent_key: "social_relationship_engine", source_system: "social_relationship_engine",
        source_table: "social_relationship_escalations", source_id: escalationRow.id,
        title: `Social conversation requires review: ${escalation.category ?? intent}`,
        summary: String(lastInbound.content ?? "").slice(0, 500),
        recommended_action: "Review and decide the response. No automatic reply has been sent.",
        priority_level: escalation.severity === "critical" ? "urgent" : "high", status: "pending",
      });
    }
    if (disposition.disposition === "suppress") {
      return json({ ok: true, suppressed: true, reason: disposition.reason, intent, escalation, draft: null });
    }

    const ai = await callAIGateway({
      business_id, action_type: "social_relationship_reply", task_category: "social_relationship",
      model: "google/gemini-2.5-flash", conversation_id, risk_level: "medium",
      messages: [
        { role: "system", content: "Write a short, human, non-salesy social reply. Maximum 60 words. Never promise pricing, legal, medical, financial or regulatory outcomes. Ask one clarifying question when uncertain." },
        { role: "user", content: `Contact: ${conversation.profile?.full_name ?? "unknown"} (${conversation.profile?.job_title ?? ""} at ${conversation.profile?.company_name ?? ""}).\nDetected intent: ${intent}.\nRecent thread:\n${history.map((message: any) => `${message.direction === "inbound" ? "THEM" : "US"}: ${message.content}`).join("\n").slice(0, 4000)}\n\nWrite only the next reply.` },
      ],
    });
    if (ai.status !== "completed") return json({ ok: false, error: ai.error ?? "ai_unavailable", ai_status: ai.status }, ai.http_status || 502);
    const draft = String(ai.data?.choices?.[0]?.message?.content ?? "").trim().split(/\s+/).slice(0, 80).join(" ");
    await auth.admin.from("social_relationship_conversations").update({
      last_intent: intent,
      intent_history: [...(Array.isArray(conversation.intent_history) ? conversation.intent_history : []), { intent, at: new Date().toISOString() }].slice(-20),
      ai_last_used_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", conversation.id).eq("business_id", business_id);
    await audit(auth.admin, { business_id, conversation_id, event: "ai_reply_drafted", actor: "founder", actor_user_id: auth.user.id, detail: { intent, disposition: disposition.disposition } });
    return json({ ok: true, draft, intent, disposition: disposition.disposition, reason: disposition.reason, escalation, requires_approval: true });
  }

  if (action === "queue_reply") {
    const conversation_id = String(body.conversation_id ?? "");
    const message = String(body.message ?? "").trim().slice(0, 2000);
    if (!message) return json({ ok: false, error: "message_required" }, 400);
    const { data: conversation } = await auth.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conversation) return json({ ok: false, error: "conversation_not_found" }, 404);
    if (conversation.escalation_pending || ["suppressed", "closed"].includes(conversation.conversation_status)) {
      return json({ ok: false, error: "conversation_not_sendable", status: conversation.conversation_status }, 409);
    }
    const { data: account } = await auth.admin.from("social_relationship_accounts").select("*")
      .eq("id", conversation.account_id).eq("business_id", business_id).maybeSingle();
    if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    const context = await loadContext(auth.admin, business_id, account.provider, account.id);
    const explicitlyApproved = body.confirmation_phrase === REPLY_CONFIRMATION;
    const gate = await gateAction(auth.admin, context, {
      business_id, action_type: "reply_message", account, profile: conversation.profile,
      target: { business_id, target_status: "approved" }, batch_approved: explicitlyApproved,
      ignore_working_hours: true,
    });
    const idempotency_key = buildIdempotencyKey({
      business_id, account_id: account.id, action_type: "reply_message",
      target_ref: conversation.provider_chat_id, nonce: String(body.client_nonce ?? crypto.randomUUID()),
    });
    const status = gate.decision === "blocked" ? "blocked"
      : gate.decision === "draft" ? "draft"
      : gate.decision === "ready" && explicitlyApproved ? "ready" : "pending_approval";
    const delay = jitterDelaySeconds(context.policy);
    const due = new Date(Date.now() + delay * 1000).toISOString();
    const { data: row } = await auth.admin.from("social_relationship_action_queue").insert({
      business_id, account_id: account.id, conversation_id, profile_id: conversation.profile_id,
      network: conversation.network, action_type: "reply_message", action_status: status,
      blocked_reason: gate.blockers[0] ?? gate.reasons[0] ?? null,
      payload: { message, provider_chat_id: conversation.provider_chat_id, ai_generated: body.ai_generated === true },
      rendered_preview: message,
      approved_by: status === "ready" ? auth.user.id : null,
      approved_at: status === "ready" ? new Date().toISOString() : null,
      scheduled_for: due, not_before: due, idempotency_key,
    }).select("*").maybeSingle();
    await audit(auth.admin, { business_id, conversation_id, action_id: row?.id, event: "reply_queued", actor: "founder", actor_user_id: auth.user.id, detail: { status, blockers: gate.blockers } });
    return json({ ok: true, action: row, gate, queued_status: status, confirmation_phrase: status === "ready" ? null : REPLY_CONFIRMATION });
  }

  if (action === "resolve_escalation") {
    const escalation_id = String(body.escalation_id ?? "");
    const { data } = await auth.admin.from("social_relationship_escalations").update({
      escalation_status: "resolved", resolved_by: auth.user.id, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", escalation_id).eq("business_id", business_id).select("conversation_id").maybeSingle();
    if (data?.conversation_id) await auth.admin.from("social_relationship_conversations").update({
      escalation_pending: false, escalation_reason: null, conversation_status: "open", updated_at: new Date().toISOString(),
    }).eq("id", data.conversation_id).eq("business_id", business_id);
    await audit(auth.admin, { business_id, event: "escalation_resolved", actor: "founder", actor_user_id: auth.user.id, detail: { escalation_id } });
    return json({ ok: true, resolved: Boolean(data) });
  }

  if (action === "promote_to_crm") {
    if (body.confirmation_phrase !== "PROMOTE SOCIAL CONTACT TO CRM") {
      return json({ ok: false, error: "crm_confirmation_required", confirmation_phrase: "PROMOTE SOCIAL CONTACT TO CRM" }, 400);
    }
    const conversation_id = String(body.conversation_id ?? "");
    const { data: conversation } = await auth.admin.from("social_relationship_conversations")
      .select("*, profile:social_relationship_profiles(*)")
      .eq("id", conversation_id).eq("business_id", business_id).maybeSingle();
    if (!conversation?.profile) return json({ ok: false, error: "conversation_or_profile_not_found" }, 404);
    const { data: existing } = await auth.admin.from("social_relationship_crm_links").select("*")
      .eq("business_id", business_id).eq("profile_id", conversation.profile.id).maybeSingle();
    if (existing) return json({ ok: true, link: existing, deduped: true });
    const crm_contact_id = body.crm_contact_id ? String(body.crm_contact_id) : null;
    const { data: link, error } = await auth.admin.from("social_relationship_crm_links").insert({
      business_id, profile_id: conversation.profile.id, conversation_id,
      crm_contact_id, crm_lead_status: String(body.crm_lead_status ?? "social_qualified"),
      link_status: crm_contact_id ? "linked" : "created",
      source_platform: conversation.network,
      first_touch_at: conversation.last_outbound_at ?? conversation.created_at,
      detail: { source: "social_relationship_engine", provider_chat_id: conversation.provider_chat_id },
    }).select("*").maybeSingle();
    if (error) return json({ ok: false, error: "crm_link_create_failed", detail: error.message }, 500);
    if (crm_contact_id) await auth.admin.from("social_relationship_conversations").update({ crm_contact_id, conversation_status: "qualified", updated_at: new Date().toISOString() }).eq("id", conversation_id).eq("business_id", business_id);
    await audit(auth.admin, { business_id, conversation_id, event: "crm_link_created", actor: "founder", actor_user_id: auth.user.id, detail: { link_status: link?.link_status } });
    return json({ ok: true, link });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
