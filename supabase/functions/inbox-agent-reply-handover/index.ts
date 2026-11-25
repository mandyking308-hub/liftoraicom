/**
 * Inbox agent reply handover.
 *
 * Turns a recorded inbound reply into inbox_agent work. Reads replies from both
 * landing paths (the signed Smartlead receiver and the scoped REST poll), then
 * creates an agent_handover_log row and a pending ai_agent_task_queue task for
 * inbox_agent under the enabled rule outreach_reply_to_inbox_agent.
 *
 * Internal records only. This function never sends email, never posts to any
 * provider, and never changes campaign status. Every task it creates is pinned
 * founder_approval_required / dry_run_only / execution_enabled false, so an
 * agent can prepare work but nothing can go out without a founder.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { founderGuard } from "../_shared/founderGuard.ts";
import { classifyConversation, REPLY_CATEGORIES, reviewableReply } from "../_shared/crmReplyDrafting.ts";
import { stripHtml } from "../_shared/smartleadCampaignSync.ts";

const corsHeaders = {
  ...sdkCorsHeaders,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-liftor-cron-token",
};

const RULE_KEY = "outreach_reply_to_inbox_agent";
const FROM_AGENT = "outreach_agent";
const TO_AGENT = "inbox_agent";
const IDEMPOTENCY_WINDOW_HOURS = 168;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeSelect(admin: any, table: string, build: (q: any) => any): Promise<any[]> {
  try {
    const { data } = await build(admin.from(table));
    return data || [];
  } catch {
    return [];
  }
}

type ReplySignal = {
  source_table: string;
  source_id: string;
  business_id: string | null;
  contact_id: string | null;
  occurred_at: string | null;
  detail: string;
  provider_campaign_id: string | null;
  provider_lead_id: string | null;
};

function jsonToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(jsonToText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !/secret|token|password|signature|apikey/i.test(k))
      .map(([, v]) => jsonToText(v))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/**
 * Reply rows the poller recorded, plus the message body when the thread has one.
 */
async function pollerReplies(admin: any, sinceIso: string, limit: number): Promise<ReplySignal[]> {
  const rows = await safeSelect(admin, "smartlead_activity_events", (q: any) =>
    q
      .select("id,business_id,liftor_contact_id,event_type,occurred_at,details,provider_message_id,provider_campaign_id,provider_lead_id")
      .in("event_type", ["reply_received", "email_reply"])
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(limit),
  );

  const out: ReplySignal[] = [];
  for (const r of rows) {
    if (!r.liftor_contact_id) continue;
    let detail = jsonToText(r.details).slice(0, 1200);
    if (!detail && r.provider_message_id) {
      const msgs = await safeSelect(admin, "smartlead_thread_messages", (q: any) =>
        q
          .select("subject,body_html")
          .eq("business_id", r.business_id)
          .eq("provider_campaign_id", r.provider_campaign_id)
          .eq("provider_lead_id", r.provider_lead_id)
          .eq("provider_message_id", r.provider_message_id)
          .limit(1),
      );
      detail = jsonToText(msgs[0]?.body_html || msgs[0]?.subject).slice(0, 1200);
    }
    out.push({
      source_table: "smartlead_activity_events",
      source_id: String(r.id),
      business_id: r.business_id ?? null,
      contact_id: String(r.liftor_contact_id),
      occurred_at: r.occurred_at ?? null,
      detail: detail || "Inbound reply recorded by the Smartlead poll.",
      provider_campaign_id: r.provider_campaign_id ? String(r.provider_campaign_id) : null,
      provider_lead_id: r.provider_lead_id ? String(r.provider_lead_id) : null,
    });
  }
  return out;
}

/**
 * Reply rows the signed receiver recorded.
 */
async function receiverReplies(admin: any, sinceIso: string, limit: number): Promise<ReplySignal[]> {
  const rows = await safeSelect(admin, "outbound_provider_events", (q: any) =>
    q
      .select("id,business_id,contact_id,provider_event_type,event_occurred_at,received_at,raw_payload,normalized_payload,provider_campaign_id,provider_lead_id")
      .eq("provider_event_type", "reply_received")
      .gte("received_at", sinceIso)
      .order("received_at", { ascending: false })
      .limit(limit),
  );

  return rows
    .filter((r: any) => !!r.contact_id)
    .map((r: any) => ({
      source_table: "outbound_provider_events",
      source_id: String(r.id),
      business_id: r.business_id ?? null,
      contact_id: String(r.contact_id),
      occurred_at: r.event_occurred_at ?? r.received_at ?? null,
      detail:
        jsonToText(r.normalized_payload).slice(0, 1200) ||
        jsonToText(r.raw_payload).slice(0, 1200) ||
        "Inbound reply recorded by the Smartlead receiver.",
      provider_campaign_id: r.provider_campaign_id ? String(r.provider_campaign_id) : null,
      provider_lead_id: r.provider_lead_id ? String(r.provider_lead_id) : null,
    }));
}

