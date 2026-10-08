import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  assertMapping, backoffMs, dedupeKey, isRetryable, mapCampaignSnapshot, normEmail, sanitizeSenders, summarizeHistory, buildReplyPayload,
  type HistoryMsg,
} from "../_shared/smartleadCampaignSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const token = auth.slice(7);
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

  // Scheduler path: service-role token. Otherwise founder/admin user only.
  let userId: string | null = null;
  let trigger = "manual";
  if (token === SERVICE) {
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
    try {
      const r = await sl(`/campaigns/${campaignId}/reply-email-thread`, KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReplyPayload(d.provider_lead_id, d.body, last.provider_message_id, last.sent_at)),
      });
      await admin.from("smartlead_reply_drafts").update({ status: "sent", sent_by: userId, sent_at: new Date().toISOString(), provider_response: JSON.stringify(r).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", draftId);
      return json({ ok: true, sent: true });
    } catch (e) {
      const pe = e as ProviderError;
      await admin.from("smartlead_reply_drafts").update({ provider_response: pe.code, updated_at: new Date().toISOString() }).eq("id", draftId);
      return json({ ok: false, error: pe.code }, pe.status === 401 ? 502 : 502);
    }
  }

  // ---- Opt-in open/click tracking for this pilot only ----
  if (action === "set_tracking") {
    if (!userId) return json({ ok: false, error: "human_required" }, 403);
    const opens = body.opens === true, clicks = body.clicks === true;
    if (body.confirmation !== "CHANGE TRACKING FOR THIS CAMPAIGN ONLY") return json({ ok: false, error: "confirmation_required" }, 400);
    try {
const cur = (await sl(`/campaigns/${campaignId}`, KEY)) as Record<string, unknown>;
      await sl(`/campaigns/${campaignId}/settings`, KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_settings: [...(opens ? [] : ["DONT_EMAIL_OPEN"]), ...(clicks ? [] : ["DONT_LINK_CLICK"])],
          stop_lead_settings: cur.stop_lead_settings ?? "REPLY_TO_AN_EMAIL",
          send_as_plain_text: cur.send_as_plain_text ?? true,
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

    const leads: Array<Record<string, unknown>> = [];
    for (let off = 0; off < 2000; off += 100) {
      const page = (await sl(`/campaigns/${campaignId}/leads?offset=${off}&limit=100`, KEY)) as { data?: unknown[] };
      const rows = (page.data ?? []) as Array<Record<string, unknown>>;
      leads.push(...rows);
      if (rows.length < 100) break;
    }

    let messagesSeen = 0, newMessages = 0;
    for (const row of leads) {
      const lead = (row.lead ?? {}) as Record<string, unknown>;
      const leadId = String(lead.id);
      const hist = (await sl(`/campaigns/${campaignId}/leads/${leadId}/message-history`, KEY)) as { history?: HistoryMsg[] };
      const history = hist.history ?? [];
      messagesSeen += history.length;
      const sum = summarizeHistory(history);
      const contactId = (lead.custom_fields as Record<string, unknown> | undefined)?.liftor_contact_id;
      await admin.from("smartlead_lead_snapshots").upsert({
        business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
        campaign_lead_map_id: row.campaign_lead_map_id ? String(row.campaign_lead_map_id) : null,
        liftor_contact_id: typeof contactId === "string" && /^[0-9a-f-]{36}$/i.test(contactId) ? contactId : null,
        first_name: lead.first_name ?? null, last_name: lead.last_name ?? null, email: normEmail(lead.email),
        company_name: lead.company_name ?? null, lead_status: row.status ?? null,
        lead_category_id: row.lead_category_id != null ? String(row.lead_category_id) : null,
        is_unsubscribed: lead.is_unsubscribed === true, ...sum, updated_at: nowIso(),
      });
      for (const msg of history) {
        const { data: ins } = await admin.from("smartlead_thread_messages").upsert({
          business_id: businessId, provider_campaign_id: campaignId, provider_lead_id: leadId,
          dedupe_key: dedupeKey(msg), provider_message_id: msg.message_id ?? null, provider_stats_id: msg.stats_id ?? null,
          direction: String(msg.type ?? "").toUpperCase() || "UNKNOWN", from_email: msg.from ?? null, to_email: msg.to ?? null,
          subject: msg.subject ?? null, body_html: msg.email_body ?? null,
          sequence_number: msg.email_seq_number != null ? Number(msg.email_seq_number) : null,
          sent_at: msg.time ?? null, open_count: msg.open_count ?? null, click_count: msg.click_count ?? null,
        }, { onConflict: "business_id,provider_campaign_id,dedupe_key", ignoreDuplicates: true }).select("id");
        newMessages += ins?.length ?? 0;
      }
      // Suppression sync: unsubscribed in Smartlead -> mark matching Liftor contact (this contact only).
      if (lead.is_unsubscribed === true && typeof contactId === "string") {
        await admin.from("contacts").update({ status: "DO_NOT_CONTACT" } as never).eq("id", contactId);
      }
    }

    await admin.from("smartlead_campaign_snapshots").upsert({
      business_id: businessId, provider_campaign_id: campaignId, ...mapCampaignSnapshot(campaign, analytics),
      senders: sanitizeSenders(accounts), last_success_at: nowIso(), last_attempt_at: nowIso(), last_error: null, updated_at: nowIso(),
    });
    await admin.from("smartlead_sync_runs").update({
      status: "succeeded", finished_at: nowIso(), latency_ms: Date.now() - started,
      leads_seen: leads.length, messages_seen: messagesSeen, new_messages: newMessages,
    }).eq("id", run?.id);
    return json({ ok: true, leads: leads.length, messages: messagesSeen, new_messages: newMessages, campaign_status: campaign.status });
  } catch (e) {
    const pe = e instanceof ProviderError ? e : new ProviderError(0, "sync_failed");
    await admin.from("smartlead_sync_runs").update({ status: "failed", finished_at: nowIso(), latency_ms: Date.now() - started, error_code: pe.code.slice(0, 200), http_status: pe.status }).eq("id", run?.id);
    await admin.from("smartlead_campaign_snapshots").upsert({ business_id: businessId, provider_campaign_id: campaignId, last_attempt_at: nowIso(), last_error: pe.code.slice(0, 200), updated_at: nowIso() });
    return json({ ok: false, error: pe.code }, 502);
  }
});
