// Founder/admin-only. Writes EXACTLY the four Kindnesss draft steps into ONE existing
// Smartlead campaign (4103531) ONLY when its remote status is DRAFTED/PAUSED
// immediately before the write. Never creates campaigns, adds leads, changes
// campaign status, schedule, senders, provider flags or gates. Never sends.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://server.smartlead.ai/api/v1";
const DRAFT_ID = "71719d7d-bd95-42e1-b73e-dfb6d890d0d6";
const BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
const CAMPAIGN_ID = "4103531";
const EXPECTED_STEPS = 4;
const GAP_DAYS = 7;
// Advisory only; never written here (separate campaign setting, needs its own approval).
const RECOMMENDED_SCHEDULE = { days_of_the_week: [1, 2, 3, 4, 5], use_lead_timezone: true, note: "Mon-Fri in recipient local time; a +7 step landing on a weekend shifts to Monday." };
const WRITABLE_STATUSES = new Set(["DRAFTED", "PAUSED"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const UNSAFE_HTML = /<\s*(script|iframe|object|embed|form|style|link|meta)\b|\son[a-z]+\s*=|javascript:/i;
// Plain text: every line escaped, line breaks preserved. Authored HTML: passed
// through only if it contains no active content; otherwise rejected (null).
export const toHtml = (body: string): string | null => {
  if (/<[a-z][\s\S]*>/i.test(body)) return UNSAFE_HTML.test(body) ? null : body;
  return body.replace(/\r\n?/g, "\n").split("\n").map((l) => (l.trim() ? `<div>${esc(l)}</div>` : "<div><br></div>")).join("");
};
// Calendar-day gap that lands N Mon-Fri working days after `from` (UTC date).
export function calendarGapForWorkingDays(from: Date, n: number) {
  const d = new Date(from); let worked = 0, gap = 0;
  while (worked < n) { d.setUTCDate(d.getUTCDate() + 1); gap++; const w = d.getUTCDay(); if (w !== 0 && w !== 6) worked++; }
  return { gap, next: d };
}

async function sl(path: string, key: string, init?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`, { ...init, signal: ctrl.signal });
    const txt = await r.text();
    let data: any = null; try { data = JSON.parse(txt); } catch { data = txt.slice(0, 500); }
    return { status: r.status, ok: r.ok, data };
  } finally { clearTimeout(t); }
}

function verify(readBack: any[], expected: any[]) {
  const sorted = [...readBack].sort((a, b) => (a.seq_number ?? 0) - (b.seq_number ?? 0));
  const checks = expected.map((e, i) => {
    const r = sorted[i] ?? {};
    const v0 = Array.isArray(r.sequence_variants) ? r.sequence_variants[0] : Array.isArray(r.variants) ? r.variants[0] : null;
    const variantCount = Array.isArray(r.sequence_variants) ? r.sequence_variants.length : Array.isArray(r.variants) ? r.variants.length : 0;
    const body = String(v0?.email_body ?? r.email_body ?? "");
    const subj = String(v0?.subject ?? r.subject ?? "");
    const ev = e.variants[0];
    return {
      seq_number: r.seq_number ?? null,
      expected_seq: e.seq_number,
      body_has_unsubscribe: body.includes("%unsubscribe-text%"),
      body_has_signature: body.includes("%signature%"),
      variant_source: v0 ? "nested_variant" : "top_level_fallback",
      variant_count: variantCount,
      body_matches_sent: body.trim() === ev.email_body.trim(),
      subject_ok: e.seq_number === 1 ? subj === ev.subject : subj.trim() === "",
      delay_in_days: r.seq_delay_details?.delay_in_days ?? r.seq_delay_details?.delayInDays ?? null,
      expected_delay_in_days: e.seq_delay_details.delay_in_days,
    };
  });
  const pass = sorted.length === expected.length && checks.every((c) =>
    c.seq_number === c.expected_seq && c.body_has_unsubscribe && c.body_has_signature && c.subject_ok &&
    c.body_matches_sent && Number(c.delay_in_days) === Number(c.expected_delay_in_days));
  return { count: sorted.length, pass, checks };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.slice(7));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles, error: re } = await userClient.from("user_roles").select("role").eq("user_id", u.user.id);
  if (re) return json({ ok: false, error: "caller_role_lookup_failed" }, 503);
  const rs = new Set((roles ?? []).map((r: any) => r.role));
  if (!rs.has("founder") && !rs.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let input: any = {};
  try { input = await req.json(); } catch { /* empty */ }
  const mode = input?.mode === "apply" ? "apply" : "preview";
  if (input?.campaign_id && String(input.campaign_id) !== CAMPAIGN_ID) return json({ ok: false, error: "campaign_not_allowed" }, 400);
  if (mode === "apply" && input?.confirm !== `WRITE_SEQUENCE_${CAMPAIGN_ID}`) {
    return json({ ok: false, error: "confirmation_phrase_required" }, 400);
  }
  if (KEY.length < 8) return json({ ok: false, error: "smartlead_key_missing" }, 412);
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

  // Source (same business, same mapped campaign)
  const { data: d, error: de } = await admin.from("outreach_campaign_drafts")
    .select("id,business_id,smartlead_campaign_id,email_sequence").eq("id", DRAFT_ID).maybeSingle();
  if (de || !d) return json({ ok: false, error: "source_not_found", detail: de?.message }, 404);
  if (d.business_id !== BUSINESS_ID || String(d.smartlead_campaign_id) !== CAMPAIGN_ID) {
    return json({ ok: false, error: "source_scope_mismatch" }, 409);
  }
  const steps: any[] = (d.email_sequence as any)?.steps ?? [];
  const blockers: string[] = [];
  if (steps.length !== EXPECTED_STEPS) blockers.push(`source_step_count_${steps.length}_expected_${EXPECTED_STEPS}`);
  const sequences = steps.map((s, i) => {
    const n = Number(s.step ?? i + 1);
    if (n !== i + 1) blockers.push(`step_order_invalid_at_${i + 1}`);
    const body = String(s.body ?? "");
    if (!body.includes("%unsubscribe-text%")) blockers.push(`step_${n}_missing_unsubscribe`);
    if (!body.includes("%signature%")) blockers.push(`step_${n}_missing_signature`);
    if (n === 1 && !String(s.subject ?? "").trim()) blockers.push("step_1_missing_subject");
    if (n > 1 && String(s.subject ?? "").trim()) blockers.push(`step_${n}_subject_not_blank`);
    const html = toHtml(body);
    if (html === null) blockers.push(`step_${n}_unsafe_html`);
    // Fixed 7 CALENDAR-day gaps between steps (day 0 / +7 / +14 / +21).
    const delay = n === 1 ? 0 : GAP_DAYS;
    return {
      seq_number: n,
      seq_delay_details: { delay_in_days: delay },
      variant_distribution_type: "MANUALLY_EQUAL",
      variants: [{ subject: n === 1 ? String(s.subject) : "", email_body: html ?? "", variant_label: "A" }],
    };
  });
  const scheduleNote = `delay_in_days are ${GAP_DAYS} calendar days (day 0/+7/+14/+21). Weekend avoidance in the recipient's local time is a SEPARATE campaign schedule setting (recommended_schedule_setting) and is NOT written by this tool.`;

  // Remote campaign status immediately before any write
  const camp = await sl(`/campaigns/${CAMPAIGN_ID}`, KEY);
  const remoteStatus = String(camp.data?.status ?? "").toUpperCase();
  if (!camp.ok) blockers.push(`campaign_read_http_${camp.status}`);
  else if (!WRITABLE_STATUSES.has(remoteStatus)) blockers.push(`campaign_status_${remoteStatus || "unknown"}_not_writable`);

  const before = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY);
  const base = {
    mode, campaign_id: CAMPAIGN_ID, remote_status_before: remoteStatus || null,
    remote_sequence_count_before: Array.isArray(before.data) ? before.data.length : null,
    source_step_count: steps.length, gap_days: GAP_DAYS, schedule_note: scheduleNote,
    recommended_schedule_setting: RECOMMENDED_SCHEDULE, schedule_written: false,
    proposed: sequences.map((s) => ({ seq_number: s.seq_number, subject: s.variants[0].subject, delay_in_days: s.seq_delay_details.delay_in_days, body_chars: s.variants[0].email_body.length })),
    sends_triggered: false, leads_changed: false, campaign_status_changed: false,
  };
  if (blockers.length) return json({ ok: false, write_blocked: true, blockers, ...base }, 200);
  if (mode === "preview") return json({ ok: true, write_blocked: false, ...base });

  const w = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY, {
    // Live API rejects a root array (400 '"value" must be of type object'); it requires { sequences: [...] }.
    // Live API also rejects nested `variants`; single-version steps use top-level subject/email_body.
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      sequences: sequences.map((s) => ({ seq_number: s.seq_number, seq_delay_details: s.seq_delay_details,
        subject: s.variants[0].subject, email_body: s.variants[0].email_body })),
    }),
  });
  if (!w.ok) return json({ ok: false, error: "sequence_write_failed", http_status: w.status, provider_body: w.data, ...base }, 502);

  const after = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY);
  const campAfter = await sl(`/campaigns/${CAMPAIGN_ID}`, KEY);
  const v = Array.isArray(after.data) ? verify(after.data, sequences) : { count: null, pass: false, checks: [] };
  return json({
    ok: v.pass, stale_remote_steps_remaining: Array.isArray(after.data) && after.data.length > EXPECTED_STEPS, ...base, write_http_status: w.status,
    remote_status_after: String(campAfter.data?.status ?? "").toUpperCase() || null,
    readback: v,
  });
});
