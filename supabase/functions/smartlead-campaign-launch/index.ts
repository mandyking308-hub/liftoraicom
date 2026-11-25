import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evaluateOutboundSendability } from "../_shared/outboundSendability.ts";
import { selectSlotMailboxes } from "../_shared/mailboxSelection.ts";
import { backoffMs, isRetryable, normEmail } from "../_shared/smartleadCampaignSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BASE = "https://server.smartlead.ai/api/v1";
const LEAD_BATCH = 100;
const MAX_LEADS_PER_CALL = 2000;

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

type Admin = ReturnType<typeof createClient>;

/** Eligible CRM contacts for one business, with suppression/sendability safeguards applied. */
async function eligibleContacts(admin: Admin, businessId: string, contactIds?: string[]) {
  const rels: Array<Record<string, any>> = [];
  const sel = "id, contact_id, campaign_eligible, do_not_contact, contacts!inner(id, email, first_name, last_name, company, email_verified_status, sendable_status, status, compliance_status, is_globally_suppressed, hard_bounced, unsubscribed_at, do_not_contact_at, conversation_active)";
  if (contactIds) {
    for (let i = 0; i < contactIds.length; i += 200) {
      const { data } = await admin.from("business_contact_relationships").select(sel).eq("business_id", businessId).in("contact_id", contactIds.slice(i, i + 200));
      rels.push(...((data ?? []) as Array<Record<string, any>>));
    }
  } else {
    for (let off = 0; ; off += 1000) {
      const { data } = await admin.from("business_contact_relationships").select(sel).eq("business_id", businessId).range(off, off + 999);
      const rows = (data ?? []) as Array<Record<string, any>>;
      rels.push(...rows);
      if (rows.length < 1000) break;
    }
  }
  const eligible: Array<{ relId: string; contact: Record<string, any>; email: string }> = [];
  const blockers: Record<string, number> = {};
  for (const r of rels) {
    const c = r.contacts;
    const email = normEmail(c?.email);
    const relBlock: string[] = [];
    if (r.campaign_eligible === false) relBlock.push("not_campaign_eligible");
    if (r.do_not_contact === true) relBlock.push("relationship_do_not_contact");
    const ev = evaluateOutboundSendability({ ...(c ?? {}), email } as never);
    const all = [...relBlock, ...ev.blockers];
    if (all.length === 0 && email) eligible.push({ relId: r.id, contact: c, email });
    else for (const b of all) blockers[b] = (blockers[b] ?? 0) + 1;
  }
  return { eligible, blockers, total: rels.length };
}

/** Founder picked these people in the CRM: make sure each has a relationship with this business (never overrides do-not-contact). */
async function ensureRelationships(admin: Admin, businessId: string, contactIds: string[]) {
  const { data: biz } = await admin.from("businesses").select("name").eq("id", businessId).maybeSingle();
  const name = (biz as { name?: string } | null)?.name;
  if (!name) throw new ProviderError(400, "business_not_found");
  for (let i = 0; i < contactIds.length; i += 200) {
    const chunk = contactIds.slice(i, i + 200);
    const { data: have } = await admin.from("business_contact_relationships").select("contact_id, do_not_contact").eq("business_id", businessId).in("contact_id", chunk);
    const haveSet = new Set((have ?? []).map((h: { contact_id: string }) => h.contact_id));
    const missing = chunk.filter((id) => !haveSet.has(id));
    if (missing.length) {
      await admin.from("business_contact_relationships").upsert(missing.map((id) => ({
        contact_id: id, business_id: businessId, business_name: name, campaign_eligible: true,
        qualification_reason: "Chosen by founder in CRM for campaign", relevance_category: "crm_selected",
      })) as never[], { onConflict: "contact_id,business_name", ignoreDuplicates: true });
    }
    // founder selection = approval to be campaign eligible, unless this business marked them do-not-contact
    await admin.from("business_contact_relationships").update({ campaign_eligible: true, updated_at: new Date().toISOString() } as never)
      .eq("business_id", businessId).in("contact_id", chunk).eq("do_not_contact", false).eq("campaign_eligible", false);
  }
}

