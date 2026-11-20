// Founder/admin-only. Prepares the Kindnesss education roll-out as ONE new Smartlead
// campaign, left DRAFTED (never started). Stages (each idempotent, run in order):
//   preview   -> counts only, no writes
//   create    -> creates the campaign once (reuses the id recorded in audit_log)
//   configure -> approved 4-step sequence verbatim, all active warm GSM senders (no GHAT),
//                schedule Tue 24 Nov 2026 10:00 Europe/London, Mon-Fri 10-17, ~500 new/day,
//                stop on reply, open/click tracking off
//   leads     -> adds eligible Kindnesss contacts in batches (verified first), excluding
//                the pilot campaign's leads; fail closed on suppression/history lookups
//   check     -> read-back of the remote campaign
// Never calls the status endpoint; never sends.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://server.smartlead.ai/api/v1";
const BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
const DRAFT_ID = "71719d7d-bd95-42e1-b73e-dfb6d890d0d6";
const PILOT_CAMPAIGN_ID = "4103531";
const NAME = "Kindnesss — Education roll-out (from 24 Nov 2026)";
const CONFIRM = "PREPARE_KINDNESSS_EDUCATION";
const START_AT = "2026-11-24T10:00:00.000Z"; // 10:00 UK (GMT in November)
const PER_DAY = 510, GAP_DAYS = 7, BATCH = 100;
const WRITABLE = new Set(["DRAFTED", "PAUSED"]);

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const UNSAFE = /<\s*(script|iframe|object|embed|form|style|link|meta)\b|\son[a-z]+\s*=|javascript:/i;
const toHtml = (b: string) => UNSAFE.test(b) ? null : b.replace(/\r\n?/g, "\n").split("\n").map((l) => {
  const t = l.trim(); if (!t) return "<div><br></div>"; if (/^<[a-z\/]/i.test(t)) return t; return `<div>${esc(l)}</div>`;
}).join("");
async function sl(path: string, key: string, init?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`, { ...init, signal: ctrl.signal });
    const txt = await r.text(); let data: any; try { data = JSON.parse(txt); } catch { data = txt.slice(0, 400); }
    return { status: r.status, ok: r.ok, data };
  } finally { clearTimeout(t); }
}
const post = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function allRemoteLeadEmails(cid: string, key: string): Promise<Set<string> | null> {
  const out = new Set<string>();
  for (let off = 0; off < 10000; off += 100) {
    const r = await sl(`/campaigns/${cid}/leads?limit=100&offset=${off}`, key);
    if (!r.ok) return null;
    const rows = r.data?.data ?? [];
    rows.forEach((l: any) => { const e = String(l?.lead?.email ?? "").trim().toLowerCase(); if (e) out.add(e); });
    if (rows.length < 100) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!, SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const uc = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: ue } = await uc.auth.getUser(auth.slice(7));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles, error: re } = await uc.from("user_roles").select("role").eq("user_id", u.user.id);
  if (re) return json({ ok: false, error: "caller_role_lookup_failed" }, 503);
  const rs = new Set((roles ?? []).map((r: any) => r.role));
  if (!rs.has("founder") && !rs.has("admin")) return json({ ok: false, error: "forbidden" }, 403);
  if (KEY.length < 8) return json({ ok: false, error: "smartlead_key_missing" }, 412);

  let input: any = {}; try { input = await req.json(); } catch { /* */ }
  const stage = String(input?.stage ?? "preview");
  if (stage !== "preview" && stage !== "check" && input?.confirm !== CONFIRM) return json({ ok: false, error: "confirmation_phrase_required" }, 400);
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const audit = async (action: string, details: any) => { const { error } = await db.from("global_audit_events").insert({ business_id: BUSINESS_ID, actor_type: "founder", actor_id: u.user.id, event_type: action, event_category: "outbound", source_module: "smartlead-kindnesss-education-prepare", source_table: "smartlead", source_record_id: details?.campaign_id ? String(details.campaign_id) : null, action_summary: action, after_summary: details, external_side_effect: true }); if (error) console.error("audit_insert_failed", error.code); };

  // Campaign id recorded at creation (idempotent create).
  // 4664652 was created 20 Nov 2026 14:3x UTC before audit storage was fixed; pinned so create never duplicates.
  const { data: prior } = await db.from("global_audit_events").select("source_record_id").eq("event_type", "smartlead_kindnesss_education_campaign_created").order("created_at", { ascending: false }).limit(1);
  let cid: string | null = prior?.[0]?.source_record_id ? String(prior[0].source_record_id) : "4664652";

  // Eligible leads (scoped, clean, verified first, minus pilot leads).
  async function buildLeads() {
    const rows: any[] = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await db.from("business_contact_relationships").select("contact_id").eq("business_id", BUSINESS_ID).eq("campaign_eligible", true).range(off, off + 999);
      if (error) throw new Error("relationship_lookup_failed");
      rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
    }
    const ids = rows.map((r) => r.contact_id);
    const contacts: any[] = [], hist = new Set<string>(), status = new Map<string, string>();
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { data: cs, error: ce } = await db.from("contacts").select("id,email,first_name,last_name,company,is_globally_suppressed,unsubscribed_at,hard_bounced,do_not_contact_at").in("id", chunk);
      if (ce) throw new Error("contact_lookup_failed");
      contacts.push(...(cs ?? []));
      const { data: ev, error: ee } = await db.from("email_events").select("contact_id").in("contact_id", chunk).in("event_type", ["bounced", "replied"]);
      if (ee) throw new Error("email_history_lookup_failed");
      (ev ?? []).forEach((e: any) => hist.add(e.contact_id));
      const { data: ap, error: ae } = await db.from("apollo_contact_intelligence").select("contact_id,primary_email_status").eq("business_id", BUSINESS_ID).in("contact_id", chunk);
      if (ae) throw new Error("apollo_status_lookup_failed");
      (ap ?? []).forEach((a: any) => a.contact_id && status.set(a.contact_id, String(a.primary_email_status ?? "")));
    }
    const pilot = await allRemoteLeadEmails(PILOT_CAMPAIGN_ID, KEY);
    if (!pilot) throw new Error("pilot_leads_read_failed");
    const skipped: Record<string, number> = {};
    const bump = (k: string) => { skipped[k] = (skipped[k] ?? 0) + 1; };
    const seen = new Set<string>(); const leads: any[] = [];
    for (const c of contacts) {
      const e = String(c.email ?? "").trim().toLowerCase();
      if (!e || !e.includes("@")) { bump("no_email"); continue; }
      if (seen.has(e)) { bump("duplicate"); continue; }
      if (pilot.has(e)) { bump("in_pilot"); continue; }
      if (!String(c.first_name ?? "").trim()) { bump("missing_first_name"); continue; }
      if (c.is_globally_suppressed || c.unsubscribed_at || c.hard_bounced || c.do_not_contact_at) { bump("suppressed"); continue; }
      if (hist.has(c.id)) { bump("prior_history"); continue; }
      seen.add(e);
      const st = (status.get(c.id) ?? "").toLowerCase();
      leads.push({ verified: st === "verified" || st === "valid", lead: { email: c.email.trim(), first_name: c.first_name.trim(), last_name: c.last_name ?? "", company_name: c.company ?? "" } });
    }
    leads.sort((a, b) => Number(b.verified) - Number(a.verified) || a.lead.email.localeCompare(b.lead.email));
    return { leads, skipped, verified: leads.filter((l) => l.verified).length };
  }
  async function senders() {
    const { data, error } = await db.from("gsm_mailboxes").select("id,email,estate_classification,warmup_status,active,retired,smartlead_email_account_id").eq("estate_classification", "gsm").eq("warmup_status", "warm").eq("active", true);
    if (error) throw new Error("mailbox_lookup_failed");
    return (data ?? []).filter((m: any) => !m.retired && m.smartlead_email_account_id && !/ghat|charit/i.test(String(m.email)));
  }

  try {
    if (stage === "preview") {
      const L = await buildLeads(); const S = await senders();
      return json({ ok: true, stage, campaign_id: cid, leads: L.leads.length, verified_first: L.verified, skipped: L.skipped, senders: S.length, per_day: PER_DAY, start_at: START_AT });
    }
    if (stage === "create") {
      if (cid) return json({ ok: true, stage, campaign_id: cid, reused: true });
      const r = await sl(`/campaigns/create`, KEY, post({ name: NAME }));
      if (!r.ok || !r.data?.id) return json({ ok: false, error: "create_failed", http: r.status, provider: r.data }, 502);
      cid = String(r.data.id);
      await audit("smartlead_kindnesss_education_campaign_created", { campaign_id: cid, name: NAME, business_id: BUSINESS_ID, source_draft_id: DRAFT_ID, founder_instruction: "go prepare (chat 20 Nov 2026 14:26 UTC)" });
      return json({ ok: true, stage, campaign_id: cid, reused: false });
    }
    if (!cid) return json({ ok: false, error: "campaign_not_created" }, 409);
    const camp = await sl(`/campaigns/${cid}`, KEY);
    const status = String(camp.data?.status ?? "").toUpperCase();
    if (stage === "check") {
      const [seq, acc] = await Promise.all([sl(`/campaigns/${cid}/sequences`, KEY), sl(`/campaigns/${cid}/email-accounts`, KEY)]);
      const leads = await allRemoteLeadEmails(cid, KEY);
      const tot = await sl(`/campaigns/${cid}/leads?limit=1`, KEY);
      const stats = await sl(`/campaigns/${cid}/analytics`, KEY);
      const steps = (Array.isArray(seq.data) ? seq.data : []).map((r: any) => { const v = r.sequence_variants?.[0] ?? r; const b = String(v.email_body ?? "");
        return { n: r.seq_number, subject: v.subject, delay: r.seq_delay_details?.delay_in_days ?? r.seq_delay_details?.delayInDays, first_name: b.includes("{{first_name}}"), unsubscribe: b.includes("%unsubscribe-text%"), postal: /1207 Delaware/i.test(b) }; });
      const accs = Array.isArray(acc.data) ? acc.data : [];
      return json({ ok: true, stage, campaign_id: cid, name: camp.data?.name, status, scheduler: camp.data?.scheduler_cron_value ?? null, max_leads_per_day: camp.data?.max_leads_per_day ?? null,
        track_settings: camp.data?.track_settings ?? null, stop_lead_settings: camp.data?.stop_lead_settings ?? null, steps,
        senders: accs.length, senders_connection_issues: accs.filter((a: any) => !a.is_smtp_success || !a.is_imap_success).length, ghat_senders: accs.filter((a: any) => /ghat|charit/i.test(String(a.from_email))).length,
        leads: leads?.size ?? null, total_leads: tot.data?.total_leads ?? null, sent_count: stats.data?.sent_count ?? null });
    }
    if (!WRITABLE.has(status)) return json({ ok: false, error: `campaign_status_${status}_not_writable` }, 409);
    if (stage === "configure") {
      const { data: d } = await db.from("outreach_campaign_drafts").select("business_id,email_sequence").eq("id", DRAFT_ID).maybeSingle();
      if (!d || d.business_id !== BUSINESS_ID) return json({ ok: false, error: "source_scope_mismatch" }, 409);
      const steps: any[] = (d.email_sequence as any)?.steps ?? [];
      const blockers: string[] = []; if (steps.length !== 4) blockers.push(`source_step_count_${steps.length}`);
      const sequences = steps.map((s, i) => { const n = i + 1, body = String(s.body ?? ""), html = toHtml(body);
        if (!body.includes("%unsubscribe-text%")) blockers.push(`step_${n}_missing_unsubscribe`); if (!String(s.subject ?? "").trim()) blockers.push(`step_${n}_missing_subject`); if (html === null) blockers.push(`step_${n}_unsafe_html`);
        return { seq_number: n, seq_delay_details: { delay_in_days: n === 1 ? 0 : GAP_DAYS }, subject: String(s.subject ?? ""), email_body: html ?? "" }; });
      const S = await senders(); if (S.length < 1) blockers.push("no_senders");
      if (blockers.length) return json({ ok: false, blockers }, 409);
      const w1 = await sl(`/campaigns/${cid}/sequences`, KEY, post({ sequences }));
      if (!w1.ok) return json({ ok: false, error: "sequence_write_failed", http: w1.status, provider: w1.data }, 502);
      const ids = S.map((m: any) => Number(m.smartlead_email_account_id));
      const w2 = await sl(`/campaigns/${cid}/email-accounts`, KEY, post({ email_account_ids: ids }));
      if (!w2.ok) return json({ ok: false, error: "sender_attach_failed", http: w2.status, provider: w2.data }, 502);
      const w3 = await sl(`/campaigns/${cid}/schedule`, KEY, post({ timezone: "Europe/London", days_of_the_week: [1, 2, 3, 4, 5], start_hour: "10:00", end_hour: "17:00", min_time_btw_emails: 10, max_new_leads_per_day: PER_DAY, schedule_start_time: START_AT }));
      if (!w3.ok) return json({ ok: false, error: "schedule_failed", http: w3.status, provider: w3.data }, 502);
      const w4 = await sl(`/campaigns/${cid}/settings`, KEY, post({ track_settings: ["DONT_TRACK_EMAIL_OPEN", "DONT_TRACK_LINK_CLICK"], stop_lead_settings: "REPLY_TO_AN_EMAIL", send_as_plain_text: false, follow_up_percentage: 100, enable_ai_esp_matching: false }));
      await audit("smartlead_kindnesss_education_configured", { campaign_id: cid, steps: sequences.length, senders: ids.length, start_at: START_AT, per_day: PER_DAY, settings_http: w4.status });
      return json({ ok: true, stage, campaign_id: cid, steps: sequences.length, senders: ids.length, settings_ok: w4.ok, settings_body: w4.ok ? null : w4.data, started: false });
    }
    if (stage === "leads") {
      const L = await buildLeads();
      const remote = await allRemoteLeadEmails(cid, KEY); if (!remote) return json({ ok: false, error: "remote_leads_read_failed" }, 502);
      const todo = L.leads.filter((l) => !remote.has(l.lead.email.toLowerCase())).map((l) => l.lead);
      const max = Math.min(Number(input?.max_batches ?? 8), 10); let added = 0; const results: any[] = [];
      for (let b = 0; b < max && b * BATCH < todo.length; b++) {
        const lead_list = todo.slice(b * BATCH, (b + 1) * BATCH);
        const r = await sl(`/campaigns/${cid}/leads`, KEY, post({ lead_list, settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: false } }));
        if (!r.ok) return json({ ok: false, error: "lead_add_failed", http: r.status, provider: r.data, added, results }, 502);
        added += lead_list.length; results.push({ uploaded: r.data?.upload_count ?? null, dup: r.data?.duplicate_count ?? null, invalid: r.data?.invalid_email_count ?? null, blocked: r.data?.block_count ?? r.data?.unsubscribed_leads ?? null });
      }
      await audit("smartlead_kindnesss_education_leads_added", { campaign_id: cid, sent_to_provider: added, remaining: todo.length - added });
      return json({ ok: true, stage, campaign_id: cid, eligible: L.leads.length, already_remote: remote.size, sent_this_call: added, remaining: Math.max(0, todo.length - added), results, skipped: L.skipped, started: false });
    }
    return json({ ok: false, error: "unknown_stage" }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e).slice(0, 120) }, 503);
  }
});
