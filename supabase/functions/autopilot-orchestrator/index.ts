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
};

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

  let body: { business_name?: string; business_id?: string; dry_run?: boolean } = {};
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
  };

  const sampleSkips: Array<{ stage: string; reason: string; candidate_id?: string }> = [];

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

  const eligible: Array<{ qp: any; lead: any; score: number; domain: string }> = [];

  for (const qp of revealCandidates ?? []) {
    const lead = leadByQp.get(qp.apollo_lead_id);
    if (!lead) { sampleSkips.push({ stage: "reveal", reason: "no_lead_record", candidate_id: qp.id }); continue; }

    if (policy.apollo_reveal_exclude_existing_crm && lead.apollo_person_id && crmPersonSet.has(lead.apollo_person_id)) {
      counters.reveal_skipped_excluded++;
      sampleSkips.push({ stage: "reveal", reason: "already_in_crm", candidate_id: qp.id }); continue;
    }
    if (policy.apollo_reveal_exclude_duplicates && qp.dup_of_contact_id) {
      counters.reveal_skipped_excluded++;
      sampleSkips.push({ stage: "reveal", reason: "duplicate", candidate_id: qp.id }); continue;
    }
    if (policy.apollo_reveal_exclude_poor_fit && qp.campaign_fit === "poor") {
      counters.reveal_skipped_excluded++;
      sampleSkips.push({ stage: "reveal", reason: "poor_fit", candidate_id: qp.id }); continue;
    }
    if (policy.apollo_reveal_exclude_legacy_hold && qp.lifecycle_stage === "legacy_needs_verification_hold") {
      counters.reveal_skipped_excluded++;
      sampleSkips.push({ stage: "reveal", reason: "legacy_hold", candidate_id: qp.id }); continue;
    }
    const flags: string[] = qp.risk_flags ?? [];
    if (flags.includes("bounced") || flags.includes("suppressed") || flags.includes("internal")) {
      counters.reveal_skipped_excluded++;
      sampleSkips.push({ stage: "reveal", reason: "bounced_or_suppressed", candidate_id: qp.id }); continue;
    }

    const score = Math.round(((qp.fit_confidence ?? 0) * 10) * 10) / 10;
    if (score < policy.apollo_reveal_min_quality_score) {
      counters.reveal_skipped_excluded++;
      sampleSkips.push({ stage: "reveal", reason: `score_${score}_below_${policy.apollo_reveal_min_quality_score}`, candidate_id: qp.id });
      continue;
    }

    counters.passed_quality_policy++;
    eligible.push({ qp, lead, score, domain: (lead.email_domain ?? "").toLowerCase() });
  }

  eligible.sort((a, b) => b.score - a.score);
  const domainSeen = new Map<string, number>();
  const planReveal: typeof eligible = [];
  for (const e of eligible) {
    const cap = policy.apollo_reveal_max_domain_frequency;
    const cnt = domainSeen.get(e.domain) ?? 0;
    if (e.domain && cap > 0 && cnt >= cap) {
      counters.reveal_skipped_domain_cap++;
      continue;
    }
    domainSeen.set(e.domain, cnt + 1);
    planReveal.push(e);
  }
  counters.reveal_eligible = planReveal.length;

  const budgetCap = Math.min(counters.credits_remaining_today, counters.credits_remaining_month);
  const finalReveal = planReveal.slice(0, budgetCap);
  counters.reveal_planned = finalReveal.length;
  counters.reveal_skipped_budget = planReveal.length - finalReveal.length;
  counters.estimated_credits_this_run = finalReveal.length;

  await event("reveal_plan",
    `Reveal plan: ${finalReveal.length} of ${planReveal.length} eligible (budget cap ${budgetCap})`,
    "low",
    { counters: { reveal_planned: finalReveal.length, reveal_eligible: planReveal.length, budget_cap: budgetCap } });

  // ---------- Stage 2: Reveal execution (only when not dry-run + autonomous reveal) ----------
  if (!dryRun && policy.apollo_email_reveal_autonomous && finalReveal.length > 0) {
    const candidateIds = finalReveal.map(e => e.qp.apollo_lead_id);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/apollo-unlock-selected`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY,
          "x-autopilot-run-id": runId,
        },
        body: JSON.stringify({ apollo_lead_ids: candidateIds, autopilot: true }),
      });
      const out = await resp.json().catch(() => ({}));
      const credits = out?.enrichment_credits_used ?? finalReveal.length;
      await admin.from("apollo_credit_ledger").insert({
        business_id: businessId, business_name: businessName,
        function_source: "reveal", credits_used: credits,
        apollo_person_ids: finalReveal.map(e => e.lead.apollo_person_id).filter(Boolean),
        metadata: { run_id: runId, response: out } as never,
      });
      await event("reveal_executed", `Reveal call returned for ${candidateIds.length} candidates`, "medium",
        { credits, response_status: resp.status });
    } catch (err) {
      await event("reveal_failed", (err as Error).message, "high");
    }
  }

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
    next_recommended_action: dryRun
      ? `Review dry-run: would reveal ${counters.reveal_planned}, promote ${counters.promote_planned}, queue ${counters.queue_planned}. Enable live policy after review.`
      : (policy.auto_send_after_queue ? "Monitor send worker and reply rates" : "Configure external sending provider before enabling auto-send"),
    details: {
      dry_run: dryRun, actor, actor_user_id: actorUserId,
      counters, sample_skips: sampleSkips.slice(0, 50),
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
    policy: {
      reveal_autonomous: policy.apollo_email_reveal_autonomous,
      auto_promote: policy.auto_promote_after_valid_reveal,
      auto_queue: policy.auto_queue_after_promotion,
      auto_send: policy.auto_send_after_queue,
      provider_mode: policy.sending_provider_mode,
      daily_budget: policy.apollo_reveal_daily_credit_budget,
      monthly_budget: policy.apollo_reveal_monthly_credit_budget,
      min_score: policy.apollo_reveal_min_quality_score,
    },
    counters,
    sample_skips: sampleSkips.slice(0, 20),
  });
});