async function recordJourney(admin: Admin, businessId: string, campaignId: string, leads: Array<{ relId: string; contact: Record<string, any>; email: string }>) {
  const now = new Date().toISOString();
  for (let i = 0; i < leads.length; i += 200) {
    const chunk = leads.slice(i, i + 200);
    const keys = chunk.map((l) => `added:${campaignId}:${l.email}`);
    const { data: done } = await admin.from("crm_interaction_ledger").select("dedupe_key").in("dedupe_key", keys);
    const doneSet = new Set((done ?? []).map((d: { dedupe_key: string }) => d.dedupe_key));
    const todo = chunk.filter((l) => !doneSet.has(`added:${campaignId}:${l.email}`));
    if (!todo.length) continue;
    const { error } = await admin.from("crm_interaction_ledger").insert(todo.map((l) => ({
      business_id: businessId, contact_id: l.contact.id, business_contact_relationship_id: l.relId,
      source_system: "smartlead", source_channel: "email", interaction_type: "added_to_campaign", direction: "system",
      provider_type: "smartlead", provider_campaign_id: campaignId, contact_email: l.email,
      summary: `Added to campaign ${campaignId}`, occurred_at: now, dedupe_key: `added:${campaignId}:${l.email}`,
      matched_status: "matched", processing_status: "processed",
    })) as never[]);
    if (error) console.error("journey record failed", error.message);
  }
}

/** Emails already in this Smartlead campaign (from Liftor's own records). */
async function existingCampaignEmails(admin: Admin, businessId: string, campaignId: string) {
  const emails = new Set<string>();
  let off = 0;
  for (;;) {
    const { data } = await admin.from("smartlead_lead_snapshots").select("email")
      .eq("business_id", businessId).eq("provider_campaign_id", campaignId).range(off, off + 999);
    const rows = data ?? [];
    for (const r of rows) { const e = normEmail(r.email); if (e) emails.add(e); }
    if (rows.length < 1000) break;
    off += 1000;
  }
  return emails;
}

async function pushLeads(admin: Admin, key: string, businessId: string, campaignId: string, liftorCampaignId: string | null, mappingId: string | null, leads: Array<{ relId: string; contact: Record<string, any>; email: string }>) {
  let pushed = 0;
  for (let i = 0; i < leads.length; i += LEAD_BATCH) {
    const batch = leads.slice(i, i + LEAD_BATCH);
    const res = (await sl(`/campaigns/${campaignId}/leads`, key, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_list: batch.map((l) => ({
          email: l.email,
          first_name: l.contact.first_name ?? "",
          last_name: l.contact.last_name ?? "",
          company_name: l.contact.company ?? "",
        })),
        settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: false },
      }),
    })) as Record<string, unknown>;
    pushed += batch.length;
    const now = new Date().toISOString();
    await admin.from("outbound_provider_lead_mappings").upsert(
      batch.map((l) => ({
        business_id: businessId, liftor_contact_id: l.contact.id, liftor_campaign_id: liftorCampaignId,
        campaign_mapping_id: mappingId, provider_type: "smartlead", provider_campaign_id: campaignId,
        contact_email: l.email, push_status: "pushed", pushed_at: now,
        provider_response: JSON.stringify(res).slice(0, 500),
        business_contact_relationship_id: l.relId, updated_at: now,
      })) as never[],
      { onConflict: "business_id,provider_campaign_id,contact_email", ignoreDuplicates: false },
    );
  }
  return pushed;
}

