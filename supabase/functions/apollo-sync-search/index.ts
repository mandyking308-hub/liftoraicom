import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const HARD_CAP = 25;
const MAX_PAGE_SCAN = 6; // safety: how many consecutive pages to skip-forward over fully-seen results

// Music-discovery taxonomy used for segment-fit scoring on Neon Candy and similar music targets.
const MUSIC_TARGET_KEYWORDS = [
  "playlist curator",
  "music curator",
  "independent curator",
  "music programmer",
  "music editor",
  "editorial curator",
  "music discovery",
  "music blogger",
  "music influencer",
  "music journalist",
  "music supervisor",
  "a&r",
  "dj",
  "radio",
  "label manager",
  "music marketing",
  "dance creator",
  "reaction creator",
  "ai music",
];

function scoreFit(p: any): { match: boolean; matched_terms: string[] } {
  const haystack = `${p.title ?? ""} ${p.headline ?? ""} ${p.organization?.name ?? ""} ${p.organization?.industry ?? ""}`.toLowerCase();
  const matched = MUSIC_TARGET_KEYWORDS.filter((kw) => haystack.includes(kw));
  return { match: matched.length > 0, matched_terms: matched };
}

interface Body {
  segment_id: string;
  // Optional override: force a specific page (manual recovery).
  // Default behavior advances from segment.next_page.
  page?: number;
  // Skip the auto-advance over fully-seen pages (debug only).
  no_skip_seen?: boolean;
}

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const enc = Deno.env.get("APOLLO_ENCRYPTION_KEY");
    if (!enc) return json({ error: "APOLLO_ENCRYPTION_KEY missing" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body: Body = await req.json();
    if (!body?.segment_id) return json({ error: "segment_id required" }, 400);

    const { data: segment, error: segErr } = await supabase
      .from("apollo_sync_segments")
      .select("*")
      .eq("id", body.segment_id)
      .maybeSingle();
    if (segErr || !segment) return json({ error: "segment_not_found" }, 404);

    const { data: conn, error: connErr } = await supabase
      .from("apollo_connections")
      .select("*")
      .eq("business_name", segment.business_name)
      .maybeSingle();
    if (connErr || !conn) return json({ error: "no_apollo_connection" }, 404);
    if (conn.search_api_status !== "ok") {
      return json({ error: "search_api_not_verified", detail: conn.search_api_error }, 412);
    }

    const { data: dec } = await supabase.rpc("apollo_decrypt_key", { cipher: conn.api_key_cipher, enc_key: enc });
    const apiKey = dec as string;
    if (!apiKey) return json({ error: "decrypt_failed" }, 500);

    const cap = Math.min(segment.max_contacts_per_run ?? HARD_CAP, HARD_CAP);

    // ---- PAGINATION: pick next page from segment state (or override) ----
    const seenSet = new Set<string>(((segment.apollo_person_ids_seen as string[] | null) ?? []).filter(Boolean));
    const startPage = Math.max(1, Number(body.page ?? segment.next_page ?? 1));

    // Create the run upfront so we can attach errors to it
    const { data: run, error: runErr } = await supabase
      .from("apollo_sync_runs")
      .insert({
        segment_id: segment.id,
        business_name: segment.business_name,
        status: "search_running",
      })
      .select()
      .single();
    if (runErr) return json({ error: "run_create_failed", detail: runErr.message }, 500);

    function buildSearchBody(page: number): Record<string, unknown> {
      const sb: Record<string, unknown> = { page, per_page: cap };
      if (segment.mode === "saved_list" && segment.saved_list_id) {
        sb.label_ids = [segment.saved_list_id];
        sb["contact_email_status"] = ["verified"];
      } else if (segment.mode === "people_search") {
        Object.assign(sb, segment.search_criteria || {});
        sb.page = page;
        sb.per_page = cap;
        const existingStatus = (sb["contact_email_status"] as unknown) as string[] | undefined;
        if (!existingStatus || existingStatus.length === 0) {
          sb["contact_email_status"] = ["verified"];
        }
      }
      return sb;
    }

    const errors: any[] = [];
    let people: any[] = [];
    let pageFetched = startPage;
    let pagesScanned = 0;
    let totalSkippedAlreadySeen = 0;
    const skippedSeenIds: string[] = [];

    // Loop: fetch page; if >= 80% of returned ids already seen and no_skip_seen=false, advance.
    while (pagesScanned < MAX_PAGE_SCAN) {
      const sb = buildSearchBody(pageFetched);
      const resp = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
        body: JSON.stringify(sb),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        const errMsg = resp.status === 403
          ? "API_INACCESSIBLE — Apollo Search API not enabled on this key"
          : `HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 240)}`;
        await supabase.from("apollo_sync_runs").update({
          status: "failed", errors: [errMsg, `page_attempted=${pageFetched}`], completed_at: new Date().toISOString(),
        }).eq("id", run.id);
        return json({ error: errMsg, run_id: run.id, page_attempted: pageFetched }, 502);
      }
      const pagePeople = (data?.people ?? data?.contacts ?? []) as any[];
      pagesScanned += 1;

      if (pagePeople.length === 0) {
        // No more results
        people = [];
        break;
      }

      const ids = pagePeople.map((p) => p.id).filter(Boolean) as string[];
      const unseenIds = ids.filter((id) => !seenSet.has(id));
      const seenAlready = ids.length - unseenIds.length;

      if (body.no_skip_seen || unseenIds.length / Math.max(ids.length, 1) >= 0.2) {
        // Accept this page — has at least some unseen ids
        people = pagePeople;
        totalSkippedAlreadySeen += seenAlready;
        for (const id of ids) if (seenSet.has(id)) skippedSeenIds.push(id);
        break;
      }

      // Almost everything on this page already seen — record and advance
      totalSkippedAlreadySeen += seenAlready;
      for (const id of ids) skippedSeenIds.push(id);
      pageFetched += 1;
    }

    if (people.length === 0 && pagesScanned >= MAX_PAGE_SCAN) {
      await supabase.from("apollo_sync_runs").update({
        status: "completed",
        page_fetched: pageFetched,
        unseen_in_batch: 0,
        skipped_already_seen: totalSkippedAlreadySeen,
        people_found: 0,
        people_with_email_flag: 0,
        errors: [`exhausted_seen_pages_after_${MAX_PAGE_SCAN}_scans`],
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      return json({
        run_id: run.id,
        people_found: 0,
        people_with_email_flag: 0,
        cap,
        page_fetched: pageFetched,
        next_page: pageFetched, // no advance — nothing new
        unseen_in_batch: 0,
        skipped_already_seen: totalSkippedAlreadySeen,
        diagnostics: { exhausted_seen_pages: true, scanned: pagesScanned, segment_fit: "unknown", enrichment_skip_reason: "no_unseen_candidates" },
      }, 200);
    }

    if (people.length === 0) {
      // Empty page from Apollo (end of results)
      await supabase.from("apollo_sync_runs").update({
        status: "completed",
        page_fetched: pageFetched,
        unseen_in_batch: 0,
        skipped_already_seen: totalSkippedAlreadySeen,
        people_found: 0,
        people_with_email_flag: 0,
        errors: [`apollo_returned_empty_page_${pageFetched}`],
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      return json({
        run_id: run.id,
        people_found: 0,
        people_with_email_flag: 0,
        cap,
        page_fetched: pageFetched,
        next_page: pageFetched, // do not advance past empty
        unseen_in_batch: 0,
        skipped_already_seen: totalSkippedAlreadySeen,
        diagnostics: { end_of_results: true, segment_fit: "unknown", enrichment_skip_reason: "no_more_apollo_results" },
      }, 200);
    }
    let withEmailFlag = 0;
    let hasEmailTrue = 0;
    let hasEmailFalse = 0;
    let hasEmailMissing = 0;
    let emailStatusVerified = 0;
    let emailStatusUnavailable = 0;
    const sampleTitles: Array<{ title: string | null; company: string | null }> = [];
    let fitMatched = 0;
    const detectedTags = new Set<string>();

    // Insert apollo_leads (idempotent on (run_id, apollo_person_id))
    const unseenInBatchIds: string[] = [];
    const leadRows = people.slice(0, cap).map((p) => {
      // Apollo people search returns `has_email` (boolean). Fall back to email_status fields.
      const rawHasEmail = p.has_email;
      if (rawHasEmail === true) hasEmailTrue += 1;
      else if (rawHasEmail === false) hasEmailFalse += 1;
      else hasEmailMissing += 1;

      const emailStatus = p.email_status ?? p.contact_email_status ?? null;
      if (emailStatus === "verified") emailStatusVerified += 1;
      else if (emailStatus && emailStatus !== "verified") emailStatusUnavailable += 1;

      const hasEmail =
        rawHasEmail === true ||
        emailStatus === "verified" ||
        (typeof emailStatus === "string" && emailStatus !== "no_email" && emailStatus.length > 0);

      if (hasEmail) withEmailFlag += 1;
      const fit = scoreFit(p);
      if (fit.match) fitMatched += 1;
      fit.matched_terms.forEach((t) => detectedTags.add(t));
      if (sampleTitles.length < 5) {
        sampleTitles.push({
          title: p.title ?? null,
          company: p.organization?.name ?? p.organization_name ?? null,
        });
      }
      if (p.id && !seenSet.has(p.id)) unseenInBatchIds.push(p.id);
      return {
        run_id: run.id,
        segment_id: segment.id,
        business_name: segment.business_name,
        apollo_person_id: p.id,
        apollo_org_id: p.organization?.id ?? p.organization_id ?? null,
        has_email_flag: hasEmail,
        search_payload: p,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        title: p.title ?? null,
        company: p.organization?.name ?? p.organization_name ?? null,
        linkedin_url: p.linkedin_url ?? null,
        country: p.country ?? null,
        status: hasEmail ? "has_email" : "found",
      };
    });

    if (leadRows.length) {
      const { error: insErr } = await supabase.from("apollo_leads").insert(leadRows);
      if (insErr) errors.push(`lead_insert: ${insErr.message}`);
    }

    // Fit scoring: ratio of music-target matches over leads with email flag (or total)
    const denom = leadRows.length || 1;
    const fitRatio = fitMatched / denom;
    const segmentFit: "good" | "weak" | "poor" =
      fitRatio >= 0.5 ? "good" : fitRatio >= 0.2 ? "weak" : "poor";

    const enrichmentSkipReason = withEmailFlag === 0
      ? "no_candidates_with_email_flag"
      : segmentFit === "poor"
      ? "segment_fit_poor_blocking_enrichment"
      : null;

    const diagnostics = {
      raw_people_found: people.length,
      page_fetched: pageFetched,
      pages_scanned: pagesScanned,
      unseen_in_batch: unseenInBatchIds.length,
      skipped_already_seen: totalSkippedAlreadySeen,
      has_email_true: hasEmailTrue,
      has_email_false: hasEmailFalse,
      has_email_missing: hasEmailMissing,
      email_status_verified: emailStatusVerified,
      email_status_unavailable: emailStatusUnavailable,
      sample_titles: sampleTitles,
      detected_tags: Array.from(detectedTags),
      fit_matched: fitMatched,
      fit_ratio: Number(fitRatio.toFixed(2)),
      segment_fit: segmentFit,
      enrichment_skip_reason: enrichmentSkipReason,
      search_filter_contact_email_status: buildSearchBody(pageFetched)["contact_email_status"] ?? null,
      search_mode: segment.mode,
      saved_list_id: segment.saved_list_id ?? null,
    };

    await supabase.from("apollo_sync_runs").update({
      status: "awaiting_enrichment_approval",
      search_pages_fetched: 1,
      page_fetched: pageFetched,
      unseen_in_batch: unseenInBatchIds.length,
      skipped_already_seen: totalSkippedAlreadySeen,
      people_found: people.length,
      people_with_email_flag: withEmailFlag,
      errors: enrichmentSkipReason ? [...errors, `diagnostic: ${enrichmentSkipReason}`, JSON.stringify(diagnostics)] : [...errors, JSON.stringify(diagnostics)],
    }).eq("id", run.id);

    // ---- Update segment pagination state ----
    const newSeen = Array.from(new Set([...seenSet, ...(leadRows.map((r) => r.apollo_person_id).filter(Boolean) as string[])]));
    await supabase.from("apollo_sync_segments").update({
      current_page: pageFetched,
      last_page_processed: pageFetched,
      next_page: pageFetched + 1,
      apollo_person_ids_seen: newSeen,
    }).eq("id", segment.id);

    // Fire-and-forget: trigger the Lead Quality Autopilot (cheap deterministic
    // scan + dedupe + lifecycle classify + CRM cross-check). Never blocks the
    // import response and never spends Apollo credits or sends emails.
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${SUPABASE_URL}/functions/v1/lead-quality-autopilot`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "after_apollo_import" }),
      }).catch(() => {});
    } catch { /* never block the import */ }

    return json({
      run_id: run.id,
      people_found: people.length,
      people_with_email_flag: withEmailFlag,
      cap,
      page_fetched: pageFetched,
      next_page: pageFetched + 1,
      unseen_in_batch: unseenInBatchIds.length,
      skipped_already_seen: totalSkippedAlreadySeen,
      diagnostics,
      next_step: "approve enrichment via apollo-sync-enrich",
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
