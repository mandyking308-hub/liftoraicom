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
import { founderGuard } from "../_shared/founderGuard.ts";

const corsHeaders = {
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
      .eq("event_type", "reply_received")
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

const CATEGORIES = ["interested", "question", "not_now", "wants_out", "out_of_office", "other"] as const;

/**
 * Inbox agent work: sort the reply and write a suggested answer as a Smartlead
 * reply DRAFT. Drafts only go out when the founder sends them from the
 * Smartlead Command Centre. Opt-outs get no draft and are marked do-not-contact.
 */
async function sortAndDraft(admin: any, taskId: string, p: any): Promise<boolean> {
  const ctx = p.context_payload ?? {};
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fail = async (msg: string) => {
    await admin.from("ai_agent_task_queue").update({ status: "needs_founder", error_message: msg }).eq("id", taskId);
    return false;
  };
  if (!key) return fail("ai_key_missing");
  const first = String(ctx.contact_name ?? "").trim().split(/\s+/)[0] || "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6.1-terra",
        messages: [
          { role: "system", content:
            "You are the inbox agent for Kindnesss (https://joinkindnesss.com), a kindness and wellbeing platform for schools and organisations with governance-ready reporting. " +
            "A prospect replied to a cold introduction email. Classify the reply and draft a short, warm, plain-English answer signed 'Kind regards, The Kindnesss Team'. " +
            "Never invent prices, dates, customers, statistics or promises. If they ask something you can't answer from this, offer a short call or to send details. " +
            "For wants_out, return an empty draft. For out_of_office, return an empty draft." },
          { role: "user", content: `First name: ${first || "(unknown)"}\nReply:\n${String(ctx.reply_excerpt ?? "").slice(0, 2000)}` },
        ],
        tools: [{ type: "function", function: {
          name: "sort_reply",
          parameters: { type: "object", additionalProperties: false, required: ["category", "summary", "draft"],
            properties: {
              category: { type: "string", enum: CATEGORIES },
              summary: { type: "string", description: "One sentence on what they said" },
              draft: { type: "string" },
            } },
        } }],
        tool_choice: { type: "function", function: { name: "sort_reply" } },
      }),
    });
    if (!res.ok) return fail(`ai_${res.status}`);
    const data = await res.json();
    const out = JSON.parse(data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    const category = CATEGORIES.includes(out.category) ? out.category : "other";
    const summary = String(out.summary ?? "").slice(0, 500);
    const draft = String(out.draft ?? "").trim();

    let draftId: string | null = null;
    if (category === "wants_out") {
      if (p.business_id) {
        await admin.from("business_contact_relationships").update({ do_not_contact: true })
          .eq("business_id", p.business_id).eq("contact_id", p.contact_id);
      }
    } else if (draft && p.business_id && ctx.provider_campaign_id && ctx.provider_lead_id) {
      const { data: d } = await admin.from("smartlead_reply_drafts").insert({
        business_id: p.business_id,
        provider_campaign_id: ctx.provider_campaign_id,
        provider_lead_id: ctx.provider_lead_id,
        body: draft,
        status: "draft",
        agent_category: category,
        agent_summary: summary,
        source_task_id: taskId,
      }).select("id").single();
      draftId = d?.id ?? null;
    }
    await admin.from("ai_agent_task_queue").update({
      status: "awaiting_founder_approval",
      agent_output: { category, summary, draft_id: draftId, draft_written: !!draftId, marked_do_not_contact: category === "wants_out", sent: false },
    }).eq("id", taskId);
    return !!draftId;
  } catch (e) {
    return fail(`agent_error:${(e as Error).message?.slice(0, 120)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await founderGuard(req, corsHeaders);
  if (denied) return denied;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
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
      drafts_created: 0,
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
              if (await sortAndDraft(admin, task.id, p)) summary.drafts_created++;
            }
          } catch {
            /* task creation is best-effort; the handover row still records the reply */
          }
        } catch {
          skipped.push({ contact_id: p.contact_id, source: p.source_table, reason: "handover_write_failed" });
        }
      }
    }

    return json({
      ok: true,
      dry_run: dryRun,
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