async function audit(admin: Admin, businessId: string, actorId: string, summary: string, meta: Record<string, unknown>) {
  await admin.from("global_audit_events").insert({
    business_id: businessId, actor_type: "user", actor_id: actorId, actor_label: "founder",
    event_type: "smartlead_campaign_launch", event_category: "outreach", source_module: "email_outreach_dashboard",
    action_summary: summary, external_side_effect: true, sensitivity_level: "high", audit_metadata: meta,
  } as never);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = (Deno.env.get("SMARTLEAD_API_KEY") ?? "").trim();
  if (!KEY) return json({ ok: false, error: "smartlead_api_key_missing" }, 503);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const uc = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: ue } = await uc.auth.getUser(auth.slice(7));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const rs = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!rs.has("founder") && !rs.has("admin")) return json({ ok: false, error: "forbidden" }, 403);
  const userId = u.user.id;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const action = String(body.action ?? "");

  try {
    // ---------- Preview or add people to an existing mapped campaign ----------
    if (action === "preview_people" || action === "add_people") {
      const businessId = String(body.business_id ?? "");
      const campaignId = String(body.campaign_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(businessId) || !/^\d{1,12}$/.test(campaignId)) return json({ ok: false, error: "invalid_business_or_campaign" }, 400);
      const { data: maps } = await admin.from("outbound_provider_campaign_mappings")
        .select("id, business_id, liftor_campaign_id, mapping_status, is_active")
        .eq("provider_type", "smartlead").eq("provider_campaign_id", campaignId).eq("business_id", businessId);
      const mapping = (maps ?? []).find((m) => m.mapping_status === "mapped" && m.is_active);
      if (!mapping) return json({ ok: false, error: "campaign_not_mapped" }, 400);

      let contactIds: string[] | undefined;
      if (Array.isArray(body.contact_ids)) {
        contactIds = [...new Set((body.contact_ids as unknown[]).map(String).filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 5000);
        if (!contactIds.length) return json({ ok: false, error: "no_people_selected" }, 400);
        if (action === "add_people") await ensureRelationships(admin, businessId, contactIds);
      }
      const { eligible, blockers, total } = await eligibleContacts(admin, businessId, contactIds);
      const existing = await existingCampaignEmails(admin, businessId, campaignId);
      const fresh = eligible.filter((l) => !existing.has(l.email));
      if (action === "preview_people") {
        return json({ ok: true, total_contacts: total, eligible: eligible.length, already_in_campaign: eligible.length - fresh.length, ready_to_add: fresh.length, blockers });
      }
      const toPush = fresh.slice(0, MAX_LEADS_PER_CALL);
      const pushed = await pushLeads(admin, KEY, businessId, campaignId, mapping.liftor_campaign_id ?? null, mapping.id, toPush);
      await recordJourney(admin, businessId, campaignId, toPush.slice(0, pushed));
      await audit(admin, businessId, userId, `Added ${pushed} people to Smartlead campaign ${campaignId}`, { campaign_id: campaignId, pushed });
      return json({ ok: true, pushed, remaining: fresh.length - pushed });
    }

    // ---------- Start a campaign that was created for a future date ----------
    if (action === "start") {
      const businessId = String(body.business_id ?? "");
      const campaignId = String(body.campaign_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(businessId) || !/^\d{1,12}$/.test(campaignId)) return json({ ok: false, error: "invalid_business_or_campaign" }, 400);
      const { data: maps } = await admin.from("outbound_provider_campaign_mappings")
        .select("id").eq("provider_type", "smartlead").eq("provider_campaign_id", campaignId).eq("business_id", businessId).eq("mapping_status", "mapped");
      if (!maps?.length) return json({ ok: false, error: "campaign_not_mapped" }, 400);
      await sl(`/campaigns/${campaignId}/status`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACTIVE" }) });
      await audit(admin, businessId, userId, `Started Smartlead campaign ${campaignId}`, { campaign_id: campaignId });
      return json({ ok: true, started: true });
    }

    // ---------- Pause a mapped campaign (founder-approved; never starts, adds or deletes) ----------
    if (action === "pause") {
      const businessId = String(body.business_id ?? "");
      const campaignId = String(body.campaign_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(businessId) || !/^\d{1,12}$/.test(campaignId)) return json({ ok: false, error: "invalid_business_or_campaign" }, 400);
      const { data: maps } = await admin.from("outbound_provider_campaign_mappings")
        .select("id").eq("provider_type", "smartlead").eq("provider_campaign_id", campaignId).eq("business_id", businessId);
      if (!maps?.length) return json({ ok: false, error: "campaign_not_mapped" }, 400);
      await sl(`/campaigns/${campaignId}/status`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAUSED" }) });
      const after = (await sl(`/campaigns/${campaignId}`, KEY)) as Record<string, unknown>;
      await audit(admin, businessId, userId, `Paused Smartlead campaign ${campaignId}`, { campaign_id: campaignId, reason: String(body.reason ?? "").slice(0, 300), status_after: after?.status ?? null });
      return json({ ok: true, paused: true, status_after: after?.status ?? null });
    }

    // ---------- Founder-approved provider test: paused, no people, deleted afterwards ----------
    if (action === "provider_test") {
      const steps: Record<string, string> = {};
      const created = (await sl(`/campaigns/create`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `LIFTOR TEST - delete ${new Date().toISOString()}` }) })) as { id?: number | string };
      const id = String(created.id ?? "");
      if (!id) return json({ ok: false, error: "campaign_create_returned_no_id" }, 502);
      steps.create_campaign = "ok";
      let failed: string | null = null;
      const run = async (name: string, fn: () => Promise<unknown>) => {
        if (failed) return;
        try { await fn(); steps[name] = "ok"; } catch (e) { failed = name; steps[name] = e instanceof ProviderError ? e.code : "error"; }
      };
      const post = (path: string, b: unknown) => sl(path, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      await run("save_sequence", () => post(`/campaigns/${id}/sequences`, { sequences: [1, 2].map((n) => ({ seq_number: n, seq_delay_details: { delay_in_days: n === 1 ? 1 : 7 }, subject: `Test ${n}`, email_body: `Test body ${n}` })) }));
      let picked = 0;
      await run("assign_mailboxes", async () => {
        const { data: boxes } = await admin.from("gsm_mailboxes")
          .select("id, smartlead_email_account_id, warmup_status, readiness_state, health_score, last_provider_check_at, quarantined_reason")
          .eq("estate_classification", "gsm").eq("active", true).eq("retired", false).limit(1000);
        const sel = selectSlotMailboxes((boxes ?? []) as never, [] as never, "00000000-0000-0000-0000-000000000000", new Date(), new Date(Date.now() + 86400000));
        picked = sel.length;
        const ids = sel.slice(0, 1).map((b) => Number(b.smartlead_email_account_id)).filter((x) => Number.isFinite(x));
        if (!ids.length) throw new ProviderError(0, "no_healthy_mailboxes_available");
        await post(`/campaigns/${id}/email-accounts`, { email_account_ids: ids });
      });
      await run("set_schedule", () => post(`/campaigns/${id}/schedule`, { timezone: "Europe/London", days_of_the_week: [1, 2, 3, 4, 5], start_hour: "09:00", end_hour: "17:00", min_time_btw_emails: 12, max_new_leads_per_day: 1 }));
      await run("set_settings", () => post(`/campaigns/${id}/settings`, { track_settings: ["DONT_EMAIL_OPEN", "DONT_LINK_CLICK"], stop_lead_settings: "REPLY_TO_AN_EMAIL", send_as_plain_text: true, follow_up_percentage: 100 }));
      let status = "unknown"; let seqCount = -1; let leadCount = -1;
      await run("read_back", async () => {
        const c = (await sl(`/campaigns/${id}`, KEY)) as { status?: string };
        status = String(c.status ?? "unknown");
        const sq = (await sl(`/campaigns/${id}/sequences`, KEY)) as unknown[];
        seqCount = Array.isArray(sq) ? sq.length : -1;
        const ld = (await sl(`/campaigns/${id}/leads?limit=1`, KEY)) as { total_leads?: number | string };
        leadCount = Number(ld.total_leads ?? 0);
      });
      let deleted = false;
      try { await sl(`/campaigns/${id}`, KEY, { method: "DELETE" }); deleted = true; } catch { deleted = false; }
      await audit(admin, "640de582-a112-4d16-a221-03c27f00c6ec", userId, `Smartlead provider test campaign ${id} (no people, never started) ${deleted ? "deleted" : "NOT deleted"}`, { campaign_id: id, steps, status, deleted });
      return json({ ok: !failed, campaign_id: id, steps, status_after_setup: status, sequences_saved: seqCount, people_in_campaign: leadCount, healthy_mailboxes_selectable: picked, deleted });
    }

    // ---------- Approve & launch a dashboard draft as a real Smartlead campaign ----------
    if (action === "launch") {
      const draftId = String(body.draft_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(draftId)) return json({ ok: false, error: "invalid_draft" }, 400);
      const { data: draft } = await admin.from("outreach_campaign_drafts").select("*").eq("id", draftId).maybeSingle();
      if (!draft) return json({ ok: false, error: "draft_not_found" }, 404);
      const criteria = (draft.lead_criteria ?? {}) as Record<string, unknown>;
      if (criteria.created_from !== "email_outreach_dashboard") return json({ ok: false, error: "not_a_dashboard_draft" }, 400);
      if (criteria.launched_campaign_id) return json({ ok: true, already_launched: true, provider_campaign_id: criteria.launched_campaign_id });

      const businessId = String(draft.business_id);
      const { data: biz } = await admin.from("businesses").select("id, name, portfolio_status").eq("id", businessId).maybeSingle();
      if (!biz || biz.portfolio_status !== "active") return json({ ok: false, error: "business_not_active" }, 400);
      const emails = (draft.email_sequence ?? []) as Array<{ subject?: string; body?: string }>;
      if (emails.length === 0 || emails.some((e) => !e.subject?.trim() || !e.body?.trim())) return json({ ok: false, error: "email_sequence_incomplete" }, 400);

      const now = new Date().toISOString();
      // One approval: mark the draft approved as part of this action.
      await admin.from("outreach_campaign_drafts").update({ founder_approval_state: "approved", founder_approved_at: now, status: "approved", updated_at: now } as never).eq("id", draftId);

      let step = "create_campaign";
      const created = (await sl(`/campaigns/create`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: String(draft.campaign_name) }) })) as { id?: number | string };
      const newId = String(created.id ?? "");
      if (!newId) throw new ProviderError(0, "campaign_create_returned_no_id");

      try {
        step = "save_sequence";
        await sl(`/campaigns/${newId}/sequences`, KEY, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sequences: emails.map((e, i) => ({
              seq_number: i + 1,
              seq_delay_details: { delay_in_days: i === 0 ? 1 : 7 },
              subject: e.subject, email_body: e.body,
            })),
          }),
        });

        step = "assign_mailboxes";
        // Daily limit: 25 emails per mailbox; new people/day = mailboxes*25 / emails in sequence.
        // Every warm, campaign-ready GSM mailbox with a fresh Winnr read that no other business holds in this slot.
        const slotStart = criteria.start_date ? new Date(String(criteria.start_date)) : new Date();
        const slotEnd = new Date(slotStart.getTime() + Math.max(emails.length, 1) * 7 * 86400000);
        const { data: boxes } = await admin.from("gsm_mailboxes")
          .select("id, smartlead_email_account_id, warmup_status, readiness_state, health_score, last_provider_check_at, quarantined_reason")
          .eq("estate_classification", "gsm").eq("active", true).eq("retired", false).limit(1000);
        const { data: bookings } = await admin.from("portfolio_send_bookings")
          .select("mailbox_id, business_id, starts_at, ends_at")
          .lt("starts_at", slotEnd.toISOString()).gt("ends_at", slotStart.toISOString()).limit(10000);
        const picked = selectSlotMailboxes((boxes ?? []) as never, (bookings ?? []) as never, businessId, slotStart, slotEnd);
        const accountIds = picked.map((b) => Number(b.smartlead_email_account_id)).filter((x) => Number.isFinite(x));
        if (accountIds.length === 0) throw new ProviderError(0, "no_healthy_mailboxes_available");
        await sl(`/campaigns/${newId}/email-accounts`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email_account_ids: accountIds }) });

        step = "set_schedule";
        await sl(`/campaigns/${newId}/schedule`, KEY, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: "Europe/London", days_of_the_week: [1, 2, 3, 4, 5], start_hour: "09:00", end_hour: "17:00", min_time_btw_emails: 12, max_new_leads_per_day: Math.max(1, Math.floor((accountIds.length * 25) / Math.max(1, emails.length))) }),
        });

        step = "set_settings";
        await sl(`/campaigns/${newId}/settings`, KEY, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track_settings: ["DONT_EMAIL_OPEN", "DONT_LINK_CLICK"], stop_lead_settings: "REPLY_TO_AN_EMAIL", send_as_plain_text: true, follow_up_percentage: 100 }),
        });

        step = "add_people";
        const { eligible } = await eligibleContacts(admin, businessId);
        const pushed = await pushLeads(admin, KEY, businessId, newId, null, null, eligible.slice(0, MAX_LEADS_PER_CALL));

        step = "record_mapping";
        await admin.from("outbound_provider_campaign_mappings").insert({
          business_id: businessId, provider_type: "smartlead", provider_campaign_id: newId,
          provider_campaign_name: String(draft.campaign_name), mapping_status: "mapped", is_active: true,
        } as never);

        if (criteria.repeat_quarterly !== false) {
          const start = criteria.start_date ? new Date(String(criteria.start_date)) : new Date();
          const next = new Date(start); next.setUTCMonth(next.getUTCMonth() + 3);
          await admin.from("campaign_recurrence_plans").insert({
            business_id: businessId, source_provider: "smartlead", source_campaign_id: newId,
            campaign_name: String(draft.campaign_name), interval_months: 3, sequence_steps: emails.length,
            max_rounds: null, auto_start: true, active: true,
            first_sent_at: start.toISOString(), next_round_at: next.toISOString(),
            send_days: [1, 2, 3, 4, 5], skip_email_verification: false,
            notes: criteria.ai_refresh ? "AI light refresh approved for each quarterly round." : null,
          } as never);
        }

        step = "activate";
        const startDate = criteria.start_date ? new Date(String(criteria.start_date)) : new Date();
        const startToday = startDate.getTime() <= Date.now() + 60_000;
        if (startToday) {
          await sl(`/campaigns/${newId}/status`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACTIVE" }) });
        }

        await admin.from("outreach_campaign_drafts").update({
          status: "launched", updated_at: new Date().toISOString(),
          lead_criteria: { ...criteria, launched_campaign_id: newId, launched_at: new Date().toISOString(), people_added: pushed, mailboxes_assigned: accountIds.length },
        } as never).eq("id", draftId);
        await audit(admin, businessId, userId, `Launched Smartlead campaign ${newId} (${draft.campaign_name}) with ${pushed} people`, { campaign_id: newId, draft_id: draftId, pushed, mailboxes: accountIds.length, activated: startToday });

        return json({ ok: true, provider_campaign_id: newId, people_added: pushed, mailboxes_assigned: accountIds.length, activated: startToday, starts_on: startToday ? null : startDate.toISOString().slice(0, 10) });
      } catch (e) {
        const pe = e instanceof ProviderError ? e : new ProviderError(0, "launch_failed");
        await admin.from("outreach_campaign_drafts").update({
          status: "launch_failed", updated_at: new Date().toISOString(),
          lead_criteria: { ...criteria, launched_campaign_id: newId, launch_error: `${step}: ${pe.code}` },
        } as never).eq("id", draftId);
        await audit(admin, businessId, userId, `Launch of Smartlead campaign ${newId} failed at ${step}`, { campaign_id: newId, draft_id: draftId, step, error: pe.code });
        return json({ ok: false, error: `${step}: ${pe.code}`, provider_campaign_id: newId }, 502);
      }
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (e) {
    const pe = e instanceof ProviderError ? e : new ProviderError(0, "unexpected_failure");
    return json({ ok: false, error: pe.code }, 502);
  }
});
