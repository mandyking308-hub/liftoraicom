/**
 * Authoritative execution runner for approved Social Relationship actions.
 * Manual and maintenance routes share this exact path.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { audit, bumpUsage, gateAction, loadContext } from "./socialRelationshipDb.ts";
import { jitterDelaySeconds, providerSendConfirmed } from "./socialRelationshipLogic.ts";
import { getRelationshipAdapter } from "./socialRelationshipProvider.ts";

export function renderTemplate(template: string, profile: Record<string, any> | null): string {
  const first = String(profile?.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  return String(template ?? "")
    .replaceAll("{{first_name}}", first)
    .replaceAll("{{full_name}}", String(profile?.full_name ?? ""))
    .replaceAll("{{company}}", String(profile?.company_name ?? ""))
    .replaceAll("{{job_title}}", String(profile?.job_title ?? ""))
    .slice(0, 2000);
}

export interface RunResult {
  processed: number; sent: number; blocked: number; failed: number; retried: number;
  dead_lettered: number; submission_unknown: number; provider_calls: number;
  details: Array<Record<string, unknown>>;
}

function dueAt(action: Record<string, any>): number {
  const raw = action.not_before ?? action.scheduled_for;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export async function runDueActions(
  admin: SupabaseClient,
  opts: {
    business_id?: string | null; limit?: number; now?: Date; actor?: string;
    actor_user_id?: string | null; unattended?: boolean;
  },
): Promise<RunResult> {
  const now = opts.now ?? new Date();
  const output: RunResult = {
    processed: 0, sent: 0, blocked: 0, failed: 0, retried: 0,
    dead_lettered: 0, submission_unknown: 0, provider_calls: 0, details: [],
  };
  let query = admin.from("social_relationship_action_queue").select("*")
    .in("action_status", ["ready", "retrying"])
    .order("not_before", { ascending: true, nullsFirst: true })
    .limit(Math.min(100, Math.max(1, (opts.limit ?? 10) * 3)));
  if (opts.business_id) query = query.eq("business_id", opts.business_id);
  const { data: candidates } = await query;
  const due = (candidates ?? []).filter((row: any) => dueAt(row) <= now.getTime()).slice(0, Math.min(50, Math.max(1, opts.limit ?? 10)));

  for (const action of due) {
    output.processed++;
    const [{ data: account }, { data: profile }, { data: target }] = await Promise.all([
      admin.from("social_relationship_accounts").select("*").eq("id", action.account_id).eq("business_id", action.business_id).maybeSingle(),
      action.profile_id
        ? admin.from("social_relationship_profiles").select("*").eq("id", action.profile_id).eq("business_id", action.business_id).maybeSingle()
        : Promise.resolve({ data: null }),
      action.target_id
        ? admin.from("social_relationship_targets").select("*").eq("id", action.target_id).eq("business_id", action.business_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!account) {
      output.blocked++;
      await admin.from("social_relationship_action_queue").update({ action_status: "blocked", blocked_reason: "account_not_found_or_cross_business" }).eq("id", action.id).eq("business_id", action.business_id);
      output.details.push({ id: action.id, outcome: "blocked", blockers: ["account_not_found_or_cross_business"] });
      continue;
    }

    const context = await loadContext(admin, action.business_id, account.provider, account.id);
    if (opts.unattended && context.mode !== "approved_batch_autopilot") {
      output.blocked++;
      output.details.push({ id: action.id, outcome: "not_executed", blockers: ["unattended_requires_approved_batch_autopilot"] });
      continue;
    }
    const gate = await gateAction(admin, context, {
      business_id: action.business_id,
      action_type: action.action_type,
      account, profile,
      target: target ?? null,
      batch_approved: Boolean(action.approved_at && action.approved_by),
      connect_then_dm: action.payload?.connect_then_dm === true,
      now,
    });
    if (gate.decision !== "ready") {
      output.blocked++;
      await admin.from("social_relationship_action_queue").update({
        action_status: gate.decision === "pending_approval" ? "pending_approval" : "blocked",
        blocked_reason: (gate.blockers[0] ?? gate.reasons[0] ?? "not_ready").slice(0, 300),
        updated_at: new Date().toISOString(),
      }).eq("id", action.id).eq("business_id", action.business_id);
      await audit(admin, {
        business_id: action.business_id, account_id: action.account_id, action_id: action.id,
        event: "action_blocked", event_status: "blocked", actor: opts.actor ?? "system",
        actor_user_id: opts.actor_user_id ?? null, detail: { blockers: gate.blockers, reasons: gate.reasons },
      });
      output.details.push({ id: action.id, outcome: "blocked", blockers: gate.blockers });
      continue;
    }

    const { data: claim, error: claimError } = await admin.rpc("social_relationship_claim_action", { p_action_id: action.id });
    if (claimError || claim !== "claimed") {
      output.blocked++;
      output.details.push({ id: action.id, outcome: claim === "duplicate" ? "duplicate" : "not_claimable" });
      continue;
    }

    const adapter = getRelationshipAdapter(account.provider);
    const text = renderTemplate(String(action.payload?.message ?? ""), profile);
    let response: any;
    if (action.action_type === "send_invitation") {
      response = profile?.provider_profile_id
        ? await adapter.sendInvitation(account.provider_account_id, profile.provider_profile_id, text || null)
        : { ok: false, http_status: 400, error: "provider_profile_id_missing", provider_calls: 0, data: { provider_id: null } };
    } else if (action.action_type === "start_chat") {
      response = profile?.provider_profile_id && text
        ? await adapter.startChat(account.provider_account_id, profile.provider_profile_id, text)
        : { ok: false, http_status: 400, error: "profile_and_message_required", provider_calls: 0, data: { provider_id: null } };
    } else if (action.action_type === "send_message" || action.action_type === "reply_message") {
      const chatId = String(action.payload?.provider_chat_id ?? "");
      response = chatId && text
        ? await adapter.sendMessage(account.provider_account_id, chatId, text)
        : { ok: false, http_status: 400, error: "provider_chat_id_and_message_required", provider_calls: 0, data: { provider_id: null } };
    } else {
      response = { ok: false, http_status: 400, error: `action_not_implemented:${action.action_type}`, provider_calls: 0, data: { provider_id: null } };
    }
    output.provider_calls += Number(response.provider_calls ?? 0);
    const externalId = response?.data?.provider_id ?? null;

    if (response.ok && providerSendConfirmed(response.data) && externalId) {
      const finalStatus = action.action_type === "reply_message" ? "replied" : "sent";
      const completedAt = new Date().toISOString();
      output.sent++;
      await admin.from("social_relationship_action_queue").update({
        action_status: finalStatus,
        provider_action_id: externalId,
        provider_response: { http_status: response.http_status, chat_id: response.data?.chat_id ?? null },
        completed_at: completedAt,
        last_error: null,
        blocked_reason: null,
        updated_at: completedAt,
      }).eq("id", action.id).eq("business_id", action.business_id);
      await bumpUsage(admin, action.business_id, account.id, action.action_type, now, String(context.policy.timezone ?? "Europe/London"));
      if (target) {
        const targetStatus = action.action_type === "send_invitation" ? "invited" : "in_conversation";
        await admin.from("social_relationship_targets").update({
          target_status: targetStatus,
          first_touch_at: target.first_touch_at ?? completedAt,
          updated_at: completedAt,
        }).eq("id", target.id).eq("business_id", action.business_id);
      }

      if (["start_chat", "send_message", "reply_message"].includes(action.action_type)) {
        const chatId = String(response.data?.chat_id ?? action.payload?.provider_chat_id ?? "");
        if (chatId) {
          let { data: conversation } = await admin.from("social_relationship_conversations").select("*")
            .eq("business_id", action.business_id).eq("account_id", account.id).eq("provider_chat_id", chatId).maybeSingle();
          if (!conversation) {
            conversation = (await admin.from("social_relationship_conversations").insert({
              business_id: action.business_id, account_id: account.id, profile_id: profile?.id ?? null,
              network: account.network, provider_chat_id: chatId, conversation_status: "open",
              last_message_at: completedAt, last_outbound_at: completedAt,
            }).select("*").maybeSingle()).data;
          } else {
            await admin.from("social_relationship_conversations").update({ last_message_at: completedAt, last_outbound_at: completedAt, updated_at: completedAt }).eq("id", conversation.id).eq("business_id", action.business_id);
          }
          if (conversation?.id) {
            await admin.from("social_relationship_action_queue").update({ conversation_id: conversation.id, updated_at: completedAt }).eq("id", action.id).eq("business_id", action.business_id);
            await admin.from("social_relationship_messages").insert({
              business_id: action.business_id, conversation_id: conversation.id, network: account.network,
              direction: "outbound", message_status: "sent", content: text,
              ai_generated: action.payload?.ai_generated === true,
              provider_message_id: externalId, action_id: action.id,
            });
          }
        }
      }
      await audit(admin, {
        business_id: action.business_id, account_id: account.id, action_id: action.id,
        event: "action_sent", actor: opts.actor ?? "system", actor_user_id: opts.actor_user_id ?? null,
        provider: account.provider, provider_calls: Number(response.provider_calls ?? 0),
        detail: { action_type: action.action_type, status: finalStatus },
      });
      output.details.push({ id: action.id, outcome: finalStatus, provider_action_id: externalId });
      continue;
    }

    const errorText = String(response.error ?? (response.ok ? "provider_success_without_external_id" : "provider_failure")).slice(0, 500);
    const ambiguous = response.transport_error === true || response.ambiguous === true || response.http_status >= 500 || (response.ok && !externalId);
    if (ambiguous) {
      output.submission_unknown++;
      await admin.from("social_relationship_action_queue").update({
        action_status: "submission_unknown", last_error: errorText,
        provider_response: { http_status: response.http_status }, updated_at: new Date().toISOString(),
      }).eq("id", action.id).eq("business_id", action.business_id);
      await admin.from("social_relationship_escalations").insert({
        business_id: action.business_id, action_id: action.id, category: "other", severity: "high",
        summary: "Ambiguous provider submission outcome — reconcile before any retry.", escalation_status: "open",
      });
    } else if ([408, 429].includes(Number(response.http_status)) && Number(action.attempt_count ?? 0) + 1 < Number(action.max_attempts ?? 3)) {
      output.retried++;
      const providerDelay = Number(response.retry_after_seconds ?? 0);
      const delay = Math.max(providerDelay, 60, jitterDelaySeconds(context.policy) + 60);
      await admin.from("social_relationship_action_queue").update({
        action_status: "retrying", last_error: errorText,
        not_before: new Date(now.getTime() + delay * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", action.id).eq("business_id", action.business_id);
    } else {
      output.dead_lettered++;
      output.failed++;
      await admin.from("social_relationship_action_queue").update({
        action_status: "dead_letter", last_error: errorText,
        provider_response: { http_status: response.http_status }, updated_at: new Date().toISOString(),
      }).eq("id", action.id).eq("business_id", action.business_id);
      if ([401, 403, 429].includes(Number(response.http_status))) {
        const minutes = Number(context.policy.cooldown_minutes_after_warning ?? 120);
        await admin.from("social_relationship_accounts").update({
          account_status: response.http_status === 429 ? "rate_limited" : "challenge",
          cooldown_until: new Date(now.getTime() + minutes * 60000).toISOString(),
          last_error: errorText, updated_at: new Date().toISOString(),
        }).eq("id", account.id).eq("business_id", action.business_id);
      }
    }
    await audit(admin, {
      business_id: action.business_id, account_id: account.id, action_id: action.id,
      event: "action_failed", event_status: "failed", actor: opts.actor ?? "system",
      actor_user_id: opts.actor_user_id ?? null, provider: account.provider,
      provider_calls: Number(response.provider_calls ?? 0),
      detail: { ambiguous, http_status: response.http_status, error: errorText },
    });
    output.details.push({ id: action.id, outcome: ambiguous ? "submission_unknown" : [408,429].includes(Number(response.http_status)) ? "retrying" : "dead_letter" });
  }
  return output;
}
