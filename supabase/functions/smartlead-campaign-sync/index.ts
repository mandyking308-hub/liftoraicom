import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  assertMapping, backoffMs, dedupeKey, isRetryable, mapCampaignSnapshot, normEmail, sanitizeSenders, summarizeHistory, buildReplyPayload, deriveActivityEvents, suppressionFor,
  type HistoryMsg,
} from "../_shared/smartleadCampaignSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-liftor-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BASE = "https://server.smartlead.ai/api/v1";
const SEND_CONFIRM = "SEND THIS REPLY";

class ProviderError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

async function sl(path: string, key: string, init?: RequestInit): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`, init);
    if (res.ok) return await res.json();
    const body = (await res.text()).slice(0, 300);
    console.error(`smartlead ${path.split("?")[0]} -> ${res.status}`); // never log key or query
    if (!isRetryable(res.status) || attempt === 3) {
      throw new ProviderError(res.status, res.status === 401 ? "provider_unauthorized" : `provider_http_${res.status}:${body.replace(/api_key=[^&\s"]+/g, "api_key=***")}`);
    }
    await new Promise((r) => setTimeout(r, backoffMs(attempt)));
  }
  throw new ProviderError(0, "unreachable");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = (Deno.env.get("SMARTLEAD_API_KEY") ?? "").trim();

  const auth = req.headers.get("Authorization") ?? "";
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const syncToken = req.headers.get("x-liftor-sync-token") ?? "";
  let scheduledScope: { business_id: string; provider_campaign_id: string } | null = null;
  if (syncToken) {
    // Scheduler path: random token held only in a locked table; read-only sync for its one campaign.
    const { data: sch } = await admin.from("smartlead_sync_schedule").select("token, business_id, provider_campaign_id, enabled").eq("token", syncToken).maybeSingle();
    if (!sch || !sch.enabled || syncToken.length < 32 || sch.token !== syncToken) return json({ ok: false, error: "auth_invalid" }, 401);
    scheduledScope = { business_id: sch.business_id, provider_campaign_id: sch.provider_campaign_id };
  } else if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const token = auth.slice(7);

  let userId: string | null = null;
  let trigger = "manual";
  if (scheduledScope || token === SERVICE) {
    trigger = "scheduled";
  } else {
    const uc = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u, error } = await uc.auth.getUser(token);
    if (error || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const rs = new Set((roles ?? []).map((r: { role: string }) => r.role));
    if (!rs.has("founder") && !rs.has("admin")) return json({ ok: false, error: "forbidden" }, 403);
    userId = u.user.id;
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const action = String(body.action ?? "sync");
  const businessId = String(body.business_id ?? "");
  const campaignId = String(body.campaign_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(businessId) || !/^\d{1,12}$/.test(campaignId)) {
    return json({ ok: false, error: "invalid_business_or_campaign" }, 400);
  }
  if (trigger === "scheduled" && action !== "sync") return json({ ok: false, error: "human_required" }, 403);
  if (scheduledScope && (scheduledScope.business_id !== businessId || scheduledScope.provider_campaign_id !== campaignId)) {
    return json({ ok: false, error: "schedule_scope_mismatch" }, 403);
  }
  if (!KEY) return json({ ok: false, error: "smartlead_api_key_missing" }, 503);

  // Exact active business by id.
  const { data: biz } = await admin.from("businesses").select("id, name, portfolio_status").eq("id", businessId).maybeSingle();
  if (!biz || biz.portfolio_status !== "active") return json({ ok: false, error: "business_not_active" }, 400);
  const { data: maps } = await admin.from("outbound_provider_campaign_mappings")
    .select("business_id, provider_campaign_id, mapping_status").eq("provider_type", "smartlead").eq("provider_campaign_id", campaignId);
  const m = assertMapping(businessId, campaignId, (maps ?? []) as never);
  if (!m.ok) return json({ ok: false, error: m.error }, 400);

  // ---- Human-initiated reply send (explicit confirmation only) ----
  if (action === "send_reply") {
    if (!userId) return json({ ok: false, error: "human_required" }, 403);
    if (body.confirmation !== SEND_CONFIRM) return json({ ok: false, error: "confirmation_required", expected: SEND_CONFIRM }, 400);
    const draftId = String(body.draft_id ?? "");
    const { data: d } = await admin.from("smartlead_reply_drafts").select("*").eq("id", draftId)
      .eq("business_id", businessId).eq("provider_campaign_id", campaignId).maybeSingle();
    if (!d || d.status !== "draft") return json({ ok: false, error: "draft_not_found_or_not_draft" }, 400);
    const { data: last } = await admin.from("smartlead_thread_messages").select("provider_message_id, sent_at")
      .eq("business_id", businessId).eq("provider_campaign_id", campaignId).eq("provider_lead_id", d.provider_lead_id)
      .eq("direction", "REPLY").order("sent_at", { ascending: false }).limit(1).maybeSingle();
    if (!last?.provider_message_id || !last?.sent_at) return json({ ok: false, error: "reply_message_id_or_time_missing" }, 400);
    let payload: ReturnType<typeof buildReplyPayload>;
    try { payload = buildReplyPayload(d.provider_lead_id, d.body, last.provider_message_id, last.sent_at); }
    catch { return json({ ok: false, error: "reply_payload_incomplete" }, 400); }
    try {
      const r = await sl(`/campaigns/${campaignId}/reply-email-thread`, KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await admin.from("smartlead_reply_drafts").update({ status: "sent", sent_by: userId, sent_at: new Date().toISOString(), provider_response: JSON.stringify(r).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", draftId);
      return json({ ok: true, sent: true });
    } catch (e) {
      const code = e instanceof ProviderError ? e.code : "reply_failed";
      await admin.from("smartlead_reply_drafts").update({ provider_response: code, updated_at: new Date().toISOString() }).eq("id", draftId);
      return json({ ok: false, error: code }, 502);
    }
  }

  // ---- Opt-in open/click tracking for this pilot only ----
  if (action === "set_tracking") {
    if (!userId) return json({ ok: false, error: "human_required" }, 403);
    const opens = body.opens === true, clicks = body.clicks === true;
    if (body.confirmation !== "CHANGE TRACKING FOR THIS CAMPAIGN ONLY") return json({ ok: false, error: "confirmation_required" }, 400);
    try {
const cur = (await sl(`/campaigns/${campaignId}`, KEY)) as Record<string, unknown>;
      if (typeof cur.send_as_plain_text !== "boolean") return json({ ok: false, error: "plain_text_setting_unknown" }, 409);
      if ((opens || clicks) && cur.send_as_plain_text === true) return json({ ok: false, error: "plain_text_mode_blocks_tracking" }, 409);
      await sl(`/campaigns/${campaignId}/settings`, KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_settings: [...(opens ? [] : ["DONT_EMAIL_OPEN"]), ...(clicks ? [] : ["DONT_LINK_CLICK"])],
          stop_lead_settings: cur.stop_lead_settings ?? "REPLY_TO_AN_EMAIL",
          send_as_plain_text: cur.send_as_plain_text,
          follow_up_percentage: cur.follow_up_percentage ?? 100,
        }),
      });
      return json({ ok: true, opens_tracked: opens, clicks_tracked: clicks });
    } catch (e) {
      return json({ ok: false, error: (e as ProviderError).code }, 502);
    }
  }

  // ---- Read-only reconciliation ----
  const started = Date.now();
  const { data: run } = await admin.from("smartlead_sync_runs").insert({
    business_id: businessId, provider_campaign_id: campaignId, trigger, triggered_by: userId,
  }).select("id").single();
  const nowIso = () => new Date().toISOString();
  try {
    const [campaign, analytics, accounts] = await Promise.all([
      sl(`/campaigns/${campaignId}`, KEY),
      sl(`/campaigns/${campaignId}/analytics`, KEY),
      sl(`/campaigns/${campaignId}/email-accounts`, KEY),
    ]) as [Record<string, unknown>, Record<string, unknown>, unknown];
    let webhooks: unknown = null;
    try {
      const wh = (await sl(`/campaigns/${campaignId}/webhooks`, KEY)) as Array<Record<string, unknown>>;
      webhooks = (Array.isArray(wh) ? wh : []).map((w) => ({ id: w.id, name: w.name, updated_at: w.updated_at, event_types: w.event_types, categories: w.categories, url_host: String(w.webhook_url ?? "").replace(/^https?:\/\/([^/]+).*$/, "$1"), url_path: String(w.webhook_url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0] }));
    } catch { webhooks = null; }

    const leads: Array<Record<string, unknown>> = [];
    for (let off = 0; off < 2000; off += 100) {
      const page = (await sl(`/campaigns/${campaignId}/leads?offset=${off}&limit=100`, KEY)) as { data?: unknown[] };
      const rows = (page.data ?? []) as Array<Record<string, unknown>>;
      leads.push(...rows);
      if (rows.length < 100) break;
    }

    // Map provider leads to Liftor contacts only via this business's relationships + exact normalised email.
    const { data: rels } = await admin.from("business_contact_relationships")
      .select("id, contact_id, contacts!inner(email)").eq("business_id", businessId);
    const relByEmail = new Map<string, { id: string; contact_id: string }>();
    for (const r of (rels ?? []) as Array<{ id: string; contact_id: string; contacts: { email: string | null } }>) {
      const e = normEmail(r.contacts?.email); if (e) relByEmail.set(e, { id: r.id, contact_id: r.contact_id });
    }
    // Light read-back for large campaigns: Smartlead allows 200 requests/min, so
    // per-lead message history is only fetched for leads that can have meaningful
    // events (replied/categorised, unsubscribed, or no longer in progress). All
    // leads still get identity/status snapshots and state-based activity events.
    const light = body.mode === "light" || leads.length > 200;
    const LIGHT_HISTORY_CAP = 150;
    let historyFetches = 0;
    let messagesSeen = 0, newMessages = 0, newEvents = 0;

    // DB writes are batched: thousands of leads must not mean thousands of
    // round-trips, or large campaigns exceed the function's time limit.
    const snapRows: Record<string, unknown>[] = [];
    const msgRows: Record<string, unknown>[] = [];
    type EvMeta = { ev: ReturnType<typeof deriveActivityEvents>[number]; rel: { id: string; contact_id: string } | null; contactId: string | null; leadId: string; email: string | null; action: string | null };
    const evRows: Record<string, unknown>[] = [];
    const evMeta: EvMeta[] = [];

    for (const row of leads) {
      const lead = (row.lead ?? {}) as Record<string, unknown>;
      const leadId = String(lead.id);
      const st = String(row.status ?? "").toUpperCase();
      const mayHaveEvents = lead.lead_category_id != null || lead.is_unsubscribed === true || (st !== "" && st !== "STARTED" && st !== "INPROGRESS");
      const fetchHistory = !light || (mayHaveEvents && historyFetches < LIGHT_HISTORY_CAP);
      let history: HistoryMsg[] = [];
      if (fetchHistory) {
        historyFetches++;
        const hist = (await sl(`/campaigns/${campaignId}/leads/${leadId}/message-history`, KEY)) as { history?: HistoryMsg[] };
        history = hist.history ?? [];
      }
      messagesSeen += history.length;
      const sum = summarizeHistory(history);
      const email = normEmail(lead.email);
      const rel = relByEmail.get(email ?? "") ?? null;
      const contactId: string | null = rel?.contact_id ?? null;
      snapRows.push({
        business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
        campaign_lead_map_id: row.campaign_lead_map_id ? String(row.campaign_lead_map_id) : null,
        liftor_contact_id: contactId,
        first_name: lead.first_name ?? null, last_name: lead.last_name ?? null, email,
        company_name: lead.company_name ?? null, lead_status: row.status ?? null,
        lead_category_id: row.lead_category_id != null ? String(row.lead_category_id) : null,
        is_unsubscribed: lead.is_unsubscribed === true,
        // In light mode, leads without a history fetch keep their previous summary.
        ...(fetchHistory ? sum : {}),
        updated_at: nowIso(),
      });
      for (const msg of history) {
        msgRows.push({
          business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
          dedupe_key: dedupeKey(msg), provider_message_id: msg.message_id ?? null, provider_stats_id: msg.stats_id ?? null,
          direction: String(msg.type ?? "").toUpperCase() || "UNKNOWN", from_email: msg.from ?? null, to_email: msg.to ?? null,
          subject: msg.subject ?? null, body_html: msg.email_body ?? null,
          sequence_number: msg.email_seq_number != null ? Number(msg.email_seq_number) : null,
          sent_at: msg.time ?? null, open_count: msg.open_count ?? null, click_count: msg.click_count ?? null,
        });
      }
      // Durable activity events (idempotent) + protective actions for this contact/business only.
      const events = deriveActivityEvents(leadId, { status: row.status, is_unsubscribed: lead.is_unsubscribed, lead_category_id: row.lead_category_id }, history);
      for (const ev of events) {
        const action = suppressionFor(ev.event_type);
        evRows.push({
          business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
          liftor_contact_id: contactId, business_contact_relationship_id: rel?.id ?? null,
          event_type: ev.event_type, dedupe_key: ev.dedupe_key, provider_message_id: ev.provider_message_id,
          occurred_at: ev.occurred_at, details: ev.details, liftor_action: action,
        });
        evMeta.push({ ev, rel, contactId, leadId, email, action });
      }
    }

    const CHUNK = 500;
    for (let i = 0; i < snapRows.length; i += CHUNK) {
      await admin.from("smartlead_lead_snapshots").upsert(snapRows.slice(i, i + CHUNK));
    }
    for (let i = 0; i < msgRows.length; i += CHUNK) {
      const { data: ins } = await admin.from("smartlead_thread_messages")
        .upsert(msgRows.slice(i, i + CHUNK), { onConflict: "business_id,provider_campaign_id,dedupe_key", ignoreDuplicates: true }).select("id");
      newMessages += ins?.length ?? 0;
    }

    // Insert events in chunks; only newly inserted events drive CRM updates.
    const ledgerRows: Record<string, unknown>[] = [];
    const contactUpdates: Array<{ ev: EvMeta["ev"]; rel: NonNullable<EvMeta["rel"]>; at: string }> = [];
    const relUpdates: Array<{ relId: string; ev: EvMeta["ev"]; action: string; contactId: string }> = [];
    for (let i = 0; i < evRows.length; i += CHUNK) {
      const { data: insEv } = await admin.from("smartlead_activity_events")
        .upsert(evRows.slice(i, i + CHUNK), { onConflict: "business_id,provider_campaign_id,dedupe_key", ignoreDuplicates: true }).select("id, dedupe_key");
      const idByKey = new Map((insEv ?? []).map((r: { id: string; dedupe_key: string }) => [r.dedupe_key, r.id]));
      for (let j = i; j < Math.min(i + CHUNK, evRows.length); j++) {
        const meta = evMeta[j];
        const evId = idByKey.get(meta.ev.dedupe_key);
        if (!evId) continue; // already recorded by an earlier sync
        newEvents++;
        const at = meta.ev.occurred_at ?? nowIso();
        if (meta.rel) {
          contactUpdates.push({ ev: meta.ev, rel: meta.rel, at });
          if (["email_reply", "email_sent", "first_email_sent", "lead_blocked_or_bounced", "lead_unsubscribed"].includes(meta.ev.event_type)) {
            const inbound = meta.ev.event_type === "email_reply";
            ledgerRows.push({
              business_id: businessId, contact_id: meta.rel.contact_id, business_contact_relationship_id: meta.rel.id,
              source_system: "smartlead", source_channel: "email", channel_key: "email", source_table: "smartlead_activity_events", source_id: evId,
              interaction_type: meta.ev.event_type, direction: inbound ? "inbound" : meta.ev.event_type.includes("sent") ? "outbound" : "system",
              provider_type: "smartlead", provider_message_id: meta.ev.provider_message_id, provider_campaign_id: campaignId, provider_lead_id: meta.leadId,
              contact_email: meta.email, summary: meta.ev.event_type.replace(/_/g, " "),
              body_preview: inbound ? (meta.ev.details as { preview?: string | null })?.preview ?? null : null,
              occurred_at: at, matched_status: "matched", dedupe_key: `smartlead:${businessId}:${campaignId}:${meta.ev.dedupe_key}`,
              founder_review_required: inbound, ai_relevant: inbound,
            });
          }
          if (meta.action) relUpdates.push({ relId: meta.rel.id, ev: meta.ev, action: meta.action, contactId: meta.rel.contact_id });
        }
      }
    }

    for (let i = 0; i < ledgerRows.length; i += CHUNK) {
      await admin.from("crm_interaction_ledger").insert(ledgerRows.slice(i, i + CHUNK) as never);
    }
    // Keep the central CRM contact current (this business's matched contact only).
    for (const u of contactUpdates) {
      if (u.ev.event_type === "email_reply") {
        await admin.from("contacts").update({ conversation_active: true, last_replied_at: u.at } as never).eq("id", u.rel.contact_id);
        await admin.from("contacts").update({ status: "ENGAGED" } as never).eq("id", u.rel.contact_id).in("status", ["NEW", "CONTACTED"]);
      } else if (u.ev.event_type === "email_sent" || u.ev.event_type === "first_email_sent") {
        await admin.from("contacts").update({ last_contacted_at: u.at } as never).eq("id", u.rel.contact_id).or(`last_contacted_at.is.null,last_contacted_at.lt.${u.at}`);
        await admin.from("contacts").update({ status: "CONTACTED" } as never).eq("id", u.rel.contact_id).eq("status", "NEW");
      } else if (u.ev.event_type === "lead_blocked_or_bounced") {
        await admin.from("contacts").update({ hard_bounced: true } as never).eq("id", u.rel.contact_id);
      }
    }
    for (const u of relUpdates) {
      if (u.action === "do_not_contact") {
        await admin.from("business_contact_relationships").update({ do_not_contact: true, campaign_eligible: false, do_not_contact_reason: `smartlead_${u.ev.event_type}` } as never).eq("id", u.relId).eq("business_id", businessId);
        if (u.ev.event_type === "lead_unsubscribed") await admin.from("contacts").update({ status: "DO_NOT_CONTACT" } as never).eq("id", u.contactId);
      } else if (u.action === "stop_followups") {
        await admin.from("business_contact_relationships").update({ campaign_eligible: false } as never).eq("id", u.relId).eq("business_id", businessId);
      }
    }

    await admin.from("smartlead_campaign_snapshots").upsert({
      business_id: businessId, provider_campaign_id: campaignId, ...mapCampaignSnapshot(campaign, analytics),
      senders: sanitizeSenders(accounts), webhooks, send_as_plain_text: typeof campaign.send_as_plain_text === "boolean" ? campaign.send_as_plain_text : null, last_success_at: nowIso(), last_attempt_at: nowIso(), last_error: null, updated_at: nowIso(),
    });
    await admin.from("smartlead_sync_runs").update({
      status: "succeeded", finished_at: nowIso(), latency_ms: Date.now() - started,
      leads_seen: leads.length, messages_seen: messagesSeen, new_messages: newMessages,
    }).eq("id", run?.id);
    return json({ ok: true, leads: leads.length, messages: messagesSeen, new_messages: newMessages, new_events: newEvents, campaign_status: campaign.status });
  } catch (e) {
    const pe = e instanceof ProviderError ? e : new ProviderError(0, "sync_failed");
    await admin.from("smartlead_sync_runs").update({ status: "failed", finished_at: nowIso(), latency_ms: Date.now() - started, error_code: pe.code.slice(0, 200), http_status: pe.status }).eq("id", run?.id);
    await admin.from("smartlead_campaign_snapshots").upsert({ business_id: businessId, provider_campaign_id: campaignId, last_attempt_at: nowIso(), last_error: pe.code.slice(0, 200), updated_at: nowIso() });
    return json({ ok: false, error: pe.code }, 502);
  }
});
