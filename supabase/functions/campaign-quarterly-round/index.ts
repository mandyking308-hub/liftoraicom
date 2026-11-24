// Quarterly repeating campaigns (any business). Founder decisions 23 Nov 2026:
// every campaign repeats each quarter forever on its own data set, 4 emails per round,
// and a round starts automatically only if all checks pass (Option B). On a critical
// failure the round stays paused and the founder is notified.
// Stages:
//   report (founder)                     -> lists plans and what is due; no changes
//   run    (cron token, or founder; dry_run supported) -> for each due plan:
//          rebuild the list from the source campaign's Liftor CRM lead mappings, drop anyone
//          suppressed / bounced / replied / unverified / catch-all, check mailboxes, the 4
//          approved emails and the shared calendar, then create a new Smartlead campaign,
//          copy the approved wording, add only eligible leads, attach healthy GSM senders and
//          start it. Never touches the source campaign. GHAT charity mailboxes never used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { lightRefresh } from "../_shared/emailRefresh.ts";
import { addMonths, filterRound, hasMoreRounds, isDue, roundCritical, sequenceProblems, type RoundContact } from "../_shared/campaignRecurrence.ts";

const BASE = "https://server.smartlead.ai/api/v1";
const POSTAL: Record<string, RegExp> = { "640de582-a112-4d16-a221-03c27f00c6ec": /1207 Delaware/i };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!, SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? "";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  let input: any = {}; try { input = await req.json(); } catch { /* */ }
  const stage = String(input?.stage ?? "report");

  let actor = "founder", actorId: string | null = null;
  const cronTok = req.headers.get("x-liftor-cron-token") ?? "";
  if (cronTok) {
    const { data: t } = await db.from("internal_cron_token").select("token").eq("id", 1).maybeSingle();
    if (!t?.token || cronTok.length < 16 || t.token !== cronTok || stage !== "run") return json({ ok: false, error: "auth_invalid" }, 401);
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
    // Founder may only report or dry-run; real rounds start from the scheduler.
    if (stage === "run" && input?.dry_run !== true) return json({ ok: false, error: "founder_run_must_be_dry_run" }, 400);
  }

  const { data: plans, error: pe } = await db.from("campaign_recurrence_plans").select("*").eq("active", true).order("next_round_at");
  if (pe) return json({ ok: false, error: "plan_lookup_failed" }, 503);
  const now = Date.now();
  if (stage === "report") return json({ ok: true, stage, plans: (plans ?? []).map((p: any) => ({ id: p.id, campaign: p.campaign_name, next_round_at: p.next_round_at, due: isDue(p.next_round_at, now), rounds_completed: p.rounds_completed })) });
  if (stage !== "run") return json({ ok: false, error: "unknown_stage" }, 400);
  if (KEY.length < 8) return json({ ok: false, error: "smartlead_key_missing" }, 412);
  const dry = input?.dry_run === true;
  const onlyPlan = typeof input?.plan_id === "string" ? input.plan_id : null;

  const results: any[] = [];
  for (const p of plans ?? []) {
    if (onlyPlan && p.id !== onlyPlan) continue;
    if (!dry && !isDue(p.next_round_at, now)) continue;
    if (!hasMoreRounds(p.rounds_completed, p.max_rounds)) continue;
    const roundNo = p.rounds_completed + 1;
    const audit = async (event_type: string, details: any) => {
      const { error } = await db.from("global_audit_events").insert({ business_id: p.business_id, actor_type: actor, actor_id: actorId, event_type, event_category: "external_action", source_module: "campaign-quarterly-round", source_table: "campaign_recurrence_plans", source_record_id: p.id, action_summary: event_type, after_summary: details, external_side_effect: !dry });
      if (error) console.error("audit_insert_failed", error.code);
    };
    const notify = (title: string, summary: string, priority: string, metadata: any) =>
      db.from("founder_approval_items").insert({ business_id: p.business_id, approval_type: "campaign_activation", source_system: "quarterly_campaign_round", source_table: "campaign_recurrence_rounds", source_id: p.id, title, summary, priority_level: priority, status: "pending", execution_enabled: false, auto_execute_allowed: false, send_allowed: false, metadata });

    // Idempotency: one round row per (plan, round number).
    let roundId: string | null = null;
    if (!dry) {
      const { data: ex } = await db.from("campaign_recurrence_rounds").select("id,status").eq("plan_id", p.id).eq("round_number", roundNo).maybeSingle();
      if (ex && ex.status !== "blocked" && ex.status !== "failed") { results.push({ plan: p.id, round: roundNo, skipped: ex.status }); continue; }
      if (ex) roundId = ex.id;
      else {
        const { data: r, error } = await db.from("campaign_recurrence_rounds").insert({ plan_id: p.id, business_id: p.business_id, round_number: roundNo, due_at: p.next_round_at }).select("id").single();
        if (error) { results.push({ plan: p.id, error: "round_insert_failed" }); continue; }
        roundId = r.id;
      }
    }
    const critical: string[] = [], notes: string[] = [];
    let eligible: RoundContact[] = [], held: Record<string, number> = {}, healthyIds: number[] = [];
    let steps: { seq_number: number; subject: string; body: string; delay: number }[] = [];
    try {
      // 1. Same data set: the source campaign's Liftor CRM lead mappings.
      const ids: string[] = [];
      for (let off = 0; ; off += 1000) {
        const { data, error } = await db.from("outbound_provider_lead_mappings").select("liftor_contact_id").eq("business_id", p.business_id).eq("provider_campaign_id", p.source_campaign_id).range(off, off + 999);
        if (error) throw new Error("lead_mapping_read_failed");
        (data ?? []).forEach((r: any) => r.liftor_contact_id && ids.push(r.liftor_contact_id)); if ((data ?? []).length < 1000) break;
      }
      const uniq = [...new Set(ids)]; const contacts: RoundContact[] = [];
      for (let i = 0; i < uniq.length; i += 200) {
        const chunk = uniq.slice(i, i + 200);
        const [cs, ev, ap, bcr] = await Promise.all([
          db.from("contacts").select("id,email,first_name,is_globally_suppressed,unsubscribed_at,hard_bounced,do_not_contact_at").in("id", chunk),
          db.from("email_events").select("contact_id").in("contact_id", chunk).in("event_type", ["bounced", "replied"]),
          db.from("apollo_contact_intelligence").select("contact_id,raw_row").eq("business_id", p.business_id).in("contact_id", chunk),
          db.from("business_contact_relationships").select("contact_id,do_not_contact,campaign_eligible").eq("business_id", p.business_id).in("contact_id", chunk),
        ]);
        if (cs.error || ev.error || ap.error || bcr.error) throw new Error("eligibility_lookup_failed"); // fail closed
        const hist = new Set((ev.data ?? []).map((e: any) => e.contact_id));
        const apm = new Map((ap.data ?? []).map((a: any) => [a.contact_id, a.raw_row]));
        const rel = new Map((bcr.data ?? []).map((r: any) => [r.contact_id, r]));
        for (const c of cs.data ?? []) {
          const r: any = rel.get(c.id); const raw: any = apm.get(c.id) ?? {};
          contacts.push({ id: c.id, email: c.email, first_name: c.first_name, suppressed: !!(c.is_globally_suppressed || c.unsubscribed_at || c.hard_bounced || c.do_not_contact_at), do_not_contact_business: !r || !!r.do_not_contact || r.campaign_eligible === false, history: hist.has(c.id), email_status: raw["Email Status"] ?? null, catch_all: raw["Primary Email Catch-all Status"] ?? null });
        }
      }
      ({ eligible, held } = filterRound(contacts, p.skip_email_verification === true));
      notes.push(`data set ${uniq.length}, eligible ${eligible.length}`);
      // 2. Approved 4 emails from the source campaign.
      const seq = await sl(`/campaigns/${p.source_campaign_id}/sequences`, KEY);
      if (!seq.ok) critical.push("sequence_unreadable");
      steps = (Array.isArray(seq.data) ? seq.data : []).map((r: any) => { const v = r.sequence_variants?.[0] ?? r; return { seq_number: Number(r.seq_number), subject: String(v.subject ?? ""), body: String(v.email_body ?? ""), delay: Number(r.seq_delay_details?.delay_in_days ?? r.seq_delay_details?.delayInDays ?? 7) }; }).sort((a: any, b: any) => a.seq_number - b.seq_number);
      // 3. Mailboxes: source campaign senders that are live GSM, warm and connected.
      const acc = await sl(`/campaigns/${p.source_campaign_id}/email-accounts`, KEY);
      const accs = Array.isArray(acc.data) ? acc.data : [];
      if (!acc.ok) critical.push("senders_unreadable");
      const { data: gsm, error: ge } = await db.from("gsm_mailboxes").select("smartlead_email_account_id,warmup_status,active,retired,estate_classification").eq("estate_classification", "gsm");
      if (ge) critical.push("mailbox_lookup_failed");
      const warm = new Set((gsm ?? []).filter((m: any) => m.active && !m.retired && m.warmup_status === "warm").map((m: any) => String(m.smartlead_email_account_id)));
      healthyIds = accs.filter((a: any) => a.is_smtp_success && a.is_imap_success && warm.has(String(a.id)) && !/ghat|charit/i.test(String(a.from_email))).map((a: any) => Number(a.id));
      // 4. Shared calendar: no other business booked on these days.
      const from = new Date(now).toISOString(), to = new Date(now + p.send_days * 86400000).toISOString();
      const { data: clash, error: ce } = await db.from("portfolio_send_bookings").select("id").neq("business_id", p.business_id).lt("starts_at", to).gt("ends_at", from).limit(1);
      if (ce) critical.push("calendar_unreadable");
      critical.push(...roundCritical({ eligible: eligible.length, healthySenders: healthyIds.length, charitySender: false, sequence: sequenceProblems(steps, POSTAL[p.business_id] ?? null), calendarClash: (clash ?? []).length > 0 }));
    } catch (e) { critical.push(String((e as Error).message)); }

    // Never more than 25 emails per mailbox per day across the whole sequence.
    const perDay = Math.max(1, Math.min(Math.ceil(eligible.length / p.send_days), Math.floor((healthyIds.length * 25) / Math.max(1, Number(p.sequence_steps) || 4))));
    const report = { plan_id: p.id, campaign: p.campaign_name, round: roundNo, dry_run: dry, eligible: eligible.length, held, healthy_senders: healthyIds.length, per_day: perDay, critical, notes };
    if (dry) { results.push({ ok: critical.length === 0, ...report }); continue; }
    if (!p.auto_start) critical.push("auto_start_off");
    const finish = async (status: string, providerId: string | null) => {
      await db.from("campaign_recurrence_rounds").update({ status, provider_campaign_id: providerId, eligible_count: eligible.length, held_counts: held, critical, notes, checked_at: new Date().toISOString() }).eq("id", roundId!);
    };
    if (critical.length) {
      await finish("blocked", null); await audit("quarterly_round_blocked", report);
      await notify(`${p.campaign_name}: quarterly round ${roundNo} NOT started`, `Kept paused. ${critical.join("; ")}`, "critical", report);
      results.push({ ok: false, ...report }); continue;
    }
    // Create, fill and start the new round's campaign.
    // Light AI rewording (founder-approved); any unsafe change keeps the approved wording.
    const rw = await lightRefresh(steps, POSTAL[p.business_id] ?? null, roundNo);
    steps = rw.steps; notes.push(`AI light rewording applied to ${rw.refreshed} of ${steps.length} emails`);
    const name = `${p.campaign_name} — Q round ${roundNo}`;
    const fail = async (why: string, cid: string | null) => {
      critical.push(why); await finish("failed", cid); await audit("quarterly_round_failed", { ...report, critical });
      await notify(`${p.campaign_name}: quarterly round ${roundNo} failed to start`, `Kept paused. ${why}`, "critical", report);
      results.push({ ok: false, ...report });
    };
    const cr = await sl(`/campaigns/create`, KEY, post({ name }));
    const newId = cr.ok && cr.data?.id != null ? String(cr.data.id) : null;
    if (!newId) { await fail("campaign_create_failed", null); continue; }
    const sq = await sl(`/campaigns/${newId}/sequences`, KEY, post({ sequences: steps.map((s, i) => ({ seq_number: i + 1, seq_delay_details: { delay_in_days: i === 0 ? 0 : s.delay || 7 }, subject: s.subject, email_body: s.body })) }));
    if (!sq.ok) { await fail("sequence_write_failed", newId); continue; }
    let added = 0;
    for (let i = 0; i < eligible.length; i += 100) {
      const r = await sl(`/campaigns/${newId}/leads`, KEY, post({ lead_list: eligible.slice(i, i + 100).map((c) => ({ email: String(c.email).trim().toLowerCase(), first_name: c.first_name })), settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: true } }));
      if (r.ok) added += Number(r.data?.upload_count ?? r.data?.added_count ?? 0);
      else { added = -1; break; }
    }
    if (added < 0) { await fail("lead_upload_failed", newId); continue; }
    const ea = await sl(`/campaigns/${newId}/email-accounts`, KEY, post({ email_account_ids: healthyIds }));
    if (!ea.ok) { await fail("sender_attach_failed", newId); continue; }
    const sc = await sl(`/campaigns/${newId}/schedule`, KEY, post({ timezone: "Europe/London", days_of_the_week: [1, 2, 3, 4, 5], start_hour: "10:00", end_hour: "17:00", min_time_btw_emails: 10, max_new_leads_per_day: perDay }));
    if (!sc.ok) { await fail("schedule_write_failed", newId); continue; }
    await sl(`/campaigns/${newId}/settings`, KEY, post({ track_settings: ["DONT_TRACK_EMAIL_OPEN", "DONT_TRACK_LINK_CLICK"], stop_lead_settings: "REPLY_TO_AN_EMAIL", send_as_plain_text: false }));
    const st = await sl(`/campaigns/${newId}/status`, KEY, post({ status: "START" }));
    const back = await sl(`/campaigns/${newId}`, KEY); const after = String(back.data?.status ?? "").toUpperCase();
    if (!st.ok || after !== "ACTIVE") { await fail(`start_failed_${after || "unknown"}`, newId); continue; }
    await finish("started", newId);
    await db.from("campaign_recurrence_plans").update({ rounds_completed: roundNo, next_round_at: addMonths(p.next_round_at), updated_at: new Date().toISOString() }).eq("id", p.id);
    await audit("quarterly_round_started", { ...report, provider_campaign_id: newId, leads_uploaded: added });
    await notify(`${p.campaign_name}: quarterly round ${roundNo} started`, `${eligible.length} contacts, about ${perDay} new per weekday from 10:00 UK.`, "high", { ...report, provider_campaign_id: newId });
    results.push({ ok: true, started: true, provider_campaign_id: newId, ...report });
  }
  return json({ ok: true, stage, dry_run: dry, results });
});
