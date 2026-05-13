import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Autopilot orchestrator — policy-controlled Apollo → reveal → promote → queue → send pipeline.
 * Default dry_run = true. No Apollo credits spent unless dry_run=false AND policy enables reveal.
 * Hard guardrails (suppression, duplicates, CRM-new, domain caps) are enforced before any action.
 */

type PlanCounters = {
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
  blocked_by_policy: number;
  decisions_needed: number;
  credits_used_today: number;
  credits_used_month: number;
  credits_remaining_today: number;
  credits_remaining_month: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  const isCron = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");

  // Auth: founder OR cron
  let actor = "system";
  if (!isCron) {
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const tmpAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: role } = await tmpAdmin.from("user_roles")
      .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
    if (!role) return json({ error: "Founder role required" }, 403);
    actor = "founder";
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: { business_name?: string; dry_run?: boolean } = {};
  try { body = await req.json(); } catch {}
  const businessName = body.business_name ?? "Neon Candy";
  const dryRun = body.dry_run !== false;

  // Resolve business
  const { data: biz } = await admin.from("businesses").select("id,name").eq("name", businessName).maybeSingle();
  if (!biz) return json({ error: `business not found: ${businessName}` }, 404);

  // Load policy
  const { data: policy } = await admin.from("business_autopilot_settings")
    .select("*").eq("business_id", biz.id).maybeSingle();
  if (!policy) return json({ error: "No autopilot policy for business" }, 404);

  const runId = crypto.randomUUID();
  const counters: PlanCounters = {
    candidates_pulled: 0, passed_quality_policy: 0,
    reveal_eligible: 0, reveal_planned: 0,
    reveal_skipped_budget: 0, reveal_skipped_domain_cap: 0, reveal_skipped_excluded: 0,
    promote_planned: 0, promote_skipped: 0,
    queue_planned: 0, queue_skipped: 0,
    blocked_by_policy: 0, decisions_needed: 0,
    credits_used_today: 0, credits_used_month: 0,
    credits_remaining_today: 0, credits_remaining_month: 0,
  };

  await admin.from("autopilot_run_log").insert({
    business_name: businessName, run_id: runId, stage: "run_start",
    actor, outcome: dryRun ? "planning" : "executing",
    metadata: { policy_id: policy.id, dry_run: dryRun },
  });

  // ---------- Credit budget ----------
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(today); monthStart.setUTCDate(1);
  const { data: ledger } = await admin.from("apollo_credit_ledger")
    .select("credits_used,created_at")
    .eq("business_name", businessName)
    .gte("created_at", monthStart.toISOString());
  const usedMonth = (ledger ?? []).reduce((s, r) => s + (r.credits_used ?? 0), 0);
  const usedToday = (ledger ?? []).filter(r => new Date(r.created_at) >= today)
    .reduce((s, r) => s + (r.credits_used ?? 0), 0);
  counters.credits_used_today = usedToday;
  counters.credits_used_month = usedMonth;
  counters.credits_remaining_today = Math.max(0, policy.apollo_reveal_daily_credit_budget - usedToday);
  counters.credits_remaining_month = Math.max(0, policy.apollo_reveal_monthly_credit_budget - usedMonth);

  // ---------- Stage 1: Quality-pass candidates ----------
  const { data: revealCandidates } = await admin
    .from("lead_quality_profiles")
    .select("id, apollo_lead_id, lifecycle_stage, fit_confidence, campaign_fit, risk_flags, dup_of_contact_id, needs_founder_review, founder_review_reason, notes")
    .eq("lifecycle_stage", "email_reveal_required")
    .limit(2000);

  counters.candidates_pulled = revealCandidates?.length ?? 0;

  // Hydrate apollo lead details
  const leadIds = (revealCandidates ?? []).map(c => c.apollo_lead_id);
  const { data: rawLeads } = leadIds.length
    ? await admin.from("apollo_raw_leads")
      .select("apollo_lead_id, apollo_person_id, email_domain, email, business_name, first_name, last_name, title, company, country, linkedin_url, apollo_org_id, campaign_fit")
      .in("apollo_lead_id", leadIds)
    : { data: [] as any[] };
  const leadByQp = new Map<string, any>();
  for (const r of rawLeads ?? []) leadByQp.set(r.apollo_lead_id, r);

  // CRM existing apollo_person_ids set
  const personIds = (rawLeads ?? []).map(r => r.apollo_person_id).filter(Boolean);
  const { data: crmHits } = personIds.length
    ? await admin.from("contacts").select("apollo_person_id").in("apollo_person_id", personIds)
    : { data: [] as any[] };
  const crmPersonSet = new Set((crmHits ?? []).map(c => c.apollo_person_id));

  // Score & filter
  const eligible: Array<{ qp: any; lead: any; score: number; domain: string }> = [];
  const skips: any[] = [];

  for (const qp of revealCandidates ?? []) {
    const lead = leadByQp.get(qp.apollo_lead_id);
    if (!lead) { skips.push({ qp, reason: "no_lead_record" }); continue; }

    // Exclusions
    if (policy.apollo_reveal_exclude_existing_crm && lead.apollo_person_id && crmPersonSet.has(lead.apollo_person_id)) {
      counters.reveal_skipped_excluded++;
      skips.push({ qp, lead, reason: "already_in_crm" });
      continue;
    }
    if (policy.apollo_reveal_exclude_duplicates && qp.dup_of_contact_id) {
      counters.reveal_skipped_excluded++;
      skips.push({ qp, lead, reason: "duplicate" });
      continue;
    }
    if (policy.apollo_reveal_exclude_poor_fit && qp.campaign_fit === "poor") {
      counters.reveal_skipped_excluded++;
      skips.push({ qp, lead, reason: "poor_fit" });
      continue;
    }
    if (policy.apollo_reveal_exclude_legacy_hold && qp.lifecycle_stage === "legacy_needs_verification_hold") {
      counters.reveal_skipped_excluded++;
      skips.push({ qp, lead, reason: "legacy_hold" });
      continue;
    }
    const flags = qp.risk_flags ?? [];
    if (flags.includes("bounced") || flags.includes("suppressed") || flags.includes("internal")) {
      counters.reveal_skipped_excluded++;
      skips.push({ qp, lead, reason: "bounced_or_suppressed" });
      continue;
    }

    // Score: fit_confidence (0-1) → 0-10
    const score = Math.round(((qp.fit_confidence ?? 0) * 10) * 10) / 10;
    if (score < policy.apollo_reveal_min_quality_score) {
      counters.reveal_skipped_excluded++;
      skips.push({ qp, lead, reason: `score_${score}_below_${policy.apollo_reveal_min_quality_score}` });
      continue;
    }

    counters.passed_quality_policy++;
    eligible.push({
      qp, lead, score,
      domain: (lead.email_domain ?? "").toLowerCase(),
    });
  }

  // Sort by score desc, then apply domain cap
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

  // Apply credit budget
  const budgetCap = Math.min(counters.credits_remaining_today, counters.credits_remaining_month);
  const finalReveal = planReveal.slice(0, budgetCap);
  counters.reveal_planned = finalReveal.length;
  counters.reveal_skipped_budget = planReveal.length - finalReveal.length;

  // Log per-candidate plan rows (sampled)
  for (const e of finalReveal.slice(0, 50)) {
    await admin.from("autopilot_run_log").insert({
      business_name: businessName, run_id: runId, stage: "reveal", actor,
      candidate_id: e.qp.id, apollo_person_id: e.lead.apollo_person_id ?? null,
      outcome: dryRun ? "planned" : "queued_for_reveal",
      reason: `score=${e.score} domain=${e.domain}`,
      metadata: { title: e.lead.title, company: e.lead.company },
    });
  }

  // ---------- Stage 2: Reveal execution (only when not dry-run + autonomous reveal enabled) ----------
  if (!dryRun && policy.apollo_email_reveal_autonomous && finalReveal.length > 0) {
    // Delegate to existing apollo-unlock-selected which handles the actual API + credit accounting.
    // We invoke via internal HTTP with the service role for cron path.
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
        business_name: businessName, function_source: "reveal",
        credits_used: credits,
        apollo_person_ids: finalReveal.map(e => e.lead.apollo_person_id).filter(Boolean),
        metadata: { run_id: runId, response: out },
      });
    } catch (err) {
      await admin.from("autopilot_run_log").insert({
        business_name: businessName, run_id: runId, stage: "block", actor,
        outcome: "reveal_call_failed", reason: (err as Error).message,
      });
    }
  }

  // ---------- Stage 3: Auto-promote (post-reveal classified rows) ----------
  if (policy.auto_promote_after_valid_reveal) {
    const { data: postReveal } = await admin
      .from("lead_quality_profiles")
      .select("id, apollo_lead_id, lifecycle_stage, campaign_fit, fit_confidence, promoted_contact_id")
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

    const toInsert: any[] = [];
    const linkBack: Array<{ qp_id: string; apollo_lead_id: string; email: string }> = [];

    for (const p of postReveal ?? []) {
      const lead = leadMap.get(p.apollo_lead_id);
      const email = (lead?.email ?? "").toLowerCase();
      if (!email) { counters.promote_skipped++; continue; }
      if (policy.auto_promote_only_campaign_fit && p.campaign_fit === "poor") { counters.promote_skipped++; continue; }

      const { data: existing } = await admin.from("contacts").select("id").eq("email", email).maybeSingle();
      if (existing) { counters.promote_skipped++; continue; }

      counters.promote_planned++;
      if (!dryRun) {
        toInsert.push({
          email,
          first_name: lead.first_name, last_name: lead.last_name,
          name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "",
          role: lead.title ?? "", company: lead.company ?? "",
          country: lead.country ?? null, linkedin_url: lead.linkedin_url ?? null,
          apollo_person_id: lead.apollo_person_id ?? null,
          apollo_organization_id: lead.apollo_org_id ?? null,
          assigned_business: lead.business_name ?? businessName,
          status: "ACTIVE", sendable_status: "sendable",
          source: "autopilot_promotion",
          tags: lead.campaign_fit ? [lead.campaign_fit] : [],
        });
        linkBack.push({ qp_id: p.id, apollo_lead_id: p.apollo_lead_id, email });
      }
    }

    if (!dryRun && toInsert.length) {
      const { data: inserted, error: insErr } = await admin.from("contacts").insert(toInsert).select("id,email");
      if (!insErr && inserted) {
        const map = new Map(inserted.map(c => [(c.email ?? "").toLowerCase(), c.id]));
        for (const lb of linkBack) {
          const cid = map.get(lb.email);
          if (!cid) continue;
          await admin.from("lead_quality_profiles").update({
            quality_status: "promoted_to_contact",
            promoted_contact_id: cid, promoted_at: new Date().toISOString(),
            lifecycle_stage: "promoted_to_contact",
          }).eq("id", lb.qp_id);
          await admin.from("apollo_leads").update({ contact_id: cid }).eq("id", lb.apollo_lead_id);
          await admin.from("autopilot_run_log").insert({
            business_name: businessName, run_id: runId, stage: "promote", actor,
            candidate_id: lb.qp_id, contact_id: cid,
            outcome: "promoted", reason: "valid email + crm-new + campaign-fit",
          });
        }
      }
    }
  }

  // ---------- Stage 4: Auto-queue Step 1 ----------
  if (policy.auto_queue_after_promotion && policy.auto_queue_campaign_id) {
    const { data: promoted } = await admin.from("contacts")
      .select("id, email, assigned_business, sendable_status, status, active_campaign_id")
      .eq("assigned_business", businessName)
      .eq("sendable_status", "sendable")
      .eq("status", "ACTIVE")
      .is("active_campaign_id", null)
      .eq("source", "autopilot_promotion")
      .limit(500);

    const domainCount = new Map<string, number>();
    for (const c of promoted ?? []) {
      const domain = (c.email ?? "").split("@")[1]?.toLowerCase() ?? "";
      const cnt = domainCount.get(domain) ?? 0;
      if (cnt >= policy.auto_queue_domain_cap) { counters.queue_skipped++; continue; }

      // duplicate-pending guard
      const { data: existing } = await admin.from("email_queue")
        .select("id").eq("contact_id", c.id).in("status", ["pending", "sent"]).limit(1);
      if (existing && existing.length) { counters.queue_skipped++; continue; }

      counters.queue_planned++;
      domainCount.set(domain, cnt + 1);

      if (!dryRun) {
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
          await admin.from("autopilot_run_log").insert({
            business_name: businessName, run_id: runId, stage: "queue", actor,
            contact_id: c.id, outcome: "queued_step_1",
            reason: "auto-queue policy",
          });
        }
      }
    }
  }

  // ---------- Stage 5: Send ----------
  // auto_send_after_queue gates whether outreach-send-worker is allowed to scale.
  // The worker itself runs on its own schedule; orchestrator does NOT call it.
  // If disabled, we simply log the policy decision.
  if (!policy.auto_send_after_queue) {
    await admin.from("autopilot_run_log").insert({
      business_name: businessName, run_id: runId, stage: "send", actor,
      outcome: "skipped_auto_send_disabled",
      reason: `provider_mode=${policy.sending_provider_mode}; founder must enable scaled sending`,
    });
  }

  // ---------- Run end ----------
  await admin.from("autopilot_run_log").insert({
    business_name: businessName, run_id: runId, stage: "run_end", actor,
    outcome: dryRun ? "planned" : "executed",
    metadata: { counters },
  });

  return json({
    ok: true, run_id: runId, business_name: businessName, dry_run: dryRun,
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
    sample_skips: skips.slice(0, 20).map(s => ({ reason: s.reason, candidate_id: s.qp?.id })),
  });
});