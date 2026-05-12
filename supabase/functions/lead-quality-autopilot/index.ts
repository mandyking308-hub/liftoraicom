import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NEON_BUSINESS_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

/**
 * Lead Quality Autopilot — runs all cheap deterministic steps under founder rules.
 * NO AI, NO Apollo credits, NO unlock, NO promotion, NO enqueue, NO sends.
 *
 * Triggers: "after_apollo_import", "daily_cron", "manual_founder", "post_lifecycle_change"
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: { trigger?: string; business_id?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const trigger = body.trigger ?? "manual_founder";
  const businessId = body.business_id ?? NEON_BUSINESS_ID;

  // Load settings (with safe defaults if row missing).
  const { data: settings } = await admin
    .from("business_autopilot_settings").select("*").eq("business_id", businessId).maybeSingle();
  const s = settings ?? {
    auto_scan_imported_leads: true, auto_dedupe_apollo_leads: true,
    auto_crm_cross_check: true, auto_lifecycle_classify: true,
    auto_archive_duplicates: true, auto_archive_poor_fit: true,
    auto_hold_missing_email_old_pool: true, auto_build_unlock_shortlist: true,
    auto_promote_verified_qualified_leads: false, auto_enqueue_contacts: false,
    auto_unlock_apollo_emails: false, auto_send_live_batches: false,
    ai_classification_allowed: false,
    max_apollo_unlock_credits_without_founder_approval: 0,
    stale_needs_verification_days: 14,
  };

  const { data: run, error: runErr } = await admin.from("autopilot_runs").insert({
    business_id: businessId, trigger, status: "running",
  }).select("id").single();
  if (runErr) return json({ error: runErr.message }, 500);
  const runId = run.id;

  const details: Record<string, unknown> = { steps: [] as any[], settings_applied: s };
  const counters = {
    scanned_count: 0, duplicates_collapsed: 0, poor_fit_archived: 0,
    missing_email_held: 0, already_in_crm_matched: 0,
    no_email_attempts_excluded: 0, safe_to_unlock: 0, safe_to_promote: 0,
    safe_to_queue: 0, decisions_created: 0,
    verified_email_available_locked: 0, unlock_required: 0,
  };
  const decisionsToCreate: any[] = [];

  // STEP 0 — Backfill lead_quality_profiles for any apollo_leads without one.
  // This is critical: nothing else creates them. New imports from
  // apollo-pull-verified / apollo-sync-search land only in apollo_leads.
  {
    const { data: orphanLeads } = await admin
      .from("apollo_leads")
      .select("id,email,has_email_flag,enrichment_payload,search_payload")
      .eq("business_name", "Neon Candy")
      .limit(5000);
    const ids = (orphanLeads ?? []).map((r) => r.id);
    let backfilled = 0;
    if (ids.length) {
      // Fetch the full set of apollo_lead_ids that already have profiles in
      // chunks so we never run into URL-length limits on the `.in()` filter.
      const have = new Set<string>();
      let from = 0;
      const PAGE = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await admin
          .from("lead_quality_profiles")
          .select("apollo_lead_id")
          .not("apollo_lead_id", "is", null)
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data) if ((r as any).apollo_lead_id) have.add((r as any).apollo_lead_id);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const toInsert = (orphanLeads ?? []).filter((r) => !have.has(r.id)).map((r) => {
        const ep: any = r.enrichment_payload ?? r.search_payload ?? {};
        const email = (r.email ?? ep?.email ?? "").toString().trim();
        const apolloEmailStatus = ep?.email_status ?? null;
        const hasEmailFlag = !!(ep?.has_email_flag ?? (r as any)?.has_email_flag);
        const hasEmail = !!email;
        // Apollo people_search returns has_email_flag=true with no email value;
        // these are verified-email-available BUT locked behind unlock credits.
        const verifiedLocked = !hasEmail && hasEmailFlag;
        return {
          apollo_lead_id: r.id,
          quality_status: hasEmail ? "raw" : "needs_verification",
          risk_flags: hasEmail
            ? []
            : (verifiedLocked
                ? ["verified_email_locked", "needs_apollo_unlock"]
                : ["missing_email", apolloEmailStatus ? `apollo_email_${apolloEmailStatus}` : null].filter(Boolean) as string[]),
        };
      });
      if (toInsert.length) {
        // Insert in chunks to avoid payload limits.
        for (let i = 0; i < toInsert.length; i += 200) {
          const chunk = toInsert.slice(i, i + 200);
          const { error } = await admin.from("lead_quality_profiles").insert(chunk as any);
          if (!error) backfilled += chunk.length;
        }
      }
    }
    (details.steps as any[]).push({ step: "backfill_profiles", backfilled, total_leads_seen: ids.length });
  }

  // STEP 1 — Cheap quality scan over raw rows (apply mode, no AI).
  if (s.auto_scan_imported_leads) {
    // Pull all raw/reviewed rows + their context for a deterministic CRM /
    // dedupe / bounce / suppression / queue check (no AI, no Apollo calls).
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const { data: rawRows } = await admin
      .from("apollo_raw_leads")
      .select("apollo_lead_id,quality_profile_id,email,email_domain,title,apollo_person_id,risk_flags,quality_status")
      .in("quality_status", ["raw","reviewed"] as any).limit(5000);
    counters.scanned_count = rawRows?.length ?? 0;

    const emails = Array.from(new Set((rawRows ?? []).map((r) => (r.email ?? "").toLowerCase()).filter(Boolean)));
    const personIds = Array.from(new Set((rawRows ?? []).map((r) => r.apollo_person_id).filter(Boolean)));

    const { data: contactsByEmail } = await admin.from("contacts")
      .select("id,email,status,sendable_status,hard_bounced,is_globally_suppressed,apollo_person_id")
      .in("email", emails.length ? emails : ["__none__"]);
    const contactByEmail = new Map<string, any>();
    const contactByPerson = new Map<string, any>();
    for (const c of contactsByEmail ?? []) {
      contactByEmail.set((c.email ?? "").toLowerCase(), c);
      if (c.apollo_person_id) contactByPerson.set(c.apollo_person_id, c);
    }
    if (personIds.length) {
      const { data: extraByPerson } = await admin.from("contacts")
        .select("id,email,status,apollo_person_id").in("apollo_person_id", personIds);
      for (const c of extraByPerson ?? []) if (c.apollo_person_id) contactByPerson.set(c.apollo_person_id, c);
    }

    const { data: events } = await admin.from("email_events")
      .select("recipient_email,event_type")
      .in("recipient_email", emails.length ? emails : ["__none__"]);
    const emailEvents = new Map<string, Set<string>>();
    for (const e of events ?? []) {
      const k = (e.recipient_email ?? "").toLowerCase();
      if (!emailEvents.has(k)) emailEvents.set(k, new Set());
      emailEvents.get(k)!.add(String(e.event_type));
    }

    const contactIds = (contactsByEmail ?? []).map((c) => c.id);
    const { data: queueRows } = await admin.from("email_queue")
      .select("contact_id,status,delivery_kind")
      .in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]);
    const queueByContact = new Map<string, any[]>();
    for (const q of queueRows ?? []) {
      if (!queueByContact.has(q.contact_id)) queueByContact.set(q.contact_id, []);
      queueByContact.get(q.contact_id)!.push(q);
    }

    const domainCounts = new Map<string, number>();
    for (const r of rawRows ?? []) {
      const d = r.email_domain;
      if (d) domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
    }

    let scanned = 0;
    for (const r of rawRows ?? []) {
      const flags = new Set<string>(r.risk_flags ?? []);
      const email = (r.email ?? "").toLowerCase();
      const hasEmail = !!email;
      const validEmail = hasEmail && EMAIL_RE.test(email);
      if (!hasEmail) flags.add("missing_email");
      else if (!validEmail) flags.add("invalid_email");
      if (!r.title) flags.add("missing_title");

      const c = email ? contactByEmail.get(email) : null;
      const cByPerson = r.apollo_person_id ? contactByPerson.get(r.apollo_person_id) : null;
      let dupContact: string | null = null;
      if (c) { flags.add("duplicate_email"); dupContact = c.id; }
      if (cByPerson && cByPerson.id !== c?.id) { flags.add("duplicate_person_id"); dupContact ??= cByPerson.id; }

      const evts = emailEvents.get(email) ?? new Set<string>();
      if (evts.has("bounced") || c?.hard_bounced) flags.add("bounced");
      if (evts.has("unsubscribed") || c?.is_globally_suppressed || c?.sendable_status === "suppressed") flags.add("suppressed");
      if (String(c?.status ?? "").toUpperCase() === "DO_NOT_CONTACT") flags.add("suppressed");
      const cQueue = c ? (queueByContact.get(c.id) ?? []) : [];
      if (cQueue.some((q) => q.status === "sent" && q.delivery_kind === "smtp_real")) flags.add("already_sent");
      if (cQueue.some((q) => q.status === "pending")) flags.add("already_queued");
      if (c && cQueue.length > 0) flags.add("already_contacted");
      const dom = r.email_domain;
      if (dom && (domainCounts.get(dom) ?? 0) > 5) flags.add("duplicate_domain");

      let next = "reviewed";
      let reviewReason: string | null = null;
      if (flags.has("bounced")) next = "bounced";
      else if (flags.has("suppressed")) next = "suppressed";
      else if (flags.has("already_sent") || flags.has("already_queued") || flags.has("already_contacted")) next = "already_contacted";
      else if (flags.has("invalid_email") || flags.has("duplicate_email") || flags.has("duplicate_person_id")) {
        next = "rejected"; reviewReason = "duplicate of existing CRM contact";
      } else if (flags.has("missing_email")) {
        next = "needs_verification"; reviewReason = "no email present";
      }

      await admin.from("lead_quality_profiles").update({
        quality_status: next,
        risk_flags: Array.from(flags),
        needs_founder_review: false,
        founder_review_reason: reviewReason,
        dup_of_contact_id: dupContact,
        scanned_at: new Date().toISOString(),
      }).eq("id", (r as any).quality_profile_id);
      scanned++;
    }
    (details.steps as any[]).push({ step: "cheap_scan_full", scanned });
  }

  // STEP 2 — Dedupe + lifecycle classify (apply policy across full table).
  if (s.auto_dedupe_apollo_leads || s.auto_lifecycle_classify ||
      s.auto_archive_duplicates || s.auto_archive_poor_fit ||
      s.auto_hold_missing_email_old_pool || s.auto_crm_cross_check) {
    const { data: before } = await admin.from("lead_lifecycle_summary").select("*").maybeSingle();
    // Run the same deterministic SQL block as the lifecycle policy.
    // Keeps anything already classified; only fills nulls + reclassifies the
    // recoverable buckets (no destructive moves out of promoted/already_in_crm).
    const sqlSteps: Array<{ label: string; q: string }> = [
      { label: "promoted", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='promoted_to_contact', lifecycle_reason='already promoted to central CRM', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND quality_status='promoted_to_contact' AND (unlock_recommendation IS NULL OR unlock_recommendation<>'already_in_crm_after_unlock')` },
      { label: "already_in_crm", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='already_in_crm', lifecycle_reason='apollo unlock matched existing CRM contact', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND unlock_recommendation='already_in_crm_after_unlock'` },
      { label: "attempted_no_email", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='attempted_no_email', lifecycle_reason='apollo returned 200 OK with no email', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND (unlock_recommendation='attempted_no_email' OR 'apollo_email_unavailable'=ANY(risk_flags))` },
      { label: "duplicate_collapsed", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='duplicate_collapsed', lifecycle_reason='collapsed against canonical apollo person', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND unlock_recommendation='duplicate_of_canonical'` },
      { label: "poor_fit", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='rejected_poor_fit', lifecycle_reason='campaign_fit=poor_fit; archived not_working', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND campaign_fit='poor_fit'` },
      { label: "high_fit_missing_email", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='legacy_needs_verification_hold', lifecycle_reason='old-pool missing-email lead held pending fresh verified-email Apollo search', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND quality_status='needs_verification' AND campaign_fit IN ('playlist_curator','dj','music_blog','radio','event_promoter','creator_influencer') AND 'missing_email'=ANY(risk_flags)` },
      { label: "missing_contact_archived", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='rejected_missing_contact_details', lifecycle_reason='no email and not high-fit; archived not_working', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL AND quality_status='needs_verification' AND 'missing_email'=ANY(risk_flags)` },
      { label: "founder_review_fallback", q: `UPDATE public.lead_quality_profiles SET lifecycle_stage='founder_review_required', lifecycle_reason='unclassified by lifecycle policy; founder to review', lifecycle_classified_at=now() WHERE lifecycle_stage IS NULL` },
    ];
    // We cannot run arbitrary SQL via SDK; use individual `update`s via PostgREST filters.
    // Re-implement the filter-able subset directly with the supabase client:
    const updates: Array<() => Promise<number>> = [
      async () => {
        const { data, error } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "promoted_to_contact", lifecycle_reason: "already promoted to central CRM", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("quality_status", "promoted_to_contact").select("id");
        return error ? 0 : (data?.length ?? 0);
      },
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "already_in_crm", lifecycle_reason: "apollo unlock matched existing CRM contact", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("unlock_recommendation", "already_in_crm_after_unlock").select("id");
        counters.already_in_crm_matched += data?.length ?? 0; return data?.length ?? 0;
      },
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "attempted_no_email", lifecycle_reason: "apollo returned 200 OK with no email", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("unlock_recommendation", "attempted_no_email").select("id");
        counters.no_email_attempts_excluded += data?.length ?? 0; return data?.length ?? 0;
      },
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "duplicate_collapsed", lifecycle_reason: "collapsed against canonical apollo person", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("unlock_recommendation", "duplicate_of_canonical").select("id");
        counters.duplicates_collapsed += data?.length ?? 0; return data?.length ?? 0;
      },
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "rejected_poor_fit", lifecycle_reason: "campaign_fit=poor_fit; archived not_working", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("campaign_fit", "poor_fit").select("id");
        counters.poor_fit_archived += data?.length ?? 0; return data?.length ?? 0;
      },
      // NEW: clean reviewed rows with email → verified_ready_for_review
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({
          lifecycle_stage: "verified_ready_for_review",
          lifecycle_reason: "verified-email lead passed CRM/dedupe/bounce/suppression checks",
          lifecycle_classified_at: new Date().toISOString(),
        }).is("lifecycle_stage", null).eq("quality_status", "reviewed").select("id");
        return data?.length ?? 0;
      },
      // NEW: rejected duplicate against existing CRM contact → already_in_crm
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({
          lifecycle_stage: "already_in_crm",
          lifecycle_reason: "matches an existing CRM contact (email or apollo_person_id)",
          lifecycle_classified_at: new Date().toISOString(),
        }).is("lifecycle_stage", null).eq("quality_status", "rejected")
          .not("dup_of_contact_id", "is", null).select("id");
        counters.already_in_crm_matched += data?.length ?? 0; return data?.length ?? 0;
      },
      // NEW: bounced / suppressed / already_contacted → archived_not_working
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({
          lifecycle_stage: "archived_not_working",
          lifecycle_reason: "bounced/suppressed/already-contacted",
          lifecycle_classified_at: new Date().toISOString(),
        }).is("lifecycle_stage", null).in("quality_status", ["bounced","suppressed","already_contacted"]).select("id");
        return data?.length ?? 0;
      },
      async () => {
        if (!s.auto_hold_missing_email_old_pool) return 0;
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "legacy_needs_verification_hold", lifecycle_reason: "old-pool missing-email lead held pending fresh verified-email Apollo search", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("quality_status", "needs_verification")
          .in("campaign_fit", ["playlist_curator","dj","music_blog","radio","event_promoter","creator_influencer"])
          .contains("risk_flags", ["missing_email"]).select("id");
        counters.missing_email_held += data?.length ?? 0; return data?.length ?? 0;
      },
      // NEW: verified email available but locked (Apollo says verified, no address revealed yet)
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({
          lifecycle_stage: "verified_email_available_locked",
          lifecycle_reason: "Apollo reports verified email available; actual address is locked behind unlock credits",
          lifecycle_classified_at: new Date().toISOString(),
        }).is("lifecycle_stage", null).eq("quality_status", "needs_verification")
          .contains("risk_flags", ["verified_email_locked"]).select("id");
        counters.verified_email_available_locked += data?.length ?? 0;
        counters.unlock_required += data?.length ?? 0;
        return data?.length ?? 0;
      },
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "rejected_missing_contact_details", lifecycle_reason: "no email and not high-fit; archived not_working", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).eq("quality_status", "needs_verification").contains("risk_flags", ["missing_email"]).select("id");
        return data?.length ?? 0;
      },
      async () => {
        const { data } = await admin.from("lead_quality_profiles").update({ lifecycle_stage: "founder_review_required", lifecycle_reason: "unclassified by lifecycle policy; founder to review", lifecycle_classified_at: new Date().toISOString() })
          .is("lifecycle_stage", null).select("id");
        return data?.length ?? 0;
      },
    ];
    const moved: Record<string, number> = {};
    const labels = ["promoted","already_in_crm","attempted_no_email","duplicate_collapsed","poor_fit","verified_ready_for_review","already_in_crm_dup","archived_not_working","missing_email_hold","verified_email_available_locked","missing_contact_archived","founder_review_fallback"];
    for (let i = 0; i < updates.length; i++) {
      moved[labels[i]] = await updates[i]();
    }
    (details.steps as any[]).push({ step: "lifecycle_classify", moved, before });
  }

  // STEP 3 — Refresh lifecycle summary counters.
  const { data: summary } = await admin.from("lead_lifecycle_summary").select("*").maybeSingle();
  counters.safe_to_unlock = (summary as any)?.safe_to_unlock ?? 0;
  counters.safe_to_promote = (summary as any)?.safe_to_promote ?? 0;
  counters.safe_to_queue = (summary as any)?.safe_to_queue ?? 0;

  // STEP 4 — Source quality score using NeonCandy brief.
  const { data: brief } = await admin.from("business_sourcing_briefs").select("*").eq("business_id", businessId).maybeSingle();
  let sourceScore: number | null = null;
  if (brief) {
    const total = (summary as any)?.total_leads ?? 0;
    const good = ((summary as any)?.promoted_to_contact ?? 0) + ((summary as any)?.active_working_leads ?? 0)
               + ((summary as any)?.legacy_optional_unlock_candidates ?? 0);
    const bad = ((summary as any)?.duplicates_archived ?? 0) + ((summary as any)?.poor_fit_archived ?? 0)
              + ((summary as any)?.attempted_no_email ?? 0) + ((summary as any)?.missing_contact_archived ?? 0);
    sourceScore = total ? Number(((good / Math.max(1, good + bad)) * 10).toFixed(2)) : null;
    (details.steps as any[]).push({ step: "source_quality", score: sourceScore, total, good, bad });
  }

  // STEP 5 — Build unlock shortlist (preview only, no Apollo).
  if (s.auto_build_unlock_shortlist) {
    (details.steps as any[]).push({
      step: "unlock_shortlist", note: "shortlist function is preview-only and never spends credits",
    });
  }

  // STEP 6 — Decide next recommended action + create founder decisions.
  let nextAction: string;
  if ((counters.safe_to_queue ?? 0) > 0) {
    nextAction = `Approve enqueue of ${counters.safe_to_queue} eligible contact(s)`;
    decisionsToCreate.push({
      decision_type: "enqueue_approval",
      title: `Approve enqueue of ${counters.safe_to_queue} contact(s)`,
      finding: `${counters.safe_to_queue} qualified-for-promotion lead(s) are safe to queue.`,
      recommendation: "Approve to enqueue with default cadence.",
      cost_credit_impact: "No Apollo credits. Email sends will count against inbox daily caps.",
      risk: "Low — already CRM-checked.",
    });
  } else if ((counters.safe_to_promote ?? 0) > 0) {
    nextAction = `Approve promotion of ${counters.safe_to_promote} verified lead(s) to contacts`;
    decisionsToCreate.push({
      decision_type: "promotion_approval",
      title: `Approve promotion of ${counters.safe_to_promote} verified lead(s)`,
      finding: `${counters.safe_to_promote} verified ready-for-review lead(s) have passed CRM checks.`,
      recommendation: "Approve to promote to central CRM contacts.",
      cost_credit_impact: "None. No sends triggered.",
      risk: "Low.",
    });
  } else if (((summary as any)?.active_working_leads ?? 0) > 0) {
    nextAction = "Build Apollo unlock shortlist for active working leads (no credits spent until founder approves)";
  } else if (((summary as any)?.legacy_optional_unlock_candidates ?? 0) > 0) {
    nextAction = "Run fresh Apollo verified-email search using NeonCandy Source Quality Brief (legacy hold pool not recommended)";
  } else {
    nextAction = "Run fresh Apollo verified-email search using NeonCandy Source Quality Brief";
  }

  // Persist decisions (avoid duplicates by type + same day pending).
  for (const d of decisionsToCreate) {
    const { data: existing } = await admin.from("founder_decisions")
      .select("id").eq("business_id", businessId).eq("decision_type", d.decision_type)
      .eq("status", "pending").limit(1).maybeSingle();
    if (existing) continue;
    await admin.from("founder_decisions").insert({
      business_id: businessId, ...d, created_by_run: runId,
    });
    counters.decisions_created++;
  }

  await admin.from("autopilot_runs").update({
    status: "complete", finished_at: new Date().toISOString(),
    ...counters, source_quality_score: sourceScore,
    next_recommended_action: nextAction, details,
  }).eq("id", runId);

  return json({
    ok: true, run_id: runId, trigger, settings_applied: s,
    counters, source_quality_score: sourceScore,
    next_recommended_action: nextAction, summary,
    note: "Autopilot ran cheap deterministic steps only. No AI, no Apollo credits, no unlocks, no promotions, no queue rows, no sends.",
  });
});
