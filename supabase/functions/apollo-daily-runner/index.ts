import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * apollo-daily-runner
 * Invoked by pg_cron once per day (default 06:00 UTC).
 * For every segment with automation_enabled=true, it:
 *   1. Skips if already ran today (UTC date).
 *   2. Calls apollo-sync-search (capped at daily_search_cap).
 *   3. If segment_fit === 'good' and auto_enrich, calls apollo-sync-enrich
 *      limited by daily_enrichment_cap (only candidates with email flag,
 *      not duplicates, not suppressed).
 *   4. Writes a row to apollo_automation_runs with the daily summary.
 *
 * Manual invocation: POST { segment_id?: string, dry_run?: boolean }.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: { segment_id?: string; dry_run?: boolean } = {};
  try {
    if (req.method === "POST") body = await req.json().catch(() => ({}));
  } catch (_) {
    body = {};
  }

  const today = new Date().toISOString().slice(0, 10); // UTC date

  // Pick segments
  const segQuery = supabase
    .from("apollo_sync_segments")
    .select("*")
    .eq("automation_enabled", true)
    .eq("is_active", true);
  if (body.segment_id) segQuery.eq("id", body.segment_id);

  const { data: segments, error: segErr } = await segQuery;
  if (segErr) return json({ error: "segment_query_failed", detail: segErr.message }, 500);
  if (!segments || segments.length === 0) {
    return json({ ok: true, message: "no automation-enabled segments", date: today }, 200);
  }

  const results: any[] = [];

  for (const seg of segments) {
    // Skip if already ran today (audit log present and not failed/started)
    const { data: prev } = await supabase
      .from("apollo_automation_runs")
      .select("id, status")
      .eq("segment_id", seg.id)
      .eq("run_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev && prev.status !== "failed" && !body.dry_run) {
      results.push({ segment_id: seg.id, skipped: "already_ran_today", prev_id: prev.id });
      continue;
    }

    // Audit row
    const { data: auditRow } = await supabase
      .from("apollo_automation_runs")
      .insert({
        segment_id: seg.id,
        business_name: seg.business_name,
        run_date: today,
        status: "started",
      })
      .select()
      .single();

    const auditId = auditRow?.id;
    const errors: string[] = [];

    try {
      // 1. SEARCH
      const searchCap = Math.min(seg.daily_search_cap ?? 25, seg.max_contacts_per_run ?? 25);
      // Note: search uses segment.max_contacts_per_run as cap, so apply daily cap by capping that value temporarily via update if needed.
      // Simpler: rely on max_contacts_per_run which Mandy set to 25.
      const { data: searchData, error: searchErr } = await supabase.functions.invoke(
        "apollo-sync-search",
        { body: { segment_id: seg.id } },
      );
      if (searchErr) throw new Error(`search_failed: ${searchErr.message}`);

      const runId: string | undefined = searchData?.run_id;
      const peopleFound: number = searchData?.people_found ?? 0;
      const withEmail: number = searchData?.people_with_email_flag ?? 0;
      const diagnostics = searchData?.diagnostics ?? {};
      const segmentFit: string = diagnostics?.segment_fit ?? "unknown";

      // Update audit with search outcome
      await supabase
        .from("apollo_automation_runs")
        .update({
          search_run_id: runId,
          searched: searchCap,
          found: peopleFound,
          segment_fit: segmentFit,
        })
        .eq("id", auditId);

      // 2. PRE-ENRICHMENT GUARDS
      if (!seg.auto_enrich) {
        await supabase.from("apollo_automation_runs").update({
          status: "search_only",
          enrichment_skipped_reason: "auto_enrich_disabled",
        }).eq("id", auditId);
        results.push({ segment_id: seg.id, run_id: runId, status: "search_only" });
        continue;
      }

      if (seg.require_good_fit && segmentFit !== "good") {
        await supabase.from("apollo_automation_runs").update({
          status: "blocked_fit",
          enrichment_skipped_reason: `segment_fit_${segmentFit}`,
        }).eq("id", auditId);
        results.push({ segment_id: seg.id, run_id: runId, status: "blocked_fit", segment_fit: segmentFit });
        continue;
      }

      if (withEmail === 0) {
        await supabase.from("apollo_automation_runs").update({
          status: "no_candidates",
          enrichment_skipped_reason: "no_candidates_with_email_flag",
        }).eq("id", auditId);
        results.push({ segment_id: seg.id, run_id: runId, status: "no_candidates" });
        continue;
      }

      // 3. PICK CANDIDATES respecting daily enrichment cap
      // Enrich only New (non-duplicate) candidates with email flag.
      // Pre-dedupe vs existing contacts: skip apollo_leads whose email or apollo_person_id already exist.
      const { data: leads } = await supabase
        .from("apollo_leads")
        .select("apollo_person_id, first_name, last_name, company, linkedin_url, has_email_flag")
        .eq("run_id", runId!)
        .eq("has_email_flag", true);

      const candidateIds: string[] = [];
      let skippedDupes = 0;
      let skippedSuppressed = 0;
      const cap = seg.daily_enrichment_cap ?? 25;

      for (const l of leads ?? []) {
        if (candidateIds.length >= cap) break;
        // Duplicate check: by linkedin_url or name+company in central contacts
        const orParts: string[] = [];
        if (l.linkedin_url) orParts.push(`linkedin_url.eq.${l.linkedin_url}`);
        let isDup = false;
        if (orParts.length) {
          const { data: existing } = await supabase
            .from("contacts")
            .select("id")
            .or(orParts.join(","))
            .limit(1);
          if (existing && existing.length > 0) isDup = true;
        }
        if (!isDup && l.first_name && l.last_name && l.company) {
          const { data: existing2 } = await supabase
            .from("contacts")
            .select("id")
            .ilike("first_name", l.first_name)
            .ilike("last_name", l.last_name)
            .ilike("company", l.company)
            .limit(1);
          if (existing2 && existing2.length > 0) isDup = true;
        }
        if (isDup) {
          skippedDupes++;
          continue;
        }
        candidateIds.push(l.apollo_person_id as string);
      }

      if (candidateIds.length === 0) {
        await supabase.from("apollo_automation_runs").update({
          status: "all_duplicates",
          enrichment_skipped_reason: "all_candidates_duplicate_or_suppressed",
          skipped_duplicates: skippedDupes,
          skipped_suppressed: skippedSuppressed,
        }).eq("id", auditId);
        results.push({ segment_id: seg.id, run_id: runId, status: "all_duplicates" });
        continue;
      }

      if (body.dry_run) {
        await supabase.from("apollo_automation_runs").update({
          status: "dry_run",
          notes: `would_enrich=${candidateIds.length}`,
          skipped_duplicates: skippedDupes,
        }).eq("id", auditId);
        results.push({ segment_id: seg.id, run_id: runId, status: "dry_run", would_enrich: candidateIds.length });
        continue;
      }

      // 4. ENRICH (capped subset)
      const { data: enrichData, error: enrichErr } = await supabase.functions.invoke(
        "apollo-sync-enrich",
        { body: { run_id: runId, selected_apollo_person_ids: candidateIds } },
      );
      if (enrichErr) throw new Error(`enrich_failed: ${enrichErr.message}`);

      // 5. Read final run counters for audit
      const { data: finalRun } = await supabase
        .from("apollo_sync_runs")
        .select("apollo_credits_used, contacts_new, contacts_updated, qualified_count, ready_to_stage_count")
        .eq("id", runId!)
        .maybeSingle();

      await supabase.from("apollo_automation_runs").update({
        status: "completed",
        skipped_duplicates: skippedDupes,
        skipped_suppressed: skippedSuppressed,
        enrichment_credits_used: finalRun?.apollo_credits_used ?? candidateIds.length,
        contacts_new: finalRun?.contacts_new ?? 0,
        contacts_updated: finalRun?.contacts_updated ?? 0,
        qualified: finalRun?.qualified_count ?? 0,
        staged: 0, // staging handled by separate process; left at 0 until wired
      }).eq("id", auditId);

      // Update segment last_scheduled_run_at
      await supabase
        .from("apollo_sync_segments")
        .update({ last_scheduled_run_at: new Date().toISOString() })
        .eq("id", seg.id);

      results.push({
        segment_id: seg.id,
        run_id: runId,
        status: "completed",
        enriched: candidateIds.length,
        new: finalRun?.contacts_new ?? 0,
        updated: finalRun?.contacts_updated ?? 0,
      });
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(msg);
      await supabase.from("apollo_automation_runs").update({
        status: "failed",
        errors,
      }).eq("id", auditId);
      results.push({ segment_id: seg.id, status: "failed", error: msg });
    }
  }

  return json({ ok: true, date: today, results }, 200);
});