// Kindnesss education roll-out (Smartlead campaign 4664652): reconcile, CRM mapping and
// one-time conditional auto-activation on Tue 24 Nov 2026 10:00 UK.
// Founder instruction (chat 20 Nov 2026 14:45 UTC): activate automatically if pilot, mailbox,
// verified-contact and compliance checks pass; never send to unverified or catch-all
// addresses; keep pilot 4103531 unchanged; on a critical failure keep paused and notify.
// Stages:
//   report    (founder)            -> counts only
//   reconcile (founder + confirm)  -> removes non-approved leads from the PAUSED campaign
//   map       (founder + confirm)  -> Liftor CRM campaign + lead mappings (education + pilot,
//                                     Liftor-side only) and adds the signed receiver webhook
//                                     to the education campaign only
//   activate  (cron token, or founder + confirm; dry_run supported) -> checks, then START
// Never touches the pilot campaign in Smartlead. Never sends anything itself.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://server.smartlead.ai/api/v1";
const BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
const CID = "4664652";
const PILOT_CID = "4103531";
const CONNECTION_ID = "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";
const PROVIDER_ID = "72e05077-f093-4689-b222-5a966139c8eb";
const CONFIRM = "KINDNESSS_EDUCATION_AUTO";
const START_AT = "2026-11-24T10:00:00.000Z"; // 10:00 UK (GMT)
const WINDOW_FROM = Date.parse("2026-11-24T09:00:00Z"), WINDOW_TO = Date.parse("2026-11-24T11:30:00Z");
const DAYS = 5, MIN_SENDERS = 150, MIN_LEADS = 100, MAX_PILOT_BOUNCES = 1;
const NAMES: Record<string, string> = { [CID]: "Kindnesss — Education roll-out (from 24 Nov 2026)", [PILOT_CID]: "Kindnesss — International Education Groups (Pilot 6)" };
const EVENTS = ["EMAIL_SENT", "EMAIL_REPLY", "EMAIL_BOUNCE", "LEAD_UNSUBSCRIBED", "EMAIL_LINK_CLICK", "EMAIL_OPEN", "LEAD_CATEGORY_UPDATED"];

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-liftor-cron-token", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const post = (body: unknown, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function sl(path: string, key: string, init?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`, { ...init, signal: ctrl.signal });
    const txt = await r.text(); let data: any; try { data = JSON.parse(txt); } catch { data = txt.slice(0, 300); }
    return { status: r.status, ok: r.ok, data };
  } catch { return { status: 0, ok: false, data: "network_error" }; } finally { clearTimeout(t); }
}
async function remoteLeadsOnce(cid: string, key: string): Promise<{ id: string; email: string }[] | null> {
  const out: { id: string; email: string }[] = []; let total = -1;
  for (let off = 0; off < 10000; off += 100) {
    let r = await sl(`/campaigns/${cid}/leads?limit=100&offset=${off}`, key);
    for (let a = 0; !r.ok && a < 3; a++) { await new Promise((z) => setTimeout(z, 2000 * (a + 1))); r = await sl(`/campaigns/${cid}/leads?limit=100&offset=${off}`, key); }
    if (!r.ok) return null;
    if (total < 0) total = Number(r.data?.total_leads ?? -1);
    const rows = r.data?.data ?? [];
    rows.forEach((l: any) => { const e = String(l?.lead?.email ?? "").trim().toLowerCase(); if (e && l?.lead?.id != null) out.push({ id: String(l.lead.id), email: e }); });
    if (total >= 0 ? off + 100 >= total : rows.length < 100) break;
  }
  const uniq = new Map(out.map((x) => [x.id, x]));
  if (total >= 0 && uniq.size !== total) console.log("remote_lead_count_mismatch", cid, uniq.size, total, out.length);
  return total >= 0 && uniq.size !== total ? null : [...uniq.values()];
}
// A full, complete read is required (total_leads must match); short pages are retried.
async function remoteLeads(cid: string, key: string) {
  for (let a = 0; a < 3; a++) { const r = await remoteLeadsOnce(cid, key); if (r) return r; await new Promise((z) => setTimeout(z, 3000)); }
  return null;
}
async function delLead(cid: string, id: string, key: string) {
  for (let a = 0; a < 4; a++) { const r = await sl(`/campaigns/${cid}/leads/${id}`, key, { method: "DELETE" }); if (r.ok) return true; console.log("lead_delete_failed", r.status, typeof r.data === "string" ? r.data.slice(0, 120) : JSON.stringify(r.data).slice(0, 120)); if (r.status && r.status !== 429 && r.status < 500) return false; await new Promise((z) => setTimeout(z, 1500 * (a + 1))); }
  return false;
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<boolean>) {
  let ok = 0, fail = 0, i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]; (await fn(x)) ? ok++ : fail++; } }));
  return { ok, fail };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!, SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? "";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  let input: any = {}; try { input = await req.json(); } catch { /* */ }
  const stage = String(input?.stage ?? "report");

  // Auth: scheduler token (activate only) or founder/admin.
  let actor = "founder", actorId: string | null = null;
  const cronTok = req.headers.get("x-liftor-cron-token") ?? "";
  if (cronTok) {
    const { data: t } = await db.from("internal_cron_token").select("token").eq("id", 1).maybeSingle();
    if (!t?.token || cronTok.length < 16 || t.token !== cronTok || stage !== "activate") return json({ ok: false, error: "auth_invalid" }, 401);
    actor = "system";
  } else {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
    const uc = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u, error: ue } = await uc.auth.getUser(auth.slice(7));
    if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
    const { data: roles, error: re } = await uc.from("user_roles").select("role").eq("user_id", u.user.id);
    if (re) return json({ ok: false, error: "caller_role_lookup_failed" }, 503);
    const rs = new Set((roles ?? []).map((r: any) => r.role));
    if (!rs.has("founder") && !rs.has("admin")) return json({ ok: false, error: "forbidden" }, 403);
    actorId = u.user.id;
    const dry = stage === "activate" && input?.dry_run === true;
    if (stage !== "report" && !dry && input?.confirm !== CONFIRM) return json({ ok: false, error: "confirmation_phrase_required" }, 400);
  }
  if (KEY.length < 8) return json({ ok: false, error: "smartlead_key_missing" }, 412);

  const audit = async (event_type: string, details: any) => {
    const { error } = await db.from("global_audit_events").insert({ business_id: BUSINESS_ID, actor_type: actor, actor_id: actorId, event_type, event_category: "external_action", source_module: "smartlead-kindnesss-education-activation", source_table: "smartlead", source_record_id: CID, action_summary: event_type, after_summary: details, external_side_effect: true });
    if (error) console.error("audit_insert_failed", error.code);
  };
  const notify = (title: string, summary: string, priority: string, metadata: any) =>
    db.from("founder_approval_items").insert({ business_id: BUSINESS_ID, approval_type: "campaign_activation", source_system: "education_auto_activation", source_table: "smartlead", source_id: CID, title, summary, priority_level: priority, status: "pending", execution_enabled: false, auto_execute_allowed: false, send_allowed: false, metadata });

  // Approved set: Kindnesss-eligible, clean history, Apollo "Verified"/"valid" AND "Not Catch-all".
  async function approvedSet() {
    const rel: any[] = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await db.from("business_contact_relationships").select("id,contact_id,do_not_contact").eq("business_id", BUSINESS_ID).eq("campaign_eligible", true).range(off, off + 999);
      if (error) throw new Error("relationship_lookup_failed");
      rel.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
    }
    const byContact = new Map(rel.filter((r) => !r.do_not_contact).map((r) => [r.contact_id, r.id]));
    const ids = [...byContact.keys()];
    const approved = new Map<string, { contact_id: string; bcr_id: string }>();
    const held: Record<string, number> = {};
    const bump = (k: string) => { held[k] = (held[k] ?? 0) + 1; };
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const [cs, ev, ap] = await Promise.all([
        db.from("contacts").select("id,email,first_name,is_globally_suppressed,unsubscribed_at,hard_bounced,do_not_contact_at").in("id", chunk),
        db.from("email_events").select("contact_id").in("contact_id", chunk).in("event_type", ["bounced", "replied"]),
        db.from("apollo_contact_intelligence").select("contact_id,raw_row").eq("business_id", BUSINESS_ID).in("contact_id", chunk),
      ]);
      if (cs.error || ev.error || ap.error) throw new Error("eligibility_lookup_failed");
      const hist = new Set((ev.data ?? []).map((e: any) => e.contact_id));
      const st = new Map<string, { es: string; ca: string }>();
      (ap.data ?? []).forEach((a: any) => st.set(a.contact_id, { es: String(a.raw_row?.["Email Status"] ?? "").toLowerCase(), ca: String(a.raw_row?.["Primary Email Catch-all Status"] ?? "").trim().toLowerCase() }));
      for (const c of cs.data ?? []) {
        const e = String(c.email ?? "").trim().toLowerCase();
        if (!e.includes("@") || !String(c.first_name ?? "").trim()) { bump("no_email_or_first_name"); continue; }
        if (c.is_globally_suppressed || c.unsubscribed_at || c.hard_bounced || c.do_not_contact_at) { bump("suppressed"); continue; }
        if (hist.has(c.id)) { bump("prior_bounce_or_reply"); continue; }
        const s = st.get(c.id);
        if (!s || (s.es !== "verified" && s.es !== "valid")) { bump("not_verified"); continue; }
        if (s.ca === "catch-all") { bump("catch_all"); continue; }
        if (s.ca !== "not catch-all") { bump("catch_all_unassessed"); continue; }
        approved.set(e, { contact_id: c.id, bcr_id: byContact.get(c.id)! });
      }
    }
    return { approved, held, eligible_total: ids.length };
  }

  async function ensureMapping(cid: string) {
    let { data: oc } = await db.from("outreach_campaigns").select("id").eq("business_id", BUSINESS_ID).eq("campaign_name", NAMES[cid]).limit(1);
    let ocId = oc?.[0]?.id;
    if (!ocId) {
      const { data, error } = await db.from("outreach_campaigns").insert({ business_id: BUSINESS_ID, campaign_name: NAMES[cid], status: "paused" }).select("id").single();
      if (error) throw new Error("crm_campaign_insert_failed:" + error.code);
      ocId = data.id;
    }
    const { data: m } = await db.from("outbound_provider_campaign_mappings").select("id").eq("provider_id", PROVIDER_ID).eq("provider_campaign_id", cid).limit(1);
    const row = { business_id: BUSINESS_ID, provider_id: PROVIDER_ID, provider_type: "smartlead", provider_connection_id: CONNECTION_ID, provider_campaign_id: cid, provider_campaign_name: NAMES[cid], liftor_campaign_id: ocId, mapping_status: "mapped", is_active: true, last_synced_at: new Date().toISOString() };
    let mapId = m?.[0]?.id;
    if (mapId) { const { error } = await db.from("outbound_provider_campaign_mappings").update(row).eq("id", mapId); if (error) throw new Error("campaign_mapping_update_failed:" + error.code); }
    else { const { data, error } = await db.from("outbound_provider_campaign_mappings").insert(row).select("id").single(); if (error) throw new Error("campaign_mapping_insert_failed:" + error.code); mapId = data.id; }
    return { ocId, mapId };
  }
  async function mapLeads(cid: string, ocId: string, mapId: string) {
    const remote = await remoteLeads(cid, KEY); if (!remote) throw new Error("remote_leads_read_failed");
    const rel: any[] = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await db.from("business_contact_relationships").select("id,contact_id").eq("business_id", BUSINESS_ID).range(off, off + 999);
      if (error) throw new Error("relationship_lookup_failed");
      rel.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
    }
    const bcr = new Map<string, string>(rel.map((r) => [r.contact_id, r.id]));
    const contacts = new Map<string, string>();
    const cids = [...bcr.keys()];
    for (let i = 0; i < cids.length; i += 200) {
      const { data, error } = await db.from("contacts").select("id,email").in("id", cids.slice(i, i + 200));
      if (error) throw new Error("contact_lookup_failed");
      (data ?? []).forEach((c: any) => { const e = String(c.email ?? "").trim().toLowerCase(); if (e) contacts.set(e, contacts.has(e) ? "AMBIGUOUS" : c.id); });
    }
    const rows: any[] = []; let unmatched = 0;
    for (const r of remote) {
      const c = contacts.get(r.email);
      if (!c || c === "AMBIGUOUS" || !bcr.has(c)) { unmatched++; continue; }
      rows.push({ business_id: BUSINESS_ID, liftor_contact_id: c, liftor_campaign_id: ocId, campaign_mapping_id: mapId, provider_type: "smartlead", provider_connection_id: CONNECTION_ID, provider_campaign_id: cid, provider_lead_id: r.id, contact_email: r.email, business_contact_relationship_id: bcr.get(c), push_status: "pushed", metadata: { source: "education_activation_map" } });
    }
    const have = new Set<string>();
    for (let off = 0; ; off += 1000) {
      const { data, error } = await db.from("outbound_provider_lead_mappings").select("liftor_contact_id").eq("liftor_campaign_id", ocId).range(off, off + 999);
      if (error) throw new Error("lead_mapping_read_failed");
      (data ?? []).forEach((r: any) => have.add(r.liftor_contact_id)); if ((data ?? []).length < 1000) break;
    }
    const todo = rows.filter((r) => !have.has(r.liftor_contact_id));
    for (let i = 0; i < todo.length; i += 500) {
      const { error } = await db.from("outbound_provider_lead_mappings").insert(todo.slice(i, i + 500));
      if (error) throw new Error("lead_mapping_insert_failed:" + error.code);
    }
    const { count } = await db.from("outbound_provider_lead_mappings").select("id", { count: "exact", head: true }).eq("provider_campaign_id", cid).eq("liftor_campaign_id", ocId);
    return { remote: remote.length, mapped: count ?? 0, unmatched };
  }
  async function ensureWebhook() {
    const cur = await sl(`/campaigns/${CID}/webhooks`, KEY);
    const list = Array.isArray(cur.data) ? cur.data : [];
    const p = await sl(`/campaigns/${PILOT_CID}/webhooks`, KEY);
    const plist = Array.isArray(p.data) ? p.data : [];
    const url = plist.find((w: any) => /smartlead-webhook/.test(String(w.webhook_url)))?.webhook_url ?? `${URL_}/functions/v1/smartlead-webhook`;
    if (list.some((w: any) => String(w.webhook_url) === url)) return { present: true, created: false };
    const variants = [EVENTS, ["EMAIL_SENT", "EMAIL_REPLY", "EMAIL_BOUNCE", "LEAD_UNSUBSCRIBED"], ["EMAIL_SENT", "EMAIL_REPLY", "LEAD_UNSUBSCRIBED"]];
    let r: any = null;
    for (const ev of variants) {
      r = await sl(`/campaigns/${CID}/webhooks`, KEY, post({ id: null, name: "Liftor Kindnesss education receiver", webhook_url: url, event_types: ev, categories: ev.includes("LEAD_CATEGORY_UPDATED") ? ["Interested"] : [] }));
      if (r.ok) break;
      console.error("webhook_create_failed", r.status, JSON.stringify(r.data).slice(0, 300));
    }
    if (!r?.ok) return { present: false, created: false, http: r?.status, provider: typeof r?.data === "string" ? r.data.slice(0, 200) : r?.data };
    const again = await sl(`/campaigns/${CID}/webhooks`, KEY);
    return { present: (Array.isArray(again.data) ? again.data : []).some((w: any) => String(w.webhook_url) === url), created: true };
  }

  try {
    if (stage === "report" || stage === "reconcile") {
      const A = await approvedSet();
      const remote = await remoteLeads(CID, KEY); if (!remote) return json({ ok: false, error: "remote_leads_read_failed" }, 502);
      const remove = remote.filter((r) => !A.approved.has(r.email));
      const base = { campaign_id: CID, kindnesss_eligible: A.eligible_total, approved_verified_not_catch_all: A.approved.size, held: A.held, remote_leads: remote.length, remote_to_remove: remove.length, remote_kept: remote.length - remove.length };
      if (stage === "report") return json({ ok: true, stage, ...base });
      const camp = await sl(`/campaigns/${CID}`, KEY); const st = String(camp.data?.status ?? "").toUpperCase();
      if (st !== "DRAFTED" && st !== "PAUSED") return json({ ok: false, error: `campaign_status_${st}` }, 409);
      const batch = remove.slice(0, Math.min(Number(input?.max ?? 400), 600));
      const res = await pool(batch, 3, (r) => delLead(CID, r.id, KEY));
      await audit("kindnesss_education_leads_reconciled", { ...base, removed_this_call: res.ok, failed: res.fail, rule: "Apollo Email Status Verified/valid AND Primary Email Catch-all Status = Not Catch-all; others held for separate approval" });
      return json({ ok: true, stage, ...base, removed_this_call: res.ok, failed: res.fail, remaining_to_remove: remove.length - res.ok });
    }
    if (stage === "map") {
      const out: any = {};
      for (const cid of [CID, PILOT_CID]) { const m = await ensureMapping(cid); out[cid] = await mapLeads(cid, m.ocId, m.mapId); }
      out.webhook = await ensureWebhook();
      await audit("kindnesss_education_crm_mapped", out);
      return json({ ok: true, stage, ...out });
    }
    if (stage !== "activate") return json({ ok: false, error: "unknown_stage" }, 400);

    // ---------- activate ----------
    const dry = actor === "founder" && input?.dry_run === true;
    const now = Date.now();
    const { data: done } = await db.from("global_audit_events").select("id").eq("event_type", "kindnesss_education_auto_activation_started").limit(1);
    if (done?.length) return json({ ok: true, stage, already_started: true });
    const pre = await sl(`/campaigns/${CID}`, KEY);
    if (String(pre.data?.status ?? "").toUpperCase() === "ACTIVE") return json({ ok: true, stage, already_active: true });
    if (!dry && (now < WINDOW_FROM || now > WINDOW_TO)) return json({ ok: false, error: "outside_activation_window" }, 409);

    const critical: string[] = [], notes: string[] = [];
    // 1. Pilot results
    const pa = await sl(`/campaigns/${PILOT_CID}/analytics`, KEY);
    if (!pa.ok) critical.push("pilot_results_unreadable");
    else {
      const bounces = Number(pa.data?.bounce_count ?? 0), sent = Number(pa.data?.sent_count ?? 0);
      notes.push(`pilot: sent ${sent}, bounces ${bounces}, replies ${pa.data?.reply_count ?? "?"}, unsubscribes ${pa.data?.unsubscribed_count ?? "?"}`);
      if (sent < 6) critical.push(`pilot_sent_${sent}_lt_6`);
      if (bounces > MAX_PILOT_BOUNCES) critical.push(`pilot_bounces_${bounces}`);
    }
    // 2. Campaign state
    const camp = await sl(`/campaigns/${CID}`, KEY); const st = String(camp.data?.status ?? "").toUpperCase();
    if (st !== "DRAFTED" && st !== "PAUSED") critical.push(`campaign_status_${st || "unreadable"}`);
    const an = await sl(`/campaigns/${CID}/analytics`, KEY);
    if (!an.ok || Number(an.data?.sent_count ?? 0) !== 0) critical.push("campaign_already_sent_or_unreadable");
    // 3. Verified-contact eligibility (re-run live; remove anything no longer approved)
    let leadCount = 0;
    try {
      const A = await approvedSet();
      const remote = await remoteLeads(CID, KEY);
      if (!remote) critical.push("remote_leads_unreadable");
      else {
        const extra = remote.filter((r) => !A.approved.has(r.email));
        if (extra.length && !dry) {
          const res = await pool(extra, 3, (r) => delLead(CID, r.id, KEY));
          if (res.fail) critical.push(`could_not_remove_${res.fail}_unapproved_leads`);
          notes.push(`removed ${res.ok} leads no longer approved`);
        } else if (extra.length) notes.push(`would remove ${extra.length} unapproved leads`);
        leadCount = remote.length - extra.length;
        if (leadCount < MIN_LEADS) critical.push(`only_${leadCount}_approved_leads`);
      }
    } catch (e) { critical.push(String((e as Error).message)); }
    // 4. Mailbox health
    const acc = await sl(`/campaigns/${CID}/email-accounts`, KEY);
    const accs = Array.isArray(acc.data) ? acc.data : [];
    if (!acc.ok) critical.push("senders_unreadable");
    if (accs.some((a: any) => /ghat|charit/i.test(String(a.from_email)))) critical.push("charity_mailbox_attached");
    const broken = accs.filter((a: any) => !a.is_smtp_success || !a.is_imap_success);
    const { data: gsm, error: ge } = await db.from("gsm_mailboxes").select("smartlead_email_account_id,warmup_status,active,retired,estate_classification").eq("estate_classification", "gsm");
    if (ge) critical.push("mailbox_lookup_failed");
    const warm = new Set((gsm ?? []).filter((m: any) => m.active && !m.retired && m.warmup_status === "warm").map((m: any) => String(m.smartlead_email_account_id)));
    const notWarm = accs.filter((a: any) => !warm.has(String(a.id)));
    const drop = [...new Set([...broken, ...notWarm].map((a: any) => Number(a.id)))];
    const healthy = accs.length - drop.length;
    if (healthy < MIN_SENDERS) critical.push(`only_${healthy}_healthy_mailboxes`);
    else if (drop.length && !dry) {
      const r = await sl(`/campaigns/${CID}/email-accounts`, KEY, post({ email_account_ids: drop }, "DELETE"));
      if (!r.ok) critical.push("could_not_detach_unhealthy_mailboxes"); else notes.push(`detached ${drop.length} unhealthy mailboxes`);
    }
    // 5. Compliance of the four emails
    const seq = await sl(`/campaigns/${CID}/sequences`, KEY);
    const steps = Array.isArray(seq.data) ? seq.data : [];
    if (steps.length !== 4) critical.push(`sequence_steps_${steps.length}`);
    steps.forEach((r: any) => { const v = r.sequence_variants?.[0] ?? r; const b = String(v.email_body ?? ""), n = r.seq_number;
      if (!String(v.subject ?? "").trim()) critical.push(`step_${n}_no_subject`);
      if (!b.includes("{{first_name}}")) critical.push(`step_${n}_no_first_name`);
      if (!b.includes("%unsubscribe-text%")) critical.push(`step_${n}_no_unsubscribe`);
      if (!/1207 Delaware/i.test(b)) critical.push(`step_${n}_no_postal_address`);
      if (/\{\{(?!first_name\}\})[^}]*\}\}|\[[A-Z _]+\]/.test(b)) critical.push(`step_${n}_leftover_placeholder`); });
    const ts = JSON.stringify(camp.data?.track_settings ?? "");
    if (!/DONT_TRACK_EMAIL_OPEN/.test(ts)) notes.push("open tracking setting not confirmed off");
    // 6. CRM recording
    try {
      const m = await ensureMapping(CID); const r = await mapLeads(CID, m.ocId, m.mapId);
      notes.push(`CRM lead mappings ${r.mapped}/${r.remote}`);
      if (r.mapped < r.remote) critical.push(`crm_mapping_incomplete_${r.mapped}_of_${r.remote}`);
      const w = dry ? { present: true } : await ensureWebhook();
      if (!w.present) critical.push("crm_webhook_missing");
    } catch (e) { critical.push(String((e as Error).message)); }

    const perDay = Math.max(1, Math.ceil(leadCount / DAYS));
    const report = { campaign_id: CID, dry_run: dry, approved_leads: leadCount, healthy_senders: healthy, per_day: perDay, critical, notes, checked_at: new Date().toISOString() };
    if (dry) return json({ ok: critical.length === 0, stage, ...report });
    if (critical.length) {
      await audit("kindnesss_education_auto_activation_blocked", report);
      await notify("Education roll-out NOT started — check failed", `Kept paused. ${critical.join("; ")}`, "critical", report);
      return json({ ok: false, stage, ...report });
    }
    const w = await sl(`/campaigns/${CID}/schedule`, KEY, post({ timezone: "Europe/London", days_of_the_week: [1, 2, 3, 4, 5], start_hour: "10:00", end_hour: "17:00", min_time_btw_emails: 10, max_new_leads_per_day: perDay, schedule_start_time: START_AT }));
    if (!w.ok) { await audit("kindnesss_education_auto_activation_blocked", { ...report, critical: ["schedule_write_failed"] }); await notify("Education roll-out NOT started — schedule write failed", "Kept paused.", "critical", report); return json({ ok: false, error: "schedule_write_failed" }, 502); }
    const s = await sl(`/campaigns/${CID}/status`, KEY, post({ status: "START" }));
    const back = await sl(`/campaigns/${CID}`, KEY); const after = String(back.data?.status ?? "").toUpperCase();
    if (!s.ok || after !== "ACTIVE") {
      await audit("kindnesss_education_auto_activation_blocked", { ...report, critical: [`start_failed_${after}`] });
      await notify("Education roll-out start failed", `Smartlead status after start: ${after || "unknown"}.`, "critical", report);
      return json({ ok: false, error: "start_failed", status_after: after }, 502);
    }
    await db.from("outreach_campaigns").update({ status: "active" }).eq("business_id", BUSINESS_ID).eq("campaign_name", NAMES[CID]).then(() => {}, () => {});
    await audit("kindnesss_education_auto_activation_started", { ...report, status_after: after });
    await notify("Education roll-out started", `${leadCount} verified, non-catch-all contacts; about ${perDay} new per weekday from 10:00 UK. ${notes.join("; ")}`, "high", report);
    return json({ ok: true, stage, started: true, ...report });
  } catch (e) {
    const msg = String((e as Error).message ?? e).slice(0, 120);
    if (stage === "activate" && actor === "system") { await audit("kindnesss_education_auto_activation_blocked", { error: msg }); await notify("Education roll-out NOT started — error", `Kept paused. ${msg}`, "critical", { error: msg }); }
    return json({ ok: false, error: msg }, 503);
  }
});
