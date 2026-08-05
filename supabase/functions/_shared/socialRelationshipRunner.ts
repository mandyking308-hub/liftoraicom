/**
 * Execution runner for approved Social Relationship actions.
 * Shared by the founder-triggered function and the unattended maintenance job
 * so there is exactly one execution path.
 *
 * Status vocabulary is the canonical DB vocabulary — see
 * socialRelationshipLogic.ts (ACTION_STATUSES). Nothing here may invent one.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { audit, bumpUsage, gateAction, loadContext } from "./socialRelationshipDb.ts";
import {
  accountStatusForHttp,
  classifyProviderFailure,
  jitterDelaySeconds,
  providerSendConfirmed,
  successStatusFor,
  targetStatusAfterAction,
  unattendedDispatchAllowed,
  RUNNABLE_ACTION_STATUSES,
} from "./socialRelationshipLogic.ts";
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
  processed: number;
  sent: number;
  blocked: number;
  failed: number;
  retried: number;
  dead_lettered: number;
  submission_unknown: number;
  provider_calls: number;
  details: Array<Record<string, unknown>>;
}

export async function runDueActions(
  admin: SupabaseClient,
  opts: {
    business_id?: string | null;
    limit?: number;
    now?: Date;
    actor?: string;
    actor_user_id?: string | null;
    /** Unattended callers may only run under approved_batch_autopilot. */
    require_autopilot?: boolean;
  },
): Promise<RunResult> {
  const now = opts.now ?? new Date();
  const out: RunResult = {
    processed: 0, sent: 0, blocked: 0, failed: 0, retried: 0,
    dead_lettered: 0, submission_unknown: 0, provider_calls: 0, details: [],
  };
  let q = admin
    .from("social_relationship_action_queue")
    .select("*")
    .in("action_status", RUNNABLE_ACTION_STATUSES)
    .not("approved_at", "is", null)
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(Math.min(50, Math.max(1, opts.limit ?? 10)));
  if (opts.business_id) q = q.eq("business_id", opts.business_id);
  const { data: due } = await q;

  for (const action of due ?? []) {
    out.processed++;
    const ctx = await loadContext(admin, action.business_id);

    if (opts.require_autopilot && !unattendedDispatchAllowed(ctx.mode)) {
      out.blocked++;
      out.details.push({ id: action.id, outcome: "blocked", blockers: ["unattended_dispatch_requires_autopilot"] });
      continue;
    }

    // Business isolation: every related row must belong to the SAME business.
    const [{ data: account }, { data: profile }, { data: target }] = await Promise.all([
      admin
        .from("social_relationship_accounts")
        .select("*")
        .eq("id", action.account_id)
        .eq("business_id", action.business_id)
        .maybeSingle(),
      action.profile_id
        ? admin
            .from("social_relationship_profiles")
            .select("*")
            .eq("id", action.profile_id)
            .eq("business_id", action.business_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      action.target_id
        ? admin
            .from("social_relationship_targets")
            .select("*")
            .eq("id", action.target_id)
            .eq("business_id", action.business_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (!account) {
      out.blocked++;
      await admin.from("social_relationship_action_queue").update({
        action_status: "blocked",
        blocked_reason: "account_not_in_business",
      }).eq("id", action.id).eq("business_id", action.business_id);
      await audit(admin, {
        business_id: action.business_id, action_id: action.id, event: "action_blocked",
        event_status: "blocked", actor: opts.actor ?? "system", detail: { blockers: ["account_not_in_business"] },
      });
      out.details.push({ id: action.id, outcome: "blocked", blockers: ["account_not_in_business"] });
      continue;
    }

    const notBefore = action.not_before ?? action.scheduled_for;
    if (notBefore && new Date(notBefore).getTime() > now.getTime()) {
      out.details.push({ id: action.id, outcome: "not_due" });
      continue;
    }

    const gate = await gateAction(admin, ctx, {
      business_id: action.business_id,
      action_type: action.action_type,
      account,
      profile,
      target: target ?? { target_status: "approved" },
      batch_approved: Boolean(action.approved_at),
      connect_then_dm: action.payload?.connect_then_dm === true,
      now,
    });

    if (gate.decision !== "ready") {
      out.blocked++;
      await admin.from("social_relationship_action_queue").update({
        action_status: "blocked",
        blocked_reason: (gate.blockers[0] ?? gate.reasons[0] ?? "not_ready").slice(0, 300),
      }).eq("id", action.id).eq("business_id", action.business_id);
      await audit(admin, {
        business_id: action.business_id, account_id: action.account_id, action_id: action.id,
        event: "action_blocked", event_status: "blocked", actor: opts.actor ?? "system",
        actor_user_id: opts.actor_user_id ?? null, detail: { blockers: gate.blockers, reasons: gate.reasons },
      });
      out.details.push({ id: action.id, outcome: "blocked", blockers: gate.blockers });
      continue;
    }

    // Idempotency: atomic row-locked claim in Postgres (ready|retrying →
    // submitting). Never submit the same logical action twice, even with two
    // concurrent workers.
    const { data: claim, error: claimError } = await admin
      .rpc("social_relationship_claim_action", { p_action_id: action.id });
    if (claimError || claim !== "claimed") {
      out.blocked++;
      out.details.push({ id: action.id, outcome: claim === "duplicate" ? "duplicate" : "not_claimable" });
      continue;
    }

    const adapter = getRelationshipAdapter(account.provider);
    const text = renderTemplate(String(action.payload?.message ?? ""), profile);
    let resp: any;
    if (action.action_type === "send_invitation") {
      resp = await adapter.sendInvitation(account.provider_account_id, profile?.provider_profile_id ?? "", text || null);
    } else if (action.action_type === "start_chat") {
      resp = await adapter.startChat(account.provider_account_id, profile?.provider_profile_id ?? "", text);
    } else if (action.action_type === "send_message" || action.action_type === "reply_message") {
      const chatId = String(action.payload?.provider_chat_id ?? "");
      resp = chatId
        ? await adapter.sendMessage(account.provider_account_id, chatId, text)
        : { ok: false, http_status: 400, error: "provider_chat_id_missing", provider_calls: 0, data: { provider_id: null } };
    } else {
      resp = { ok: false, http_status: 400, error: "action_type_not_executable", provider_calls: 0, data: { provider_id: null } };
    }
    out.provider_calls += resp.provider_calls ?? 0;

    // 'sent' ONLY when a real provider id came back.
    if (resp.ok && providerSendConfirmed(resp.data)) {
      out.sent++;
      await admin.from("social_relationship_action_queue").update({
        action_status: successStatusFor(action.action_type),
        provider_action_id: resp.data.provider_id,
        provider_response: { http_status: resp.http_status },
        completed_at: new Date().toISOString(),
        last_error: null,
        blocked_reason: null,
      }).eq("id", action.id).eq("business_id", action.business_id);
      await bumpUsage(admin, action.business_id, account.id, action.action_type, now, ctx.policy.timezone);
      if (target) {
        await admin.from("social_relationship_targets")
          .update({
            target_status: targetStatusAfterAction(action.action_type),
            first_touch_at: target.first_touch_at ?? new Date().toISOString(),
          })
          .eq("id", target.id).eq("business_id", action.business_id);
      }
      if ((action.action_type === "start_chat" || action.action_type === "send_message" || action.action_type === "reply_message")) {
        const chatId = String(resp.data.chat_id ?? action.payload?.provider_chat_id ?? "");
        if (chatId) {
          const { data: conv } = await admin.from("social_relationship_conversations")
            .select("id").eq("business_id", action.business_id).eq("provider_chat_id", chatId).maybeSingle();
          let convId = conv?.id;
          if (!convId) {
            convId = (await admin.from("social_relationship_conversations").insert({
              business_id: action.business_id, account_id: account.id, profile_id: profile?.id ?? null,
              network: account.network, provider_chat_id: chatId, conversation_status: "open",
              last_message_at: new Date().toISOString(), last_outbound_at: new Date().toISOString(),
            }).select("id").maybeSingle()).data?.id;
          } else {
            await admin.from("social_relationship_conversations")
              .update({ last_message_at: new Date().toISOString(), last_outbound_at: new Date().toISOString() })
              .eq("id", convId).eq("business_id", action.business_id);
          }
          if (convId) {
            await admin.from("social_relationship_messages").insert({
              business_id: action.business_id, conversation_id: convId, network: account.network,
              direction: "outbound", message_status: "sent", content: text,
              ai_generated: action.payload?.ai_generated === true,
              provider_message_id: resp.data.provider_id, action_id: action.id,
            });
          }
        }
      }
      await audit(admin, {
        business_id: action.business_id, account_id: account.id, action_id: action.id, event: "action_sent",
        actor: opts.actor ?? "system", actor_user_id: opts.actor_user_id ?? null, provider: account.provider,
        provider_calls: resp.provider_calls ?? 0, detail: { action_type: action.action_type },
      });
      out.details.push({ id: action.id, outcome: "sent" });
      continue;
    }

    const klass = classifyProviderFailure({
      http_status: resp.http_status,
      transport_error: resp.transport_error === true,
      attempt_count: action.attempt_count ?? 0,
      max_attempts: action.max_attempts ?? 3,
    });
    const errText = String(resp.error ?? "provider_failure").slice(0, 500);

    if (klass.klass === "submission_unknown") {
      // Ambiguous: the claim is RETAINED and there is NO automatic retry.
      out.submission_unknown++;
      await admin.from("social_relationship_action_queue").update({
        action_status: "submission_unknown", last_error: errText,
        provider_response: { http_status: resp.http_status },
      }).eq("id", action.id).eq("business_id", action.business_id);
      await admin.from("social_relationship_escalations").insert({
        business_id: action.business_id, action_id: action.id, category: "other", severity: "high",
        summary: `Ambiguous submission outcome — manual verification required (${klass.reason})`,
        escalation_status: "open",
      });
    } else if (klass.klass === "retry") {
      out.retried++;
      const retryAfter = Number(resp.retry_after_seconds ?? 0);
      const delay = retryAfter > 0 ? retryAfter : jitterDelaySeconds(ctx.policy) + 300;
      await admin.from("social_relationship_action_queue").update({
        action_status: "retrying", last_error: errText,
        attempt_count: (action.attempt_count ?? 0) + 1,
        scheduled_for: new Date(now.getTime() + delay * 1000).toISOString(),
      }).eq("id", action.id).eq("business_id", action.business_id);
    } else {
      out.dead_lettered++;
      out.failed++;
      await admin.from("social_relationship_action_queue").update({
        action_status: "dead_letter", last_error: errText,
        provider_response: { http_status: resp.http_status },
      }).eq("id", action.id).eq("business_id", action.business_id);
      const accStatus = accountStatusForHttp(resp.http_status);
      if (accStatus) {
        const mins = ctx.policy.cooldown_minutes_after_warning ?? 120;
        await admin.from("social_relationship_accounts").update({
          account_status: accStatus,
          cooldown_until: new Date(now.getTime() + mins * 60000).toISOString(),
          last_error: errText,
        }).eq("id", account.id).eq("business_id", action.business_id);
      }
    }
    await audit(admin, {
      business_id: action.business_id, account_id: account.id, action_id: action.id,
      event: "action_failed", event_status: "failed", actor: opts.actor ?? "system",
      actor_user_id: opts.actor_user_id ?? null, provider: account.provider,
      provider_calls: resp.provider_calls ?? 0, detail: { klass: klass.klass, reason: klass.reason, http_status: resp.http_status },
    });
    out.details.push({ id: action.id, outcome: klass.klass, reason: klass.reason });
  }
  return out;
}