const CATEGORIES = REPLY_CATEGORIES;
const MAX_ATTEMPTS = 3;
const OPT_OUT_RE = /(^|\W)(unsubscribe|remove me|opt[ -]?out|do not (contact|email)|don'?t (contact|email) me|no further emails|take me off)(\W|$)/i;

function redact(text: string): string {
  return text
    .replace(/(secret|token|password|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 2000);
}

const classify = classifyConversation;

async function conversationContext(admin: any, businessId: string, campaignId: string, leadId: string) {
  const [messages, business, claims] = await Promise.all([
    admin.from("smartlead_thread_messages").select("*").eq("business_id", businessId)
      .eq("provider_campaign_id", campaignId).eq("provider_lead_id", leadId).order("sent_at", { ascending: false }).limit(50),
    admin.from("businesses").select("name,portfolio_status").eq("id", businessId).single(),
    admin.from("approved_claims").select("claim_text").eq("business_id", businessId).eq("approval_status", "approved").limit(50),
  ]);
  if (messages.error || business.error || claims.error || business.data?.portfolio_status !== "active") throw new Error("conversation_context_unavailable");
  const rows = messages.data ?? [];
  return { rows, context: {
    businessName: business.data.name,
    history: [...rows].reverse().map((m: any) => `${m.sent_at ?? ""} ${m.direction}: ${stripHtml(m.body_html ?? "")}`).join("\n\n").slice(-40000),
    approvedClaims: (claims.data ?? []).map((c: any) => c.claim_text),
  } };
}

/**
 * Inbox agent worker. Picks up pending/retry reply_triage tasks, sorts the reply,
 * writes a Smartlead reply DRAFT plus a founder approval item, and enforces
 * opt-outs as suppression. Never sends or calls Smartlead. Retries up to
 * MAX_ATTEMPTS, then dead-letters and notifies the founder.
 */
async function processQueue(admin: any, max: number) {
  const stats = { processed: 0, drafted: 0, opted_out: 0, retried: 0, dead_lettered: 0, held: 0 };
  const key = Deno.env.get("LOVABLE_API_KEY");
  const tasks = await safeSelect(admin, "ai_agent_task_queue", (q: any) =>
    q.select("*").eq("agent_key", TO_AGENT).eq("task_type", "reply_triage")
      .in("status", ["pending", "retry"]).order("created_at").limit(max));

  for (const t of tasks) {
    // Claim: only one worker may move a task out of pending/retry.
    const { data: claimed } = await admin.from("ai_agent_task_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", t.id).eq("status", t.status).select("id");
    if (!claimed?.length) continue;
    stats.processed++;
    const prev = (t.agent_output ?? {}) as any;
    const attempts = Number(prev.attempts ?? 0) + 1;

    const finish = (status: string, output: any, error: string | null = null) =>
      admin.from("ai_agent_task_queue").update({
        status, error_message: error, updated_at: new Date().toISOString(),
        agent_output: { ...output, attempts, sent: false },
      }).eq("id", t.id);

    const notify = (title: string, summary: string, extra: any) =>
      admin.from("founder_approval_items").insert({
        business_id: t.business_id, approval_type: "inbound_reply", source_system: "inbox_agent_worker",
        source_table: "ai_agent_task_queue", source_id: t.id, agent_key: TO_AGENT, contact_id: t.contact_id,
        title, summary, priority_level: "high", status: "pending",
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false, ...extra,
      });

    const fail = async (code: string, retryable: boolean) => {
      if (retryable && attempts < MAX_ATTEMPTS) {
        stats.retried++;
        return finish("retry", { ...prev, last_error: code }, code);
      }
      stats.dead_lettered++;
      await finish("dead_letter", { ...prev, last_error: code }, code);
      await notify("Reply needs you: the inbox agent could not process it",
        `The agent failed (${code}) after ${attempts} attempt(s). Please read the reply in Smartlead.`, {});
    };

    try {
      const { data: h } = await admin.from("agent_handover_log").select("business_id,contact_id,context_payload").eq("id", t.source_id).maybeSingle();
      const ctx = (h?.context_payload ?? {}) as any;
      const businessId = t.business_id ?? h?.business_id;
      const campaignId = ctx.provider_campaign_id ? String(ctx.provider_campaign_id) : null;
      const leadId = ctx.provider_lead_id ? String(ctx.provider_lead_id) : null;

      // Isolation: business, campaign and contact must match an active mapping.
      const { data: map } = businessId && campaignId
        ? await admin.from("outbound_provider_campaign_mappings").select("business_id")
            .eq("provider_type", "smartlead").eq("provider_campaign_id", campaignId).eq("business_id", businessId).limit(1)
        : { data: [] };
      const { data: rel } = businessId
        ? await admin.from("business_contact_relationships").select("id").eq("business_id", businessId).eq("contact_id", t.contact_id).limit(1)
        : { data: [] };
      const identity = businessId && campaignId && leadId
        ? await admin.rpc("crm_smartlead_identity", { p_business: businessId, p_campaign: campaignId, p_lead: leadId })
        : { data: [], error: null };
      if (!map?.length || !rel?.length || !leadId || identity.error || identity.data?.length !== 1 || identity.data[0].contact_id !== t.contact_id) {
        stats.held++;
        await finish("needs_founder", { ...prev, held_reason: "business_campaign_or_lead_not_matched" }, "attribution_unmatched");
        await notify("Reply could not be matched to its business/campaign",
          "The inbox agent held this reply because its business, campaign or lead could not be confirmed. No draft written.", {});
        continue;
      }

      const conversation = await conversationContext(admin, businessId, campaignId, leadId);
      const newest = conversation.rows.find((m: any) => m.direction === "REPLY");
      if (!newest || !reviewableReply(newest)) {
        stats.held++;
        await finish("needs_founder", { ...prev, held_reason: "no_genuine_matched_reply" });
        continue;
      }
      const reply = redact(stripHtml(newest.body_html ?? ""));
      const first = String(ctx.contact_name ?? "").trim().split(/\s+/)[0] || "";
      const { data: lastSent } = await admin.from("smartlead_thread_messages").select("subject")
        .eq("business_id", businessId).eq("provider_campaign_id", campaignId).eq("provider_lead_id", leadId)
        .neq("direction", "REPLY").order("sent_at", { ascending: false }).limit(1).maybeSingle();

      // Deterministic opt-out wins even if the model is unavailable.
      let category: string; let reason: string; let summary: string; let draft = "";
      if (OPT_OUT_RE.test(reply)) {
        category = "wants_out"; reason = "Reply contains explicit opt-out wording."; summary = "Asked not to be contacted.";
      } else {
        if (!key) { await fail("ai_key_missing", false); continue; }
        const r = await classify(key, first, reply, lastSent?.subject ?? "", conversation.context);
        if (r.status !== 200) {
          { await fail(`ai_${r.status}`, r.status === 429 || r.status >= 500); continue; }
        }
        const out = (r as any).out;
        category = CATEGORIES.includes(out.category) ? out.category : "other";
        reason = String(out.reason ?? "").slice(0, 400);
        summary = String(out.summary ?? "").slice(0, 400);
        draft = String(out.draft ?? "").trim().slice(0, 4000);
      }

      const output: any = { category, reason, summary, business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId };

      if (category === "wants_out") {
        await admin.rpc("apply_reply_stop_suppression", { p_contact_id: t.contact_id, p_message_body: "unsubscribe", p_source: "inbox_agent_opt_out" });
        await admin.from("business_contact_relationships").update({ do_not_contact: true, campaign_eligible: false })
          .eq("business_id", businessId).eq("contact_id", t.contact_id);
        stats.opted_out++;
        await finish("completed", { ...output, suppressed: true, draft_id: null });
        await notify("Opt-out enforced", `${summary} They are now suppressed; no reply or follow-up will be drafted.`,
          { recommended_action: "No action needed. Smartlead already stopped the sequence on reply.", metadata: { category, reason } });
        continue;
      }

      let draftId: string | null = null;
      if (draft) {
        const { data: existing } = await admin.from("smartlead_reply_drafts").select("id").eq("source_task_id", t.id).limit(1);
        draftId = existing?.[0]?.id ?? null;
        if (!draftId) {
          const { data: d, error } = await admin.from("smartlead_reply_drafts").insert({
            business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
            source_reply_row_id: newest.id,
            body: draft, status: "draft", agent_category: category, agent_summary: `${summary} (${reason})`, source_task_id: t.id,
          }).select("id").single();
          if (error) { await fail("draft_insert_failed", true); continue; }
          draftId = d.id;
        }
        stats.drafted++;
      }
      await finish("awaiting_founder_approval", { ...output, draft_id: draftId });
      const { data: dupe } = await admin.from("founder_approval_items").select("id").eq("source_id", t.id).eq("approval_type", "inbound_reply").limit(1);
      if (!dupe?.length) {
        await notify(`Reply: ${category.replace(/_/g, " ")}${first ? ` from ${first}` : ""}`, `${summary} — ${reason}`, {
          draft_body: draft || null,
          recommended_action: draftId ? "Review and approve the draft in the customer's CRM conversation. Approval does not send." : "No reply drafted; read and decide.",
          metadata: { category, reason, draft_id: draftId, provider_campaign_id: campaignId, provider_lead_id: leadId },
        });
      }
    } catch {
      await fail("worker_error", true);
    }
  }
  return stats;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await founderGuard(req, corsHeaders);
  if (denied) return denied;

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return json({ error: "server_configuration_missing" }, 503);
    const admin = createClient(
      url,
      service,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    // Founder-requested drafting for one exact thread; no provider mutations.
    if (body.action === "prepare_reply") {
      const business = String(body.business_id ?? "");
      const campaign = String(body.campaign_id ?? "");
      const lead = String(body.lead_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(business) || !/^\d{1,12}$/.test(campaign) || !/^\d{1,20}$/.test(lead)) return json({ error: "invalid_conversation" }, 400);
      const { data: identities, error: identityError } = await admin.rpc("crm_smartlead_identity", { p_business: business, p_campaign: campaign, p_lead: lead });
      if (identityError || identities?.length !== 1) return json({ error: "Conversation could not be matched to one customer." }, 409);
      const conversation = await conversationContext(admin, business, campaign, lead);
      const newest = conversation.rows.find((m: any) => m.direction === "REPLY");
      if (!newest || !reviewableReply(newest) || newest.contact_id !== identities[0].contact_id) return json({ error: "A genuine customer reply is required; automatic replies and bounces are not conversations." }, 409);
      const { data: existing, error: existingError } = await admin.from("smartlead_reply_drafts").select("id,status")
        .eq("business_id", business).eq("provider_campaign_id", campaign).eq("provider_lead_id", lead)
        .eq("source_reply_row_id", newest.id).in("status", ["draft", "approved", "sending", "sent", "send_unknown"]).limit(1);
      if (existingError) throw new Error("draft_lookup_failed");
      if (existing?.length) return json({ ok: true, draft_id: existing[0].id, sent: false, reused: true });
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return json({ error: "AI is not configured." }, 503);
      const reply = redact(stripHtml(newest.body_html ?? ""));
      if (OPT_OUT_RE.test(reply)) return json({ error: "This reply asks not to be contacted; no draft prepared." }, 409);
      const result = await classify(key, "", reply, newest.subject ?? "", conversation.context);
      if (result.status !== 200 || !result.out) return json({ error: result.error ?? "AI could not prepare a draft." }, result.status);
      if (!result.out.draft.trim() || ["wants_out", "out_of_office"].includes(result.out.category)) return json({ error: "This reply needs review rather than an email response." }, 409);
      const { data: draft, error: saveError } = await admin.from("smartlead_reply_drafts").insert({
        business_id: business, provider_campaign_id: campaign, provider_lead_id: lead, source_reply_row_id: newest.id,
        body: result.out.draft.trim().slice(0, 20000), agent_category: result.out.category, agent_summary: result.out.summary,
      }).select("id").single();
      if (saveError) return json({ error: saveError.message }, 409);
      return json({ ok: true, draft_id: draft.id, sent: false });
    }
    const dryRun = body?.dry_run !== false;
    const maxItems = Math.max(1, Math.min(100, Number(body?.max_items ?? 25)));
    const businessId: string | undefined =
      typeof body?.business_id === "string" && body.business_id ? body.business_id : undefined;

    const sinceIso = new Date(Date.now() - IDEMPOTENCY_WINDOW_HOURS * 3600 * 1000).toISOString();

    const [fromPoll, fromReceiver] = await Promise.all([
      pollerReplies(admin, sinceIso, maxItems * 4),
      receiverReplies(admin, sinceIso, maxItems * 4),
    ]);

    // Same reply can arrive by both paths; keep one signal per contact+reply.
    const bySignal = new Map<string, ReplySignal>();
    for (const s of [...fromPoll, ...fromReceiver]) {
      const key = `${s.contact_id}|${s.occurred_at ?? s.source_id}`;
      if (!bySignal.has(key)) bySignal.set(key, s);
    }
    const signals = Array.from(bySignal.values()).slice(0, maxItems);

    const recent = await safeSelect(admin, "agent_handover_log", (q: any) =>
      q
        .select("id,contact_id,source_table,source_id,trigger_event,created_at")
        .eq("trigger_event", "reply_received")
        .gte("created_at", sinceIso)
        .limit(2000),
    );
    const seen = new Set(
      recent.map((r: any) => `${r.contact_id}|${r.source_table}|${r.source_id}`),
    );

    const proposed: any[] = [];
    const skipped: any[] = [];

    for (const s of signals) {
      if (seen.has(`${s.contact_id}|${s.source_table}|${s.source_id}`)) {
        skipped.push({ contact_id: s.contact_id, source: s.source_table, reason: "already_handed_over" });
        continue;
      }
      const contact = (
        await safeSelect(admin, "contacts", (q: any) =>
          q.select("id,email,name").eq("id", s.contact_id).limit(1),
        )
      )[0];
      if (!contact) {
        skipped.push({ contact_id: s.contact_id, source: s.source_table, reason: "contact_not_found" });
        continue;
      }
      const business =
        s.business_id ??
        (
          await safeSelect(admin, "business_contact_relationships", (q: any) =>
            q.select("business_id").eq("contact_id", s.contact_id).eq("do_not_contact", false).limit(1),
          )
        )[0]?.business_id ??
        null;

      proposed.push({
        business_id: business,
        contact_id: s.contact_id,
        conversation_id: null,
        from_agent_key: FROM_AGENT,
        to_agent_key: TO_AGENT,
        trigger_event: "reply_received",
        source_table: s.source_table,
        source_id: s.source_id,
        summary: `Inbound reply from ${contact.email ?? s.contact_id} handed to ${TO_AGENT} for triage.`,
        context_payload: {
          rule_key: RULE_KEY,
          from_customer_stage: "contacted",
          to_customer_stage: "new_reply",
          reply_occurred_at: s.occurred_at,
          reply_excerpt: s.detail,
          contact_email: contact.email,
          contact_name: contact.name,
          provider_campaign_id: s.provider_campaign_id,
          provider_lead_id: s.provider_lead_id,
        },
        priority_level: "high",
        status: "created",
        founder_review_required: true,
        rule_key: RULE_KEY,
      });
    }

    const summary = {
      reply_signals: signals.length,
      proposed: proposed.length,
      created: 0,
      tasks_created: 0,
      skipped: skipped.length,
    };

    if (!dryRun) {
      for (const p of proposed) {
        try {
          const { data: handover, error: hErr } = await admin
            .from("agent_handover_log")
            .insert(p)
            .select("id")
            .single();
          if (hErr || !handover) {
            skipped.push({ contact_id: p.contact_id, source: p.source_table, reason: "handover_insert_failed" });
            continue;
          }
          summary.created++;

          try {
            const { data: task } = await admin
              .from("ai_agent_task_queue")
              .insert({
                business_id: p.business_id,
                agent_key: p.to_agent_key,
                task_type: "reply_triage",
                task_title: `Triage inbound reply: ${p.contact_id.slice(0, 8)}`,
                task_summary: p.summary,
                source_system: "inbox_agent_reply_handover",
                source_table: "agent_handover_log",
                source_id: handover.id,
                contact_id: p.contact_id,
                priority_level: p.priority_level,
                status: "pending",
                founder_approval_required: true,
                auto_execute_allowed: false,
                execution_enabled: false,
                dry_run_only: true,
                recommended_action:
                  "Classify the reply and prepare a suggested answer for founder approval. Do not send anything.",
                due_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
              })
              .select("id")
              .single();
            if (task?.id) {
              summary.tasks_created++;
              await admin
                .from("agent_handover_log")
                .update({ task_id: task.id, status: "open" })
                .eq("id", handover.id);
            }
          } catch {
            /* task creation is best-effort; the handover row still records the reply */
          }
        } catch {
          skipped.push({ contact_id: p.contact_id, source: p.source_table, reason: "handover_write_failed" });
        }
      }
    }

    const worker = dryRun ? null : await processQueue(admin, maxItems);

    return json({
      ok: true,
      dry_run: dryRun,
      worker,
      generated_at: new Date().toISOString(),
      rule_key: RULE_KEY,
      summary,
      proposed: dryRun ? proposed : proposed.slice(0, 25),
      skipped,
      no_external_action: true,
      no_send_audit: {
        emails_sent: 0,
        smartlead_posts: 0,
        apollo_credits_spent: 0,
        providers_called: 0,
      },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "internal_error" }, 500);
  }
});
