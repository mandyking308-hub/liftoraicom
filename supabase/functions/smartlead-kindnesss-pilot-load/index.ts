// Founder/admin-only. Loads the Kindnesss 5-person pilot into ONE existing Smartlead
// campaign (4103531) while it is DRAFTED/PAUSED: writes the approved 4-step sequence
// verbatim, attaches exactly the two booked GSM senders, adds exactly the allowlisted
// contacts (re-checked live, fail-closed on history lookup errors). Never starts,
// schedules or changes campaign status; never sends. Read-back returned.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://server.smartlead.ai/api/v1";
const BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
const DRAFT_ID = "71719d7d-bd95-42e1-b73e-dfb6d890d0d6";
const CAMPAIGN_ID = "4103531";
const SENDER_MAILBOX_IDS = ["38b05e85-5f1a-462e-8d99-42ba358ed9b2", "5606491b-a128-45a0-8cbf-bcdc425a0c34"];
const MAX_LEADS = 5;
const GAP_DAYS = 7;
const CONFIRM = `LOAD_PILOT_${CAMPAIGN_ID}`;
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
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`, { ...init, signal: ctrl.signal });
    const txt = await r.text(); let data: any; try { data = JSON.parse(txt); } catch { data = txt.slice(0, 400); }
    return { status: r.status, ok: r.ok, data };
  } finally { clearTimeout(t); }
}
const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

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

  let input: any = {}; try { input = await req.json(); } catch { /* */ }
  const mode = input?.mode === "apply" ? "apply" : "preview";
  if (mode === "apply" && input?.confirm !== CONFIRM) return json({ ok: false, error: "confirmation_phrase_required" }, 400);
  const ids: string[] = Array.isArray(input?.contact_ids) ? [...new Set(input.contact_ids.map(String))] : [];
  if (ids.length < 1 || ids.length > MAX_LEADS) return json({ ok: false, error: `contact_ids_must_be_1_to_${MAX_LEADS}` }, 400);
  if (KEY.length < 8) return json({ ok: false, error: "smartlead_key_missing" }, 412);
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const blockers: string[] = [];

  // Sequence source
  const { data: d } = await db.from("outreach_campaign_drafts").select("business_id,smartlead_campaign_id,email_sequence").eq("id", DRAFT_ID).maybeSingle();
  if (!d || d.business_id !== BUSINESS_ID || String(d.smartlead_campaign_id) !== CAMPAIGN_ID) return json({ ok: false, error: "source_scope_mismatch" }, 409);
  const steps: any[] = (d.email_sequence as any)?.steps ?? [];
  if (steps.length !== 4) blockers.push(`source_step_count_${steps.length}`);
  const sequences = steps.map((s, i) => {
    const n = i + 1, body = String(s.body ?? ""), html = toHtml(body);
    if (!body.includes("%unsubscribe-text%")) blockers.push(`step_${n}_missing_unsubscribe`);
    if (!String(s.subject ?? "").trim()) blockers.push(`step_${n}_missing_subject`);
    if (html === null) blockers.push(`step_${n}_unsafe_html`);
    return { seq_number: n, seq_delay_details: { delay_in_days: n === 1 ? 0 : GAP_DAYS }, subject: String(s.subject ?? ""), email_body: html ?? "" };
  });

  // Senders (GSM only, booked)
  const { data: mbs } = await db.from("gsm_mailboxes").select("id,email,provider,warmup_status,smartlead_email_account_id").in("id", SENDER_MAILBOX_IDS);
  const senders = (mbs ?? []).filter((m: any) => m.smartlead_email_account_id && m.warmup_status === "warm" && !/ghat/i.test(String(m.provider ?? "")));
  if (senders.length !== SENDER_MAILBOX_IDS.length) blockers.push("sender_not_ready_or_unmapped");

  // Leads: scoped, eligible, clean history (fail closed)
  const { data: rel, error: relErr } = await db.from("business_contact_relationships").select("contact_id,campaign_eligible").eq("business_id", BUSINESS_ID).in("contact_id", ids);
  if (relErr) return json({ ok: false, error: "relationship_lookup_failed" }, 503);
  const { data: cs, error: cErr } = await db.from("contacts").select("id,email,first_name,last_name,company,email_verified_status,is_globally_suppressed,unsubscribed_at,hard_bounced,do_not_contact_at").in("id", ids);
  if (cErr) return json({ ok: false, error: "contact_lookup_failed" }, 503);
  const { data: ev, error: evErr } = await db.from("email_events").select("contact_id,event_type").in("contact_id", ids).in("event_type", ["bounced", "replied"]);
  if (evErr) return json({ ok: false, error: "email_history_lookup_failed" }, 503);
  const eligible = new Set((rel ?? []).filter((r: any) => r.campaign_eligible).map((r: any) => r.contact_id));
  const hist = new Set((ev ?? []).map((e: any) => e.contact_id));
  const leads: any[] = [];
  for (const id of ids) {
    const c: any = (cs ?? []).find((x: any) => x.id === id);
    const why = !c ? "not_found" : !eligible.has(id) ? "not_kindnesss_eligible" : !String(c.first_name ?? "").trim() ? "missing_first_name"
      : c.is_globally_suppressed || c.unsubscribed_at || c.hard_bounced || c.do_not_contact_at ? "suppressed" : hist.has(id) ? "prior_bounce_or_reply" : null;
    if (why) blockers.push(`lead_${id.slice(0, 8)}_${why}`);
    else leads.push({ email: c.email, first_name: c.first_name, last_name: c.last_name ?? "", company_name: c.company ?? "" });
  }

  // Remote state
  const camp = await sl(`/campaigns/${CAMPAIGN_ID}`, KEY);
  const status = String(camp.data?.status ?? "").toUpperCase();
  if (!camp.ok) blockers.push(`campaign_read_http_${camp.status}`); else if (!WRITABLE.has(status)) blockers.push(`campaign_status_${status}_not_writable`);
  const existingLeads = await sl(`/campaigns/${CAMPAIGN_ID}/leads?limit=100`, KEY);
  const existing = (existingLeads.data?.data ?? []).map((l: any) => String(l?.lead?.email ?? "").toLowerCase()).filter(Boolean);
  const base = {
    mode, campaign_id: CAMPAIGN_ID, remote_status_before: status || null,
    existing_remote_leads: existing.length, existing_remote_leads_masked: existing.map(mask),
    senders: senders.map((s: any) => s.email), leads_to_add: leads.map((l) => mask(l.email)),
    steps: sequences.map((s) => ({ n: s.seq_number, subject: s.subject, delay: s.seq_delay_details.delay_in_days })),
    campaign_status_changed: false, sends_triggered: false,
  };
  if (blockers.length) return json({ ok: false, write_blocked: true, blockers, ...base });
  if (mode === "preview") return json({ ok: true, write_blocked: false, ...base });

  const w1 = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sequences }) });
  if (!w1.ok) return json({ ok: false, error: "sequence_write_failed", http: w1.status, provider: w1.data, ...base }, 502);
  const w2 = await sl(`/campaigns/${CAMPAIGN_ID}/email-accounts`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email_account_ids: senders.map((s: any) => Number(s.smartlead_email_account_id)) }) });
  if (!w2.ok) return json({ ok: false, error: "sender_attach_failed", http: w2.status, provider: w2.data, sequence_written: true, ...base }, 502);
  const w3 = await sl(`/campaigns/${CAMPAIGN_ID}/leads`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_list: leads, settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: false } }) });
  if (!w3.ok) return json({ ok: false, error: "lead_add_failed", http: w3.status, provider: w3.data, sequence_written: true, senders_attached: true, ...base }, 502);

  const [seqAfter, accAfter, leadsAfter, campAfter] = await Promise.all([
    sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY), sl(`/campaigns/${CAMPAIGN_ID}/email-accounts`, KEY),
    sl(`/campaigns/${CAMPAIGN_ID}/leads?limit=100`, KEY), sl(`/campaigns/${CAMPAIGN_ID}`, KEY)]);
  await db.from("audit_log").insert({ action: "smartlead_kindnesss_pilot_loaded", actor_id: u.user.id, details: { campaign_id: CAMPAIGN_ID, leads: leads.length, senders: senders.length, steps: sequences.length } }).then(() => {}, () => {});
  return json({
    ok: true, ...base, lead_add_result: w3.data,
    readback: {
      status_after: String(campAfter.data?.status ?? "").toUpperCase(),
      sequence_count: Array.isArray(seqAfter.data) ? seqAfter.data.length : null,
      sender_emails: Array.isArray(accAfter.data) ? accAfter.data.map((a: any) => a.from_email) : accAfter.data,
      lead_count: leadsAfter.data?.total_leads ?? (leadsAfter.data?.data ?? []).length,
      leads_masked: (leadsAfter.data?.data ?? []).map((l: any) => mask(String(l?.lead?.email ?? ""))),
    },
  });
});
