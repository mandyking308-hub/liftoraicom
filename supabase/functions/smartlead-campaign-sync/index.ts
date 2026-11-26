import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { oldestConversationFirst } from "../_shared/crmReplyDrafting.ts";
import {
  assertMapping, backoffMs, dedupeKey, isRetryable, mapCampaignSnapshot, normEmail, sanitizeSenders, summarizeHistory, buildReplyPayload, deriveActivityEvents, suppressionFor, stripHtml,
  type HistoryMsg,
} from "../_shared/smartleadCampaignSync.ts";

const corsHeaders = {
  ...sdkCorsHeaders,
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
    // A reply POST has no proven provider idempotency key: never retry it.
    if (init?.method && init.method !== "GET") throw new ProviderError(res.status, "provider_write_outcome_requires_review");
    await new Promise((r) => setTimeout(r, backoffMs(attempt)));
  }
  throw new ProviderError(0, "unreachable");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON = Deno.env.get("SUPABASE_ANON_KEY");
  if (!URL_ || !SERVICE || !ANON) return json({ ok: false, error: "server_configuration_missing" }, 503);
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
    if (!d || d.status !== "approved" || !d.approved_at || !d.approved_by) return json({ ok: false, error: "founder_approved_draft_required" }, 400);
    const { data: identity, error: identityError } = await admin.rpc("crm_smartlead_identity", { p_business: businessId, p_campaign: campaignId, p_lead: d.provider_lead_id });
    if (identityError || identity?.length !== 1 || identity[0].contact_id !== d.contact_id) return json({ ok: false, error: "conversation_identity_changed" }, 409);
    const { data: person, error: personError } = await admin.from("contacts").select("is_globally_suppressed, hard_bounced, do_not_contact_at, unsubscribed_at").eq("id", d.contact_id).single();
    const { data: relationship, error: relationshipError } = await admin.from("business_contact_relationships").select("do_not_contact").eq("id", d.relationship_id).single();
    // Reply-send gate: off = only the founder's own test address may receive a reply.
    const { data: gate } = await admin.from("external_action_gates").select("enabled, metadata").eq("gate_key", "smartlead_reply_send_gate").maybeSingle();
    const { data: recipient } = await admin.from("contacts").select("email").eq("id", d.contact_id).maybeSingle();
    const testList = ((gate?.metadata as { test_recipients?: string[] } | null)?.test_recipients ?? []).map((e) => e.toLowerCase());
    if (!gate || (!gate.enabled && !testList.includes(String(recipient?.email ?? "").toLowerCase()))) return json({ ok: false, error: "reply_sending_not_enabled" }, 403);
    if (personError || relationshipError || !person || !relationship || person.is_globally_suppressed || person.hard_bounced || person.do_not_contact_at || person.unsubscribed_at || relationship.do_not_contact) return json({ ok: false, error: "contact_blocked_or_lookup_failed" }, 409);
    const { data: last } = await admin.from("smartlead_thread_messages").select("id, provider_message_id, sent_at, reply_kind")
      .eq("business_id", businessId).eq("provider_campaign_id", campaignId).eq("provider_lead_id", d.provider_lead_id)
      .eq("direction", "REPLY").order("sent_at", { ascending: false }).limit(1).maybeSingle();
    if (!last?.provider_message_id || !last?.sent_at) return json({ ok: false, error: "reply_message_id_or_time_missing" }, 400);
    if (last.id !== d.source_reply_row_id || last.reply_kind !== "reply") return json({ ok: false, error: "newer_reply_requires_review" }, 409);
    let payload: ReturnType<typeof buildReplyPayload>;
    try { payload = buildReplyPayload(d.provider_lead_id, d.body, last.provider_message_id, last.sent_at); }
    catch { return json({ ok: false, error: "reply_payload_incomplete" }, 400); }
    const { data: claimed, error: claimError } = await admin.from("smartlead_reply_drafts").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", d.id).eq("status", "approved").select("id");
    if (claimError || claimed?.length !== 1) return json({ ok: false, error: "reply_already_claimed_or_changed" }, 409);
    try {
      const r = await sl(`/campaigns/${campaignId}/reply-email-thread`, KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if ((r as { success?: boolean } | null)?.success === false) throw new ProviderError(0, "provider_did_not_confirm_reply");
      const { error: recordError } = await admin.from("smartlead_reply_drafts").update({ status: "sent", sent_by: userId, sent_at: new Date().toISOString(), provider_response: JSON.stringify(r).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", draftId).eq("status", "sending");
      if (recordError) return json({ ok: false, error: "provider_accepted_reply_record_needs_reconciliation", sent: true }, 502);
      return json({ ok: true, sent: true });
    } catch (e) {
      const code = e instanceof ProviderError ? e.code : "reply_failed";
      await admin.from("smartlead_reply_drafts").update({ status: "send_unknown", provider_response: code, updated_at: new Date().toISOString() }).eq("id", draftId).eq("status", "sending");
      return json({ ok: false, error: code }, 502);
    }
  }

  // ---- Check an uncertain send against Smartlead before anyone may resend ----
  if (action === "verify_reply") {
    if (!userId) return json({ ok: false, error: "human_required" }, 403);
    const draftId = String(body.draft_id ?? "");
    const { data: d } = await admin.from("smartlead_reply_drafts").select("id, status, body, provider_lead_id, approved_at, updated_at")
      .eq("id", draftId).eq("business_id", businessId).eq("provider_campaign_id", campaignId).maybeSingle();
    if (!d || !["send_unknown", "sending"].includes(d.status)) return json({ ok: false, error: "nothing_to_verify" }, 400);
    if (d.status === "sending" && Date.now() - new Date(d.updated_at).getTime() < 120000) return json({ ok: false, error: "send_in_progress" }, 409);
    try {
      const hist = await sl(`/campaigns/${campaignId}/leads/${d.provider_lead_id}/message-history`, KEY) as { history?: HistoryMsg[] };
      if (!Array.isArray(hist.history)) return json({ ok: false, error: "provider_history_unavailable" }, 502);
      const norm = (v: string) => stripHtml(v).replace(/\s+/g, " ").trim().toLowerCase();
      const want = norm(d.body).slice(0, 120);
      const since = new Date(d.approved_at ?? 0).getTime() - 60000;
      const found = hist.history.find((m) => String(m.type ?? "").toUpperCase() === "SENT" && new Date(m.time ?? 0).getTime() >= since && want.length > 0 && norm(m.email_body ?? "").includes(want));
      const nowIso = new Date().toISOString();
      if (found) {
        await admin.from("smartlead_reply_drafts").update({ status: "sent", sent_by: userId, sent_at: found.time ?? nowIso, provider_response: `verified_in_history:${found.message_id ?? ""}`.slice(0, 500), updated_at: nowIso }).eq("id", d.id).in("status", ["send_unknown", "sending"]);
        return json({ ok: true, verified: "sent" });
      }
      await admin.from("smartlead_reply_drafts").update({ status: "approved", provider_response: "verified_not_in_history", updated_at: nowIso }).eq("id", d.id).in("status", ["send_unknown", "sending"]);
      return json({ ok: true, verified: "not_sent" });
    } catch (e) { return json({ ok: false, error: e instanceof ProviderError ? e.code : "verify_failed" }, 502); }
  }

  // ---- Opt-in open/click tracking for this pilot only ----
  if (action === "sync_thread") {
    if (!userId) return json({ ok: false, error: "human_required" }, 403);
    const leadId = String(body.lead_id ?? "");
    if (!/^\d{1,20}$/.test(leadId)) return json({ ok: false, error: "invalid_lead_id" }, 400);
    const { data: identities, error: identityError } = await admin.rpc("crm_smartlead_identity", { p_business: businessId, p_campaign: campaignId, p_lead: leadId });
    if (identityError || identities?.length !== 1) return json({ ok: false, error: "conversation_identity_unmatched" }, 409);
    try {
      const hist = await sl(`/campaigns/${campaignId}/leads/${leadId}/message-history`, KEY) as { history?: HistoryMsg[] };
      if (!Array.isArray(hist.history)) return json({ ok: false, error: "provider_history_unavailable" }, 502);
      const rows = hist.history.map((msg) => ({
        business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
        dedupe_key: dedupeKey(msg), provider_message_id: msg.message_id ?? null, provider_stats_id: msg.stats_id ?? null,
        direction: String(msg.type ?? "").toUpperCase() || "UNKNOWN", from_email: msg.from ?? null, to_email: msg.to ?? null,
        subject: msg.subject ?? null, body_html: msg.email_body ?? null,
        sequence_number: msg.email_seq_number != null ? Number(msg.email_seq_number) : null, sent_at: msg.time ?? null,
      }));
      if (rows.length) {
        const { error: writeError } = await admin.from("smartlead_thread_messages").upsert(rows, { onConflict: "business_id,provider_campaign_id,dedupe_key", ignoreDuplicates: true });
        if (writeError) throw new ProviderError(0, "thread_save_failed");
      }
      const { error: checkedError } = await admin.from("smartlead_lead_snapshots").update({ history_checked_at: new Date().toISOString() }).eq("business_id", businessId).eq("provider_campaign_id", campaignId).eq("provider_lead_id", leadId);
      if (checkedError) throw new ProviderError(0, "thread_check_record_failed");
      return json({ ok: true, messages: rows.length, sent: false });
    } catch (error) { return json({ ok: false, error: error instanceof ProviderError ? error.code : "thread_sync_failed" }, 502); }
  }
  if (action !== "sync" && action !== "set_tracking") return json({ ok: false, error: "invalid_action" }, 400);
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
    for (let off = 0; off < 50000; off += 100) {
      const page = (await sl(`/campaigns/${campaignId}/leads?offset=${off}&limit=100`, KEY)) as { data?: unknown[] };
      const rows = (page.data ?? []) as Array<Record<string, unknown>>;
      leads.push(...rows);
      if (rows.length < 100) break;
    }

    // Per-person send statistics (read-only). Gives emails sent, current step,
    // opens/replies/bounces for every lead without per-lead history calls.
    type Stat = { sent: number; step: number | null; first: string | null; last: string | null; opens: number; clicks: number; replied: boolean; lastReply: string | null; bounced: boolean; unsub: boolean };
    const stats = new Map<string, Stat>();
    let statsOk = false;
    try {
      for (let off = 0; off < 200000; off += 500) {
        const pg = (await sl(`/campaigns/${campaignId}/statistics?offset=${off}&limit=500`, KEY)) as { data?: Array<Record<string, unknown>> };
        const rows = pg.data ?? [];
        for (const r of rows) {
          const e = normEmail(r.lead_email); if (!e) continue;
          const s = stats.get(e) ?? { sent: 0, step: null, first: null, last: null, opens: 0, clicks: 0, replied: false, lastReply: null, bounced: false, unsub: false };
          const t = r.sent_time ? String(r.sent_time) : null;
          if (t) { s.sent++; if (!s.first || t < s.first) s.first = t; if (!s.last || t > s.last) s.last = t; }
          const seq = r.sequence_number != null ? Number(r.sequence_number) : null;
          if (t && seq != null && (s.step == null || seq > s.step)) s.step = seq;
          s.opens += Number(r.open_count ?? 0) || 0; s.clicks += Number(r.click_count ?? 0) || 0;
          if (r.reply_time) { s.replied = true; const rt = String(r.reply_time); if (!s.lastReply || rt > s.lastReply) s.lastReply = rt; }
          if (r.is_bounced === true) s.bounced = true;
          if (r.is_unsubscribed === true) s.unsub = true;
          stats.set(e, s);
        }
        if (rows.length < 500) break;
      }
      statsOk = true;
    } catch { statsOk = false; }

    // Map provider leads to Liftor contacts only via this business's relationships + exact normalised email.
    // Page through every relationship: a single read stops at 1,000 rows, which left later contacts unmatched.
    const rels: unknown[] = [];
    for (let from = 0; from < 100000; from += 1000) {
      const { data: page, error: relErr } = await admin.from("business_contact_relationships")
        .select("id, contact_id, contacts!inner(email)").eq("business_id", businessId).order("id").range(from, from + 999);
      if (relErr) throw new ProviderError(0, "relationship_lookup_failed");
      rels.push(...(page ?? []));
      if ((page ?? []).length < 1000) break;
    }
    const relByEmail = new Map<string, { id: string; contact_id: string }>();
    const ambiguousEmails = new Set<string>();
    for (const r of rels as Array<{ id: string; contact_id: string; contacts: { email: string | null } }>) {
      const e = normEmail(r.contacts?.email);
      if (!e || ambiguousEmails.has(e)) continue;
      if (relByEmail.has(e)) { relByEmail.delete(e); ambiguousEmails.add(e); }
      else relByEmail.set(e, { id: r.id, contact_id: r.contact_id });
    }
    // Light read-back for large campaigns: Smartlead allows 200 requests/min, so
    // per-lead message history is only fetched for leads that can have meaningful
    // events (replied/categorised, unsubscribed, or no longer in progress). All
    // leads still get identity/status snapshots and state-based activity events.
    const light = body.mode === "light" || leads.length > 200;
    const checks = new Map<string, string | null>();
    for (let from = 0; from < 200000; from += 1000) {
      const { data: checked, error: checkedError } = await admin.from("smartlead_lead_snapshots").select("provider_lead_id,history_checked_at")
        .eq("business_id", businessId).eq("provider_campaign_id", campaignId).order("provider_lead_id").range(from, from + 999);
      if (checkedError) throw new ProviderError(0, "conversation_refresh_lookup_failed");
      for (const row of checked ?? []) checks.set(row.provider_lead_id, row.history_checked_at);
      if ((checked ?? []).length < 1000) break;
    }
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

    for (const row of oldestConversationFirst(leads, (row) => String((row.lead as Record<string, unknown>)?.id), checks)) {
      const lead = (row.lead ?? {}) as Record<string, unknown>;
      const leadId = String(lead.id);
      const st = String(row.status ?? "").toUpperCase();
      const mayHaveEvents = stats.get(normEmail(lead.email) ?? "")?.replied === true || lead.lead_category_id != null || lead.is_unsubscribed === true || (st !== "" && st !== "STARTED" && st !== "INPROGRESS");
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
        ...(fetchHistory ? { history_checked_at: nowIso() } : {}),
        ...(fetchHistory && history.length ? { sending_mailbox: history.filter((m) => (m.type ?? "").toUpperCase() === "SENT").map((m) => m.from).filter(Boolean).pop() ?? null } : {}),
        ...(statsOk ? (() => { const s = stats.get(email ?? ""); return s ? {
          sent_count: s.sent, current_step: s.step, first_sent_at: s.first, last_sent_at: s.last,
          open_count: s.sent ? s.opens : null, click_count: s.sent ? s.clicks : null, is_bounced: s.bounced,
          ...(fetchHistory ? {} : { last_reply_at: s.lastReply }),
        } : { sent_count: 0, current_step: null }; })() : {}),
        reconciled_at: nowIso(), removed_from_provider_at: null,
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

    // Reconcile: anyone Liftor lists for this campaign that Smartlead no longer lists
    // is marked removed (kept for history, never deleted).
    const seenIds = new Set(snapRows.map((r) => String(r.provider_lead_id)));
    const existing: string[] = [];
    for (let from = 0; from < 200000; from += 1000) {
      const { data: pg } = await admin.from("smartlead_lead_snapshots").select("provider_lead_id")
        .eq("business_id", businessId).eq("provider_campaign_id", campaignId).is("removed_from_provider_at", null).order("provider_lead_id").range(from, from + 999);
      existing.push(...((pg ?? []) as Array<{ provider_lead_id: string }>).map((r) => String(r.provider_lead_id)));
      if ((pg ?? []).length < 1000) break;
    }
    const CHUNK = 500;
    // Rows carry different fields (with/without history), and a mixed bulk upsert
    // nulls the missing ones. Write each field-shape group separately.
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const r of snapRows) { const k = Object.keys(r).sort().join(","); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
    for (const g of groups.values()) for (let i = 0; i < g.length; i += CHUNK) {
      const { error: snapErr } = await admin.from("smartlead_lead_snapshots").upsert(g.slice(i, i + CHUNK));
      if (snapErr) throw new ProviderError(0, `snapshot_write_failed:${snapErr.message}`.slice(0, 200));
    }
    const existingSet = new Set(existing);
    // Never treat an empty read as "everyone left".
    const gone = leads.length === 0 ? [] : existing.filter((id) => !seenIds.has(id));
    for (let i = 0; i < gone.length; i += 200) {
      await admin.from("smartlead_lead_snapshots").update({ removed_from_provider_at: nowIso() } as never)
        .eq("business_id", businessId).eq("provider_campaign_id", campaignId).in("provider_lead_id", gone.slice(i, i + 200));
    }
    const unmatched = snapRows.filter((r) => !r.liftor_contact_id).length;
    const reconciliation = {
      smartlead_people: leads.length, liftor_people_before: existing.length,
      newly_recorded: snapRows.filter((r) => !existingSet.has(String(r.provider_lead_id))).length,
      no_longer_in_smartlead: gone.length, not_matched_to_crm: unmatched, per_person_stats: statsOk,
      emails_sent_total: statsOk ? [...stats.values()].reduce((n, s) => n + s.sent, 0) : null,
    };
    for (let i = 0; i < msgRows.length; i += CHUNK) {
      const { data: ins, error: messageError } = await admin.from("smartlead_thread_messages")
        .upsert(msgRows.slice(i, i + CHUNK), { onConflict: "business_id,provider_campaign_id,dedupe_key", ignoreDuplicates: true }).select("id");
      if (messageError) throw new ProviderError(0, "conversation_message_save_failed");
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

    // Smartlead counts out-of-office and bounce notices as replies; Liftor counts real replies only.
    const realCount = async (types: string[]) => {
      const { count } = await admin.from("smartlead_activity_events").select("id", { count: "exact", head: true })
        .eq("business_id", businessId).eq("provider_campaign_id", campaignId).in("event_type", types);
      return count ?? 0;
    };
    const mapped = mapCampaignSnapshot(campaign, analytics);
    const realReplies = await realCount(["email_reply"]);
    const bounceEvents = await realCount(["lead_blocked_or_bounced"]);
    await admin.from("smartlead_campaign_snapshots").upsert({
      business_id: businessId, provider_campaign_id: campaignId, ...mapped,
      reply_count: realReplies, bounce_count: Math.max(mapped.bounce_count ?? 0, bounceEvents),
      senders: sanitizeSenders(accounts), webhooks, send_as_plain_text: typeof campaign.send_as_plain_text === "boolean" ? campaign.send_as_plain_text : null, last_success_at: nowIso(), last_attempt_at: nowIso(), last_error: null, updated_at: nowIso(),
    });
    await admin.from("smartlead_sync_runs").update({
      status: "succeeded", finished_at: nowIso(), latency_ms: Date.now() - started,
      leads_seen: leads.length, messages_seen: messagesSeen, new_messages: newMessages, reconciliation,
    } as never).eq("id", run?.id);
    return json({ ok: true, leads: leads.length, messages: messagesSeen, new_messages: newMessages, new_events: newEvents, campaign_status: campaign.status, reconciliation });
  } catch (e) {
    const pe = e instanceof ProviderError ? e : new ProviderError(0, "sync_failed");
    await admin.from("smartlead_sync_runs").update({ status: "failed", finished_at: nowIso(), latency_ms: Date.now() - started, error_code: pe.code.slice(0, 200), http_status: pe.status }).eq("id", run?.id);
    await admin.from("smartlead_campaign_snapshots").upsert({ business_id: businessId, provider_campaign_id: campaignId, last_attempt_at: nowIso(), last_error: pe.code.slice(0, 200), updated_at: nowIso() });
    return json({ ok: false, error: pe.code }, 502);
  }
});
