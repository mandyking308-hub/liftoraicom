import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Autopilot orchestrator — policy-controlled Apollo → reveal → promote → queue → send.
 * Reuses existing audit tables: autopilot_runs (summary), founder_decisions (approvals),
 * system_events (per-stage detail). Apollo credit usage logged in apollo_credit_ledger
 * (keyed by business_id).
 *
 * Hard guardrails: bounced/suppressed/internal blocked, duplicates blocked, CRM-new
 * required, domain caps respected, BCR row created during promotion, queue insert
 * subject to existing crm-send-check + duplicate-pending guards. Auto-send remains
 * gated by policy.auto_send_after_queue (defaults false).
 *
 * Default dry_run = true. No Apollo credits are spent unless dry_run=false AND
 * policy.apollo_email_reveal_autonomous = true.
 */

type Counters = {
  candidates_pulled: number;
  passed_quality_policy: number;
  reveal_eligible: number;
  reveal_planned: number;
  reveal_skipped_budget: number;
  reveal_skipped_domain_cap: number;
  reveal_skipped_excluded: number;
  promote_planned: number;
  promote_skipped: number;
  queue_planned: number;
  queue_skipped: number;
  would_send: number;
  decisions_created: number;
  credits_used_today: number;
  credits_used_month: number;
  credits_remaining_today: number;
  credits_remaining_month: number;
  estimated_credits_this_run: number;
  // Granular reason buckets (additive — sum may exceed reveal_skipped_excluded
  // because a single candidate is counted under one specific reason).
  skipped_below_min_score: number;
  skipped_missing_score: number;
  skipped_missing_quality_profile: number;
  skipped_lifecycle_mismatch: number;
  skipped_existing_crm: number;
  skipped_duplicate: number;
  skipped_suppressed_or_bounced: number;
  skipped_previous_no_email: number;
  skipped_legacy_hold: number;
  skipped_unknown: number;
  skipped_reveal_disabled: number;
  // Reveal automation OFF accounting — what WOULD happen if founder enabled
  // policy.apollo_email_reveal_autonomous (still bounded by budget + domain cap).
  eligible_pending_founder_policy: number;
  planned_if_policy_enabled: number;
  // Founder-defined reveal amount accounting
  reveal_eligible_total: number;
  founder_reveal_amount_requested: number | null;
  selected_for_next_reveal: number;
  held_back_by_founder_amount: number;
  held_back_by_budget: number;
  held_back_by_domain_cap: number;
  would_spend_credits: number;
};

