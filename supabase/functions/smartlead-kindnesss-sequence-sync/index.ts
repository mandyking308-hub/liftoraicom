// Founder/admin-only. Writes the five Kindnesss draft steps into ONE existing
// Smartlead campaign (4103531) ONLY when its remote status is DRAFTED/PAUSED
// immediately before the write. Never creates campaigns, adds leads, changes
// campaign status, schedule, senders, provider flags or gates. Never sends.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://server.smartlead.ai/api/v1";
const DRAFT_ID = "71719d7d-bd95-42e1-b73e-dfb6d890d0d6";
const BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
const CAMPAIGN_ID = "4103531";
const WRITABLE_STATUSES = new Set(["DRAFTED", "PAUSED"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const toHtml = (body: string) =>
  /<[a-z][\s\S]*>/i.test(body) ? body : body.split(/\n/).map((l) => l || "<br>").map((l) => l === "<br>" ? l : `<div>${l}</div>`).join("");

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
    const body = String(r.email_body ?? "");
    const subj = String(r.subject ?? "");
    return {
      seq_number: r.seq_number ?? null,
      expected_seq: e.seq_number,
      body_has_unsubscribe: body.includes("%unsubscribe-text%"),
      body_has_signature: body.includes("%signature%"),
      body_matches_sent: body.trim() === e.email_body.trim(),
      subject_ok: e.seq_number === 1 ? subj === e.subject : subj.trim() === "",
      delay_in_days: r.seq_delay_details?.delay_in_days ?? r.seq_delay_details?.delayInDays ?? null,
    };
  });
  const pass = sorted.length === expected.length && checks.every((c) =>
    c.seq_number === c.expected_seq && c.body_has_unsubscribe && c.body_has_signature && c.subject_ok);
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
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
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

  // Source (same business, same mapped campaign)
  const { data: d, error: de } = await admin.from("outreach_campaign_drafts")
    .select("id,business_id,smartlead_campaign_id,email_sequence").eq("id", DRAFT_ID).maybeSingle();
  if (de || !d) return json({ ok: false, error: "source_not_found", detail: de?.message }, 404);
  if (d.business_id !== BUSINESS_ID || String(d.smartlead_campaign_id) !== CAMPAIGN_ID) {
    return json({ ok: false, error: "source_scope_mismatch" }, 409);
  }
  const steps: any[] = (d.email_sequence as any)?.steps ?? [];
  const blockers: string[] = [];
  if (steps.length !== 5) blockers.push(`source_step_count_${steps.length}`);
  const sequences = steps.map((s, i) => {
    const n = Number(s.step ?? i + 1);
    const body = String(s.body ?? "");
    if (!body.includes("%unsubscribe-text%")) blockers.push(`step_${n}_missing_unsubscribe`);
    if (!body.includes("%signature%")) blockers.push(`step_${n}_missing_signature`);
    if (n === 1 && !String(s.subject ?? "").trim()) blockers.push("step_1_missing_subject");
    if (n > 1 && String(s.subject ?? "").trim()) blockers.push(`step_${n}_subject_not_blank`);
    return {
      seq_number: n,
      seq_delay_details: { delay_in_days: n === 1 ? 0 : Number(s.wait_business_days ?? 4) },
      subject: n === 1 ? String(s.subject) : "",
      email_body: toHtml(body),
    };
  });
  const scheduleNote =
    "Smartlead delay_in_days counts calendar days; it cannot express 'four working days'. Schedule is UNVERIFIED and remains a launch blocker.";

  // Remote campaign status immediately before any write
  const camp = await sl(`/campaigns/${CAMPAIGN_ID}`, KEY);
  const remoteStatus = String(camp.data?.status ?? "").toUpperCase();
  if (!camp.ok) blockers.push(`campaign_read_http_${camp.status}`);
  else if (!WRITABLE_STATUSES.has(remoteStatus)) blockers.push(`campaign_status_${remoteStatus || "unknown"}_not_writable`);

  const before = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY);
  const base = {
    mode, campaign_id: CAMPAIGN_ID, remote_status_before: remoteStatus || null,
    remote_sequence_count_before: Array.isArray(before.data) ? before.data.length : null,
    source_step_count: steps.length, schedule_status: "unverified_blocker", schedule_note: scheduleNote,
    proposed: sequences.map((s) => ({ seq_number: s.seq_number, subject: s.subject, delay_in_days: s.seq_delay_details.delay_in_days, body_chars: s.email_body.length })),
    sends_triggered: false, leads_changed: false, campaign_status_changed: false,
  };
  if (blockers.length) return json({ ok: false, write_blocked: true, blockers, ...base }, 200);
  if (mode === "preview") return json({ ok: true, write_blocked: false, ...base });

  const w = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sequences }),
  });
  if (!w.ok) return json({ ok: false, error: "sequence_write_failed", http_status: w.status, provider_body: w.data, ...base }, 502);

  const after = await sl(`/campaigns/${CAMPAIGN_ID}/sequences`, KEY);
  const campAfter = await sl(`/campaigns/${CAMPAIGN_ID}`, KEY);
  const v = Array.isArray(after.data) ? verify(after.data, sequences) : { count: null, pass: false, checks: [] };
  return json({
    ok: v.pass, ...base, write_http_status: w.status,
    remote_status_after: String(campAfter.data?.status ?? "").toUpperCase() || null,
    readback: v,
  });
});