// Normalize helpers — used for pre-reveal dedupe and company grouping.
function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}
function dedupeKey(lead: any): { key: string; source: string } {
  if (lead?.apollo_person_id) return { key: `pid:${String(lead.apollo_person_id).toLowerCase()}`, source: "apollo_person_id" };
  const li = (lead?.linkedin_url ?? "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  if (li) return { key: `li:${li}`, source: "linkedin_url" };
  const fn = norm(lead?.first_name); const ln = norm(lead?.last_name);
  const co = norm(lead?.company); const ti = norm(lead?.title);
  return { key: `nm:${fn}|${ln}|${co}|${ti}`, source: "name_company_title" };
}
function companyGroupKey(lead: any): { key: string; display: string; source: string } {
  const dom = (lead?.email_domain ?? "").toLowerCase().trim();
  if (dom) return { key: `dom:${dom}`, display: dom, source: "email_domain" };
  const orgId = lead?.apollo_org_id ? String(lead.apollo_org_id) : "";
  if (orgId) return { key: `org:${orgId.toLowerCase()}`, display: `org:${orgId.slice(0, 8)}`, source: "apollo_org_id" };
  const co = norm(lead?.company);
  if (co) return { key: `co:${co}`, display: `co:${lead.company}`, source: "company_name" };
  return { key: "unknown", display: "—", source: "none" };
}

// Inline deterministic scorer — mirrors apollo-unlock-shortlist title/company
// rules and returns a 0–10 score plus a campaign_fit label. NO Apollo calls,
// NO AI, NO credits.
const POSITIVE_KEYWORDS: Array<{ tag: string; weight: number; pattern: RegExp }> = [
  { tag: "playlist_curator", weight: 7, pattern: /\b(playlist|curator|a\s*&\s*r|a\s*and\s*r|editorial)\b/i },
  { tag: "music_supervisor", weight: 6, pattern: /\b(music\s*supervisor|sync\s*licens|music\s*editor|music\s*licens)\b/i },
  { tag: "dj",               weight: 5, pattern: /\b(dj|selector|turntab|residen(t|cy))\b/i },
  { tag: "music_blog",       weight: 5, pattern: /\b(music\s*(blog|journal|critic|writer|editor|reporter)|press\b)\b/i },
  { tag: "radio",            weight: 5, pattern: /\b(radio|broadcast|presenter|host\b|program(me)?\s*director)\b/i },
  { tag: "event_promoter",   weight: 4, pattern: /\b(promoter|booker|booking|festival|venue|club\b|nightlife)\b/i },
  { tag: "creator_influencer", weight: 4, pattern: /\b(influencer|creator|youtub|tiktok|streamer|content\s*creator)\b/i },
];
const NEGATIVE_KEYWORDS: Array<{ tag: string; weight: number; pattern: RegExp }> = [
  { tag: "hospitality_unrelated", weight: -5, pattern: /\b(housekeep|concierge|front\s*desk|waiter|waitress|chef|sous|barista)\b/i },
  { tag: "generic_corporate",     weight: -3, pattern: /\b(general\s*manager|operations\s*manager|customs|purchas|procurement|hr\b|human\s*resources|finance|accounting)\b/i },
  { tag: "engineering_unrelated", weight: -2, pattern: /\b(software\s*engineer|developer|qa\s*engineer|backend|frontend)\b/i },
];
const COMPANY_BONUS = /\b(music|playlist|radio|curator|records|sound|audio|beat|spotify|tidal|deezer|amazon\s*music|apple\s*music)\b/i;

function computeFit(title: string | null, company: string | null): { score: number; fit: string; reasons: string[] } {
  const t = (title ?? "").trim();
  const c = (company ?? "").trim();
  const text = `${t} ${c}`;
  const reasons: string[] = [];
  let score = 0;
  let bestTag = "poor_fit";
  let bestWeight = 0;
  if (!t) { score -= 3; reasons.push("missing_title"); }
  for (const k of POSITIVE_KEYWORDS) {
    if (k.pattern.test(text)) {
      score += k.weight; reasons.push(`+${k.tag}`);
      if (k.weight > bestWeight) { bestWeight = k.weight; bestTag = k.tag; }
    }
  }
  for (const k of NEGATIVE_KEYWORDS) {
    if (k.pattern.test(text)) { score += k.weight; reasons.push(`-${k.tag}`); }
  }
  if (c && COMPANY_BONUS.test(c)) { score += 1; reasons.push("+company_music_brand"); }
  // Clamp to 0–10 and label.
  const clamped = Math.max(0, Math.min(10, score));
  let fit = "poor";
  if (clamped >= 7) fit = "strong";
  else if (clamped >= 5) fit = "moderate";
  else if (clamped >= 3) fit = "weak";
  return { score: clamped, fit, reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
  // Service role key bypass (used by cron / pg_net invocations)
  const isServiceRole = auth === `Bearer ${SERVICE_KEY}`;

  let actor = "system";
  let actorUserId: string | null = null;
  if (!isCron && !isServiceRole) {
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false },
    });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const tmp = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: role } = await tmp.from("user_roles")
      .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
    if (!role) return json({ error: "Founder role required" }, 403);
    actor = "founder";
    actorUserId = u.user.id;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: {
    business_name?: string;
    business_id?: string;
    dry_run?: boolean;
    reveal_amount?: number | null;
  } = {};
  try { body = await req.json(); } catch {}
  const dryRun = body.dry_run !== false;

  // Resolve business by id or name
  const { data: biz } = body.business_id
    ? await admin.from("businesses").select("id,name").eq("id", body.business_id).maybeSingle()
    : await admin.from("businesses").select("id,name").eq("name", body.business_name ?? "Neon Candy").maybeSingle();
  if (!biz) return json({ error: "business not found" }, 404);
  const businessId = biz.id as string;
  const businessName = biz.name as string;

  const { data: policy } = await admin.from("business_autopilot_settings")
    .select("*").eq("business_id", businessId).maybeSingle();
  if (!policy) return json({ error: "No autopilot policy for business" }, 404);

  // Open run row
  const { data: runRow, error: runErr } = await admin.from("autopilot_runs").insert({
    business_id: businessId,
    trigger: actor === "founder" ? "founder_manual" : "cron",
    status: "running",
    details: { dry_run: dryRun, actor_user_id: actorUserId } as never,
  }).select("id").single();
  if (runErr || !runRow) return json({ error: `failed to open run: ${runErr?.message}` }, 500);
  const runId = runRow.id as string;

  const counters: Counters = {
    candidates_pulled: 0, passed_quality_policy: 0,
    reveal_eligible: 0, reveal_planned: 0,
    reveal_skipped_budget: 0, reveal_skipped_domain_cap: 0, reveal_skipped_excluded: 0,
    promote_planned: 0, promote_skipped: 0,
    queue_planned: 0, queue_skipped: 0,
    would_send: 0, decisions_created: 0,
    credits_used_today: 0, credits_used_month: 0,
    credits_remaining_today: 0, credits_remaining_month: 0,
    estimated_credits_this_run: 0,
    skipped_below_min_score: 0, skipped_missing_score: 0,
    skipped_missing_quality_profile: 0, skipped_lifecycle_mismatch: 0,
    skipped_existing_crm: 0, skipped_duplicate: 0,
    skipped_suppressed_or_bounced: 0, skipped_previous_no_email: 0,
    skipped_legacy_hold: 0, skipped_unknown: 0, skipped_reveal_disabled: 0,
    eligible_pending_founder_policy: 0, planned_if_policy_enabled: 0,
    reveal_eligible_total: 0,
    founder_reveal_amount_requested: null,
    selected_for_next_reveal: 0,
    held_back_by_founder_amount: 0,
    held_back_by_budget: 0,
    held_back_by_domain_cap: 0,
    would_spend_credits: 0,
  };

  const sampleSkips: Array<Record<string, unknown>> = [];
  const pushSkip = (entry: Record<string, unknown>) => {
    if (sampleSkips.length < 50) sampleSkips.push(entry);
  };

  // Helper: detail event
  const event = async (eventType: string, message: string, severity: "low" | "medium" | "high" = "low", metadata: any = {}) => {
    await admin.from("system_events").insert({
      event_type: `autopilot.${eventType}`,
      entity_type: "autopilot_run", entity_id: runId,
      business_name: businessName, severity, message,
      metadata: { run_id: runId, business_id: businessId, dry_run: dryRun, ...metadata },
      resolved: true,
    });
  };

  await event("run_start", `Autopilot ${dryRun ? "dry-run" : "live"} for ${businessName}`, "low");

  // ---------- Credit budget (uses business_id) ----------
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(today); monthStart.setUTCDate(1);
  const { data: ledger } = await admin.from("apollo_credit_ledger")
    .select("credits_used,created_at")
    .eq("business_id", businessId)
    .gte("created_at", monthStart.toISOString());
  const usedMonth = (ledger ?? []).reduce((s, r) => s + (r.credits_used ?? 0), 0);
  const usedToday = (ledger ?? []).filter(r => new Date(r.created_at) >= today)
    .reduce((s, r) => s + (r.credits_used ?? 0), 0);
  counters.credits_used_today = usedToday;
  counters.credits_used_month = usedMonth;
  counters.credits_remaining_today = Math.max(0, policy.apollo_reveal_daily_credit_budget - usedToday);
  counters.credits_remaining_month = Math.max(0, policy.apollo_reveal_monthly_credit_budget - usedMonth);

  // ---------- Stage 1: Quality-pass reveal candidates ----------
  const { data: revealCandidates } = await admin
    .from("lead_quality_profiles")
    .select("id, apollo_lead_id, lifecycle_stage, fit_confidence, campaign_fit, risk_flags, dup_of_contact_id")
    .in("lifecycle_stage", ["email_reveal_required", "verified_email_available_locked"])
    .limit(2000);
  counters.candidates_pulled = revealCandidates?.length ?? 0;

  const leadIds = (revealCandidates ?? []).map(c => c.apollo_lead_id);
  const { data: rawLeads } = leadIds.length
    ? await admin.from("apollo_raw_leads")
      .select("apollo_lead_id, apollo_person_id, email_domain, email, business_name, first_name, last_name, title, company, country, linkedin_url, apollo_org_id, campaign_fit")
      .in("apollo_lead_id", leadIds)
    : { data: [] as any[] };
  const leadByQp = new Map<string, any>();
  for (const r of rawLeads ?? []) leadByQp.set(r.apollo_lead_id, r);

  const personIds = (rawLeads ?? []).map(r => r.apollo_person_id).filter(Boolean);
  const { data: crmHits } = personIds.length
    ? await admin.from("contacts").select("apollo_person_id").in("apollo_person_id", personIds)
    : { data: [] as any[] };
  const crmPersonSet = new Set((crmHits ?? []).map(c => c.apollo_person_id));

  const eligible: Array<{
    qp: any; lead: any; score: number;
    domain: string;
    group_key: string; group_display: string; group_source: string;
    dup_key: string; dup_source: string;
  }> = [];

  for (const qp of revealCandidates ?? []) {
    const lead = leadByQp.get(qp.apollo_lead_id);
    const baseSkip = {
      stage: "reveal",
      candidate_id: qp.id,
      apollo_lead_id: qp.apollo_lead_id,
      lifecycle_stage: qp.lifecycle_stage,
      business_match: true, // lead_quality_profiles is global; no business_id column on it
    };
    if (!lead) {
      counters.skipped_missing_quality_profile++;
      counters.reveal_skipped_excluded++;
      pushSkip({ ...baseSkip, reason: "no_lead_record" });
      continue;
    }
    const ctx = {
      ...baseSkip,
      name: `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || null,
      company: lead.company ?? null,
      domain: lead.email_domain ?? null,
      email_available: !!lead.email,
    };

    if (policy.apollo_reveal_exclude_existing_crm && lead.apollo_person_id && crmPersonSet.has(lead.apollo_person_id)) {
      counters.skipped_existing_crm++; counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: "already_in_crm" }); continue;
    }
    if (policy.apollo_reveal_exclude_duplicates && qp.dup_of_contact_id) {
      counters.skipped_duplicate++; counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: "duplicate" }); continue;
    }
    if (policy.apollo_reveal_exclude_poor_fit && qp.campaign_fit === "poor") {
      counters.skipped_below_min_score++; counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: "poor_fit_label", source_quality_score: (qp.fit_confidence ?? 0) * 10 }); continue;
    }
    if (policy.apollo_reveal_exclude_legacy_hold && qp.lifecycle_stage === "legacy_needs_verification_hold") {
      counters.skipped_legacy_hold++; counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: "legacy_hold" }); continue;
    }
    const flags: string[] = qp.risk_flags ?? [];
    if (flags.includes("bounced") || flags.includes("suppressed") || flags.includes("internal")) {
      counters.skipped_suppressed_or_bounced++; counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: "bounced_or_suppressed", risk_flags: flags }); continue;
    }
    if (flags.includes("unlock_attempt_no_email")) {
      counters.skipped_previous_no_email++; counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: "previous_no_email" }); continue;
    }

    // Score: prefer stored fit_confidence (0–1), else compute on the fly from title+company.
    let score: number;
    let computed = false;
    if (qp.fit_confidence != null) {
      score = Math.round(((qp.fit_confidence ?? 0) * 10) * 10) / 10;
    } else {
      const c = computeFit(lead.title, lead.company);
      score = c.score; computed = true;
    }
    if (score < policy.apollo_reveal_min_quality_score) {
      if (qp.fit_confidence == null && score === 0) counters.skipped_missing_score++;
      else counters.skipped_below_min_score++;
      counters.reveal_skipped_excluded++;
      pushSkip({ ...ctx, reason: `score_${score}_below_${policy.apollo_reveal_min_quality_score}`, source_quality_score: score, computed_on_the_fly: computed });
      continue;
    }

    counters.passed_quality_policy++;
    const grp = companyGroupKey(lead);
    const dup = dedupeKey(lead);
    eligible.push({
      qp, lead, score,
      domain: (lead.email_domain ?? "").toLowerCase(),
      group_key: grp.key, group_display: grp.display, group_source: grp.source,
      dup_key: dup.key, dup_source: dup.source,
    });
  }

  // Sort by score, then stable on apollo_lead_id so dedupe selection is deterministic.
  eligible.sort((a, b) => (b.score - a.score) || String(a.qp.apollo_lead_id).localeCompare(String(b.qp.apollo_lead_id)));

  // ---------- Pre-reveal dedupe (BEFORE domain cap, BEFORE selection) ----------
  const dedupeSeen = new Map<string, { qp_id: string; apollo_lead_id: string; name: string; company: string }>();
  const dedupedEligible: typeof eligible = [];
  const duplicatesHeldBack: Array<Record<string, unknown>> = [];
  for (const e of eligible) {
    const existing = dedupeSeen.get(e.dup_key);
    const name = `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || "—";
    if (existing) {
      (counters as any).held_back_by_duplicate_pre_reveal =
        ((counters as any).held_back_by_duplicate_pre_reveal ?? 0) + 1;
      counters.skipped_duplicate++;
      duplicatesHeldBack.push({
        candidate_id: e.qp.id,
        apollo_lead_id: e.qp.apollo_lead_id,
        apollo_person_id: e.lead.apollo_person_id ?? null,
        name, company: e.lead.company ?? null,
        duplicate_key: e.dup_key,
        duplicate_key_source: e.dup_source,
        matched_selected_candidate: existing,
        reason_held: "duplicate_pre_reveal",
      });
      pushSkip({ stage: "reveal", reason: "duplicate_pre_reveal", candidate_id: e.qp.id, dup_key: e.dup_key, matched: existing });
      continue;
    }
    dedupeSeen.set(e.dup_key, { qp_id: e.qp.id, apollo_lead_id: e.qp.apollo_lead_id, name, company: e.lead.company ?? "—" });
    dedupedEligible.push(e);
  }
  (counters as any).duplicate_candidates_detected = duplicatesHeldBack.length;
  (counters as any).selected_unique_candidates = dedupedEligible.length;

  // ---------- Domain / company-group cap (operates on derived group_key) ----------
  const groupSeen = new Map<string, number>();
  const planReveal: typeof eligible = [];
  for (const e of dedupedEligible) {
    const cap = policy.apollo_reveal_max_domain_frequency;
    const cnt = groupSeen.get(e.group_key) ?? 0;
    if (cap > 0 && e.group_key !== "unknown" && cnt >= cap) {
      counters.reveal_skipped_domain_cap++;
      (counters as any).held_back_by_company_or_domain_cap =
        ((counters as any).held_back_by_company_or_domain_cap ?? 0) + 1;
      pushSkip({
        stage: "reveal", reason: "company_or_domain_cap_pre_reveal",
        candidate_id: e.qp.id, group_key: e.group_key, group_source: e.group_source,
        source_quality_score: e.score,
      });
      continue;
    }
    groupSeen.set(e.group_key, cnt + 1);
    planReveal.push(e);
  }
  (counters as any).company_group_cap_applied = groupSeen.size;
  counters.reveal_eligible = planReveal.length;

  const budgetCap = Math.min(counters.credits_remaining_today, counters.credits_remaining_month);

  // ---------- Founder-defined reveal amount ----------
  // The founder must explicitly enter how many emails to reveal — we never
  // default to the daily budget or a hardcoded number. Per-invocation
  // body.reveal_amount overrides the saved policy value (one-shot approval).
  const rawAmount =
    body.reveal_amount !== undefined && body.reveal_amount !== null
      ? Number(body.reveal_amount)
      : (policy.founder_reveal_amount_next_run as number | null);
  const founderAmount =
    rawAmount === null || rawAmount === undefined || Number.isNaN(rawAmount) || rawAmount <= 0
      ? null
      : Math.floor(rawAmount);
  counters.founder_reveal_amount_requested = founderAmount;
  counters.reveal_eligible_total = planReveal.length;

  // Selection chain: founder amount → daily/monthly budget → domain cap (already
  // applied above to planReveal). Emit detailed held-back accounting.
  const afterFounder = founderAmount === null ? [] : planReveal.slice(0, founderAmount);
  counters.held_back_by_founder_amount = founderAmount === null
    ? planReveal.length
    : Math.max(0, planReveal.length - founderAmount);

  const afterBudget = afterFounder.slice(0, budgetCap);
  counters.held_back_by_budget = afterFounder.length - afterBudget.length;
  counters.held_back_by_domain_cap = counters.reveal_skipped_domain_cap;

  counters.selected_for_next_reveal = afterBudget.length;
  counters.would_spend_credits = afterBudget.length;

  // Back-compat counters (kept for the existing dashboard tiles).
  counters.planned_if_policy_enabled = afterBudget.length;
  counters.eligible_pending_founder_policy =
    !policy.apollo_email_reveal_autonomous ? planReveal.length : 0;
  counters.reveal_skipped_budget = counters.held_back_by_budget;

  // Live reveal has TWO independent approval paths:
  //   A) One-shot founder approval — founder enters reveal_amount and explicitly
  //      runs live. Permitted even while full autonomous reveal is OFF.
  //   B) Full autonomous reveal — apollo_email_reveal_autonomous = true.
  // The only hard block is the absence of a founder amount AND no autonomy.
  let blockedReason: string | null = null;
  let revealMode: "one_shot_founder" | "autonomous" | "blocked" = "blocked";
  if (founderAmount !== null && founderAmount > 0) {
    revealMode = "one_shot_founder";
  } else if (policy.apollo_email_reveal_autonomous) {
    revealMode = "autonomous";
  } else {
    blockedReason = "founder_reveal_amount_required";
  }

  const finalReveal = blockedReason === null ? afterBudget : [];
  counters.reveal_planned = finalReveal.length;
  // Selected candidates are awaiting one-shot approval, not "skipped — reveal OFF".
  counters.skipped_reveal_disabled = 0;
  (counters as any).awaiting_founder_reveal_approval =
    revealMode === "one_shot_founder" && dryRun ? afterBudget.length : 0;
  (counters as any).reveal_mode = revealMode as any;
  counters.estimated_credits_this_run = finalReveal.length;

  // Selected-candidate review payload (always returned, never mutates state).
  const selectedCandidates = afterBudget.map(e => ({
    candidate_id: e.qp.id,
    apollo_lead_id: e.qp.apollo_lead_id,
    apollo_person_id: e.lead.apollo_person_id ?? null,
    name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
    title: e.lead.title ?? null,
    company: e.lead.company ?? null,
    domain: e.domain || null,
    domain_or_company_group: e.group_display,
    group_source: e.group_source,
    duplicate_key: e.dup_key,
    duplicate_key_source: e.dup_source,
    why_selected: `score=${e.score} fit=${e.qp.campaign_fit ?? "—"} group=${e.group_display}`,
    country: e.lead.country ?? null,
    source_quality_score: e.score,
    campaign_fit: e.qp.campaign_fit ?? e.lead.campaign_fit ?? null,
    lifecycle_stage: e.qp.lifecycle_stage,
    email_available: !!e.lead.email,
    crm_duplicate: false,
    suppression_or_bounce: false,
    domain_cap_ok: true,
    estimated_credit_cost: 1,
  }));
  const eligibleNotSelected = planReveal.slice(afterBudget.length).map(e => ({
    candidate_id: e.qp.id,
    apollo_lead_id: e.qp.apollo_lead_id,
    name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
    title: e.lead.title ?? null,
    company: e.lead.company ?? null,
    domain: e.domain || null,
    domain_or_company_group: e.group_display,
    source_quality_score: e.score,
    reason_not_selected:
      founderAmount === null ? "founder_amount_not_set"
      : afterFounder.length > afterBudget.length ? "budget_cap"
      : "above_founder_amount",
  }));

  await event("reveal_plan",
    `Reveal plan: mode=${revealMode} founder_amount=${founderAmount ?? "unset"} selected=${finalReveal.length} eligible=${planReveal.length} budget_cap=${budgetCap} blocked=${blockedReason ?? "none"}`,
    "low",
    { counters: { reveal_planned: finalReveal.length, reveal_eligible: planReveal.length, budget_cap: budgetCap, founder_amount: founderAmount, blocked_reason: blockedReason, reveal_mode: revealMode } });

  // ---------- Stage 2: Reveal execution (only when not dry-run + autonomous reveal) ----------
  // Per-candidate reveal outcomes — persisted in autopilot_runs.details for UI rendering.
  const revealOutcomes: Array<Record<string, unknown>> = [];
  let liveRevealAttempted = false;
  let apolloApiCalled = false;
  let creditsActuallySpent = 0;
  let emailsReturned = 0;
  let providerErrors = 0;
  let revealAlreadyRecorded = false;

  if (!dryRun && blockedReason === null && finalReveal.length > 0) {
    liveRevealAttempted = true;

    // Idempotency: if a ledger row already exists for this run_id, do NOT
    // re-spend. The unique index added in migration enforces this at DB level
    // but we also short-circuit in code so we report "already recorded".
    const { data: existingLedger } = await admin.from("apollo_credit_ledger")
      .select("id, credits_used, metadata")
      .eq("business_id", businessId)
      .eq("function_source", "reveal")
      .filter("metadata->>run_id", "eq", runId)
      .maybeSingle();

    if (existingLedger) {
      revealAlreadyRecorded = true;
      await event("reveal_idempotent_skip",
        `Reveal already recorded for run ${runId}; skipping re-spend`, "medium",
        { ledger_id: existingLedger.id });
    } else {
      // Resolve Apollo API key for this business
      const ENC_KEY =
        Deno.env.get("APOLLO_ENCRYPTION_KEY") ??
        Deno.env.get("APOLLO_KEY_ENC") ??
        Deno.env.get("APOLLO_ENC_KEY") ??
        "";
      const { data: conn } = await admin.from("apollo_connections")
        .select("api_key_cipher, enrichment_api_status, is_active")
        .eq("business_name", businessName).maybeSingle();

      let apiKey: string | null = null;
      let preflightError: string | null = null;
      if (!conn) preflightError = "no_apollo_connection";
      else if (!conn.is_active) preflightError = "apollo_connection_inactive";
      else if (conn.enrichment_api_status !== "ok") preflightError = "enrichment_api_not_verified";
      else {
        const { data: dec } = await admin.rpc("apollo_decrypt_key", {
          cipher: conn.api_key_cipher, enc_key: ENC_KEY,
        });
        apiKey = (dec as string) || null;
        if (!apiKey) preflightError = "apollo_key_decrypt_failed";
      }

      if (preflightError) {
        // Record outcome for each selected candidate WITHOUT spending credits
        for (const e of finalReveal) {
          revealOutcomes.push({
            candidate_id: e.qp.id,
            apollo_lead_id: e.qp.apollo_lead_id,
            apollo_person_id: e.lead.apollo_person_id ?? null,
            name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
            company: e.lead.company ?? null,
            outcome: "reveal_failed_provider_error",
            apollo_called: false,
            apollo_status: null,
            email_returned: false,
            email: null,
            credit_consumed: false,
            error: preflightError,
          });
          providerErrors++;
        }
        await event("reveal_failed", `Apollo preflight failed: ${preflightError}`, "high",
          { preflight_error: preflightError, candidates: finalReveal.length });
      } else {
        // Per-candidate Apollo /people/match calls
        const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const APOLLO_BASE = "https://api.apollo.io/api/v1";
        for (const e of finalReveal) {
          const pid = e.lead.apollo_person_id;
          if (!pid) {
            revealOutcomes.push({
              candidate_id: e.qp.id, apollo_lead_id: e.qp.apollo_lead_id,
              apollo_person_id: null,
              name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
              company: e.lead.company ?? null,
              outcome: "reveal_failed_missing_apollo_person_id",
              apollo_called: false, apollo_status: null,
              email_returned: false, email: null, credit_consumed: false,
            });
            continue;
          }
          let resp: Response | null = null;
          let data: any = null;
          let httpErr: string | null = null;
          try {
            resp = await fetch(
              `${APOLLO_BASE}/people/match?id=${encodeURIComponent(pid)}&reveal_personal_emails=false`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey! },
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(15_000),
              },
            );
            apolloApiCalled = true;
            data = await resp.json().catch(() => null);
          } catch (err) {
            httpErr = (err as Error).message;
          }
          const person = data?.person ?? data?.matched_person ?? null;
          const email: string | null =
            person?.email && EMAIL_RE.test(person.email) ? person.email : null;
          if (resp?.ok && email) {
            // Apollo returned an email → real credit spend
            const domain = email.split("@")[1]?.toLowerCase() ?? null;
            await admin.from("apollo_leads")
              .update({ email, status: "enriched", enrichment_payload: person })
              .eq("id", e.qp.apollo_lead_id);
            await admin.from("apollo_raw_leads")
              .update({ email, email_domain: domain })
              .eq("apollo_lead_id", e.qp.apollo_lead_id);
            const baseFlags = (e.qp.risk_flags ?? []).filter((f: string) =>
              f !== "missing_email" && f !== "needs_apollo_unlock" && f !== "apollo_email_unavailable");
            await admin.from("lead_quality_profiles").update({
              risk_flags: baseFlags,
              unlock_recommendation: "unlocked",
              lifecycle_stage: "safe_to_promote_after_reveal",
            }).eq("id", e.qp.id);
            creditsActuallySpent++;
            emailsReturned++;
            revealOutcomes.push({
              candidate_id: e.qp.id, apollo_lead_id: e.qp.apollo_lead_id,
              apollo_person_id: pid,
              name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
              company: e.lead.company ?? null,
              outcome: "revealed_success_email_returned",
              apollo_called: true, apollo_status: resp.status,
              email_returned: true, email, credit_consumed: true,
            });
          } else if (resp?.ok && !email) {
            // Apollo accepted but had no email — treat as no credit consumed
            await admin.from("lead_quality_profiles").update({
              risk_flags: Array.from(new Set([...(e.qp.risk_flags ?? []), "apollo_email_unavailable"])),
              unlock_recommendation: "attempted_no_email",
            }).eq("id", e.qp.id);
            revealOutcomes.push({
              candidate_id: e.qp.id, apollo_lead_id: e.qp.apollo_lead_id,
              apollo_person_id: pid,
              name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
              company: e.lead.company ?? null,
              outcome: "reveal_success_no_email_returned",
              apollo_called: true, apollo_status: resp.status,
              email_returned: false, email: null, credit_consumed: false,
            });
          } else {
            providerErrors++;
            revealOutcomes.push({
              candidate_id: e.qp.id, apollo_lead_id: e.qp.apollo_lead_id,
              apollo_person_id: pid,
              name: `${e.lead.first_name ?? ""} ${e.lead.last_name ?? ""}`.trim() || null,
              company: e.lead.company ?? null,
              outcome: "reveal_failed_provider_error",
              apollo_called: !!resp,
              apollo_status: resp?.status ?? null,
              email_returned: false, email: null, credit_consumed: false,
              error: httpErr ?? data?.error ?? `apollo_status_${resp?.status ?? "unknown"}`,
            });
          }
        }

        // Ledger row reflects ACTUAL credits Apollo charged us for (emails returned only).
        const { error: ledErr } = await admin.from("apollo_credit_ledger").insert({
          business_id: businessId, business_name: businessName,
          function_source: "reveal",
          credits_used: creditsActuallySpent,
          apollo_person_ids: finalReveal.map(e => e.lead.apollo_person_id).filter(Boolean),
          metadata: {
            run_id: runId,
            attempted: finalReveal.length,
            emails_returned: emailsReturned,
            provider_errors: providerErrors,
            apollo_api_called: apolloApiCalled,
          } as never,
        });
        if (ledErr) {
          await event("reveal_ledger_insert_failed", ledErr.message, "high");
        }

        await event("reveal_executed",
          `Reveal completed: attempted=${finalReveal.length} emails_returned=${emailsReturned} credits_spent=${creditsActuallySpent} provider_errors=${providerErrors}`,
          emailsReturned > 0 ? "medium" : "high",
          { attempted: finalReveal.length, emails_returned: emailsReturned, credits_spent: creditsActuallySpent, provider_errors: providerErrors });

        // Refresh today/month counters AFTER this run's spend so the run snapshot is consistent.
        counters.credits_used_today = usedToday + creditsActuallySpent;
        counters.credits_used_month = usedMonth + creditsActuallySpent;
        counters.credits_remaining_today = Math.max(0, policy.apollo_reveal_daily_credit_budget - counters.credits_used_today);
        counters.credits_remaining_month = Math.max(0, policy.apollo_reveal_monthly_credit_budget - counters.credits_used_month);

        // One-shot: clear the saved founder amount only on a real attempt (success or failure)
        // so retries are not auto-armed.
        await admin.from("business_autopilot_settings")
          .update({ founder_reveal_amount_next_run: null } as never)
          .eq("business_id", businessId);
      }
    }
  } else if (!dryRun && blockedReason !== null) {
    await event("reveal_blocked",
      `Live reveal blocked — ${blockedReason}`, "medium",
      { blocked_reason: blockedReason, founder_amount: founderAmount });
  }

  // Expose reveal-execution counters to UI
  (counters as any).live_reveal_attempted = liveRevealAttempted;
  (counters as any).apollo_api_called = apolloApiCalled;
  (counters as any).credits_spent = creditsActuallySpent;
  (counters as any).emails_returned = emailsReturned;
  (counters as any).reveal_provider_errors = providerErrors;
  (counters as any).reveal_already_recorded = revealAlreadyRecorded;

  // ---------- Stage 3: Auto-promote (post-reveal) → contacts + BCR ----------
  if (policy.auto_promote_after_valid_reveal) {
    const { data: postReveal } = await admin
      .from("lead_quality_profiles")
      .select("id, apollo_lead_id, lifecycle_stage, campaign_fit, fit_confidence, promoted_contact_id, risk_flags")
      .eq("lifecycle_stage", "safe_to_promote_after_reveal")
      .is("promoted_contact_id", null)
      .limit(500);

    const ids = (postReveal ?? []).map(p => p.apollo_lead_id);
    const { data: leads } = ids.length
      ? await admin.from("apollo_raw_leads")
        .select("apollo_lead_id, email, first_name, last_name, title, company, country, linkedin_url, apollo_person_id, apollo_org_id, business_name, campaign_fit")
        .in("apollo_lead_id", ids)
      : { data: [] as any[] };
    const leadMap = new Map((leads ?? []).map(l => [l.apollo_lead_id, l]));

    for (const p of postReveal ?? []) {
      const lead = leadMap.get(p.apollo_lead_id);
      const email = (lead?.email ?? "").toLowerCase();
      if (!email) { counters.promote_skipped++; sampleSkips.push({ stage: "promote", reason: "no_email" }); continue; }
      if (policy.auto_promote_only_campaign_fit && p.campaign_fit === "poor") { counters.promote_skipped++; continue; }

      const flags: string[] = p.risk_flags ?? [];
      if (flags.includes("bounced") || flags.includes("suppressed") || flags.includes("internal")) {
        counters.promote_skipped++; sampleSkips.push({ stage: "promote", reason: "suppression_flag" }); continue;
      }

      const { data: existing } = await admin.from("contacts").select("id").eq("email", email).maybeSingle();
      if (existing) { counters.promote_skipped++; continue; }

      counters.promote_planned++;
      if (dryRun) continue;

      const { data: inserted, error: insErr } = await admin.from("contacts").insert({
        email,
        first_name: lead.first_name, last_name: lead.last_name,
        name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "",
        role: lead.title ?? "", company: lead.company ?? "",
        country: lead.country ?? null, linkedin_url: lead.linkedin_url ?? null,
        apollo_person_id: lead.apollo_person_id ?? null,
        apollo_organization_id: lead.apollo_org_id ?? null,
        assigned_business: businessName,
        status: "ACTIVE", sendable_status: "sendable",
        source: "autopilot_promotion",
        tags: lead.campaign_fit ? [lead.campaign_fit] : [],
      }).select("id").single();
      if (insErr || !inserted) { counters.promote_skipped++; continue; }
      const contactId = inserted.id as string;

      // Central CRM spine: BCR row (preserves business_id link)
      await admin.from("business_contact_relationships").insert({
        contact_id: contactId,
        business_id: businessId, business_name: businessName,
        qualification: "qualified", campaign_eligible: true,
        current_stage: "ready_to_stage",
        qualification_reason: `autopilot_promotion run=${runId}`,
      });

      await admin.from("lead_quality_profiles").update({
        quality_status: "promoted_to_contact",
        promoted_contact_id: contactId, promoted_at: new Date().toISOString(),
        lifecycle_stage: "promoted_to_contact",
      }).eq("id", p.id);
      await admin.from("apollo_leads").update({ contact_id: contactId }).eq("id", p.apollo_lead_id);

      await event("promoted",
        `Promoted ${email} to contacts + BCR`, "low",
        { contact_id: contactId, candidate_id: p.id, apollo_person_id: lead.apollo_person_id });
    }
  }

  // ---------- Stage 4: Auto-queue Step 1 ----------
  if (policy.auto_queue_after_promotion && policy.auto_queue_campaign_id) {
    const { data: bcrs } = await admin.from("business_contact_relationships")
      .select("contact_id, qualification, do_not_contact, current_stage")
      .eq("business_id", businessId)
      .eq("campaign_eligible", true)
      .eq("do_not_contact", false)
      .limit(1000);
    const eligibleContactIds = (bcrs ?? []).map(b => b.contact_id);

    const { data: promoted } = eligibleContactIds.length
      ? await admin.from("contacts")
        .select("id, email, sendable_status, status, active_campaign_id")
        .in("id", eligibleContactIds)
        .eq("sendable_status", "sendable").eq("status", "ACTIVE")
        .is("active_campaign_id", null)
      : { data: [] as any[] };

    const domainCount = new Map<string, number>();
    for (const c of promoted ?? []) {
      const domain = (c.email ?? "").split("@")[1]?.toLowerCase() ?? "";
      const cnt = domainCount.get(domain) ?? 0;
      if (cnt >= policy.auto_queue_domain_cap) { counters.queue_skipped++; continue; }

      const { data: existing } = await admin.from("email_queue")
        .select("id").eq("contact_id", c.id).in("status", ["pending", "sent"]).limit(1);
      if (existing && existing.length) { counters.queue_skipped++; continue; }

      counters.queue_planned++;
      domainCount.set(domain, cnt + 1);

      if (dryRun) continue;

      const { data: inboxId } = await admin.rpc("assign_inbox_for_contact", { _contact_id: c.id });
      if (!inboxId) { counters.queue_skipped++; continue; }
      const sched = new Date(); sched.setUTCHours(9, 0, 0, 0);
      const { error: qErr } = await admin.from("email_queue").insert({
        contact_id: c.id, campaign_id: policy.auto_queue_campaign_id,
        sequence_step: policy.auto_queue_step,
        scheduled_at: sched.toISOString(), status: "pending",
        inbox_id: inboxId as string, business_name: businessName,
      });
      if (!qErr) {
        await admin.from("contacts").update({ active_campaign_id: policy.auto_queue_campaign_id }).eq("id", c.id);
        await event("queued", `Queued step 1 for ${c.email}`, "low", { contact_id: c.id });
      }
    }
  }

  // ---------- Stage 5: Send (gated) ----------
  // Worker runs separately. Orchestrator only records policy state and would_send count.
  counters.would_send = 0;
  if (!policy.auto_send_after_queue) {
    await event("send_skipped",
      `Auto-send disabled (provider=${policy.sending_provider_mode}); founder must enable`,
      "low");
  }

  // ---------- Founder decisions (ambiguous/high-risk leads) ----------
  // Reveal candidates whose score is exactly at the threshold or whose risk flags include 'catch_all'
  // would be queued for founder review. (Currently no such candidates flagged in upstream data.)
  // Hook left as-is; integrate when post-reveal classification adds the markers.

  // ---------- Close run ----------
  await admin.from("autopilot_runs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    scanned_count: counters.candidates_pulled,
    safe_to_unlock: counters.reveal_planned,
    safe_to_promote: counters.promote_planned,
    safe_to_queue: counters.queue_planned,
    decisions_created: counters.decisions_created,
    next_recommended_action: (() => {
      if (!dryRun) {
        if (blockedReason === "founder_reveal_amount_required")
          return "Enter reveal amount and review selected candidates.";
        return policy.auto_send_after_queue
          ? "Monitor send worker and reply rates"
          : "Configure external sending provider before enabling auto-send";
      }
      if (counters.candidates_pulled === 0) return "No reveal candidates — pull fresh Apollo if needed";
      if (counters.passed_quality_policy === 0 && counters.skipped_missing_score > 0)
        return "Repair candidate scoring / quality profile linkage";
      if (counters.passed_quality_policy === 0)
        return "Review dry-run skip reasons — no candidates passed quality policy";
      if (founderAmount === null)
        return "Enter reveal amount and review selected candidates.";
      return `Click "Approve & reveal selected candidates" to spend ~${counters.would_spend_credits} Apollo credits on ${counters.selected_for_next_reveal} selected. Auto-send remains OFF.`;
    })(),
    details: {
      dry_run: dryRun, actor, actor_user_id: actorUserId,
      counters,
      sample_skips: sampleSkips.slice(0, 50),
      blocked_reason: blockedReason,
      selected_candidates: selectedCandidates,
      eligible_not_selected: eligibleNotSelected.slice(0, 100),
      duplicates_held_back: duplicatesHeldBack.slice(0, 100),
      policy_snapshot: {
        apollo_email_reveal_autonomous: policy.apollo_email_reveal_autonomous,
        auto_promote_after_valid_reveal: policy.auto_promote_after_valid_reveal,
        auto_queue_after_promotion: policy.auto_queue_after_promotion,
        auto_send_after_queue: policy.auto_send_after_queue,
        sending_provider_mode: policy.sending_provider_mode,
        apollo_reveal_daily_credit_budget: policy.apollo_reveal_daily_credit_budget,
        apollo_reveal_monthly_credit_budget: policy.apollo_reveal_monthly_credit_budget,
        apollo_reveal_min_quality_score: policy.apollo_reveal_min_quality_score,
        apollo_reveal_max_domain_frequency: policy.apollo_reveal_max_domain_frequency,
        auto_queue_campaign_id: policy.auto_queue_campaign_id,
        auto_queue_domain_cap: policy.auto_queue_domain_cap,
      },
    } as never,
  }).eq("id", runId);

  await event("run_end", `Autopilot ${dryRun ? "dry-run" : "live"} complete`, "low", { counters });

  return json({
    ok: true, run_id: runId, business_id: businessId, business_name: businessName,
    dry_run: dryRun,
    blocked_reason: blockedReason,
    policy: {
      reveal_autonomous: policy.apollo_email_reveal_autonomous,
      auto_promote: policy.auto_promote_after_valid_reveal,
      auto_queue: policy.auto_queue_after_promotion,
      auto_send: policy.auto_send_after_queue,
      provider_mode: policy.sending_provider_mode,
      daily_budget: policy.apollo_reveal_daily_credit_budget,
      monthly_budget: policy.apollo_reveal_monthly_credit_budget,
      min_score: policy.apollo_reveal_min_quality_score,
      founder_reveal_amount_next_run: policy.founder_reveal_amount_next_run ?? null,
    },
    counters,
    selected_candidates: selectedCandidates,
    eligible_not_selected: eligibleNotSelected.slice(0, 100),
    duplicates_held_back: duplicatesHeldBack.slice(0, 100),
    sample_skips: sampleSkips.slice(0, 20),
  });
});