import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NEON_BUSINESS_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const NEON_BUSINESS_NAME = "Neon Candy";
const HARD_PAGE_CAP = 20; // hard upper bound on pages we will scan in one pull

const GEO_MAP: Record<string, string[]> = {
  UK: ["United Kingdom"],
  US: ["United States"],
  Canada: ["Canada"],
  Europe: [
    "United Kingdom","Ireland","France","Germany","Netherlands","Belgium","Spain",
    "Portugal","Italy","Sweden","Norway","Denmark","Finland","Poland","Austria","Switzerland",
  ],
  Australia: ["Australia"],
};

/**
 * Apollo Pull Verified — direct verified-email Apollo pull driven by the
 * NeonCandy Source Quality Brief.
 *
 * NEVER spends Apollo unlock credits.
 * NEVER unlocks locked / no-email profiles (we hard-require verified email).
 * NEVER promotes contacts, NEVER enqueues, NEVER sends, NEVER uses AI.
 *
 * Lands rows in apollo_leads / apollo_raw_leads / lead_quality_profiles
 * (existing apollo-sync-search pipeline) then triggers lead-quality-autopilot.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: {
    business_id?: string;
    search_size?: number;
    import_limit?: number;
    geography?: string[]; // any of UK / US / Canada / Europe / Australia
    confirm?: boolean;
    dry_run?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const businessId = body.business_id ?? NEON_BUSINESS_ID;
  const searchSize = Math.max(50, Math.min(2000, body.search_size ?? 500));
  const importLimit = Math.max(10, Math.min(500, body.import_limit ?? 75));
  const geography = (body.geography ?? []).filter((g) => GEO_MAP[g]);
  const dryRun = !!body.dry_run;

  if (!body.confirm && !dryRun) {
    return json({
      error: "founder_confirmation_required",
      message: "Pass { confirm: true } to execute the Apollo pull. No credits will be spent — verified-email-only.",
    }, 412);
  }

  // 1) Load brief
  const { data: brief, error: briefErr } = await admin
    .from("business_sourcing_briefs")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("last_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (briefErr || !brief) return json({ error: "brief_not_found", detail: briefErr?.message }, 404);

  // 2) Verify Apollo connection exists & search-API-verified
  const { data: conn } = await admin
    .from("apollo_connections").select("search_api_status,search_api_error")
    .eq("business_name", NEON_BUSINESS_NAME).maybeSingle();
  if (!conn) return json({ error: "apollo_connection_unavailable", message: "Apollo connection unavailable — reconnect Apollo." }, 412);
  if (conn.search_api_status !== "ok") {
    return json({
      error: "apollo_connection_unavailable",
      detail: conn.search_api_error,
      message: "Apollo connection unavailable — reconnect Apollo.",
    }, 412);
  }

  // 3) Build Apollo search criteria from brief
  const includeTitles = (brief.include_titles as string[]) ?? [];
  const excludeTitles = (brief.exclude_titles as string[]) ?? [];
  const keywords = (brief.apollo_search_keywords as string[]) ?? [];
  const personLocations = geography.flatMap((g) => GEO_MAP[g] ?? []);

  const perPage = Math.min(25, searchSize); // apollo-sync-search HARD_CAP = 25

  const searchCriteria: Record<string, unknown> = {
    person_titles: includeTitles.length ? includeTitles : keywords,
    contact_email_status: ["verified"],
    per_page: perPage,
  };
  if (excludeTitles.length) searchCriteria["person_not_titles"] = excludeTitles;
  if (keywords.length) searchCriteria["q_keywords"] = keywords.join(" ");
  if (personLocations.length) searchCriteria["person_locations"] = personLocations;

  // 4) Find or create the Neon Candy people_search segment
  let { data: segment } = await admin
    .from("apollo_sync_segments")
    .select("*")
    .eq("business_name", NEON_BUSINESS_NAME)
    .eq("mode", "people_search")
    .maybeSingle();

  if (!segment) {
    const ins = await admin.from("apollo_sync_segments").insert({
      business_name: NEON_BUSINESS_NAME,
      segment_name: "NeonCandy verified-email pull (brief-driven)",
      mode: "people_search",
      search_criteria: searchCriteria,
      max_contacts_per_run: perPage,
      hold_for_approval: true,
      auto_qualify: false,
      auto_enrich: false,
      email_only: true,
      require_good_fit: true,
      is_active: true,
    }).select("*").single();
    segment = ins.data;
  } else {
    await admin.from("apollo_sync_segments").update({
      search_criteria: searchCriteria,
      max_contacts_per_run: perPage,
      email_only: true,
      require_good_fit: true,
    }).eq("id", segment.id);
    segment = { ...segment, search_criteria: searchCriteria, max_contacts_per_run: perPage };
  }

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      brief_id: brief.id,
      segment_id: segment!.id,
      planned_search_criteria: searchCriteria,
      planned_pages: Math.ceil(importLimit / perPage),
      import_limit: importLimit,
      geography,
      note: "No Apollo call made. No credits spent.",
    });
  }

  // 5) Loop calls into apollo-sync-search until we hit importLimit verified-email leads
  const pulls: any[] = [];
  let pulled = 0;
  let verifiedEmails = 0;
  let pagesScanned = 0;
  let lastDiagnostics: any = null;
  const errors: string[] = [];

  for (let i = 0; i < HARD_PAGE_CAP && pulled < importLimit; i++) {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/apollo-sync-search`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ segment_id: segment!.id }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errors.push(`apollo-sync-search HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 240)}`);
      break;
    }
    pulls.push(data);
    pagesScanned += 1;
    const found = Number(data.people_found ?? 0);
    const withEmail = Number(data.people_with_email_flag ?? 0);
    pulled += found;
    verifiedEmails += withEmail;
    lastDiagnostics = data.diagnostics ?? lastDiagnostics;
    if (found === 0) break; // exhausted
  }

  // 6) Trigger Lead Quality Autopilot
  let autopilot: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/lead-quality-autopilot`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "after_apollo_pull", business_id: businessId }),
    });
    autopilot = await r.json().catch(() => null);
  } catch (e) {
    errors.push(`autopilot_trigger_failed: ${(e as Error).message}`);
  }

  // 7) Lifecycle summary for founder display
  const { data: lifecycle } = await admin.from("lead_lifecycle_summary").select("*").maybeSingle();

  const counters = autopilot?.counters ?? {};

  return json({
    ok: true,
    brief_id: brief.id,
    segment_id: segment!.id,
    pulled_pages: pagesScanned,
    apollo_results_scanned: pulled,
    leads_pulled_into_staging: pulled,
    // Apollo people_search returns has_email_flag=true with NO actual address.
    // The address requires unlock credits to reveal — treat these as
    // "verified-email available but locked" candidates, not "imported emails".
    verified_email_available_locked: verifiedEmails,
    actual_emails_revealed: 0,
    unlock_required: verifiedEmails,
    /** @deprecated misleading label — kept for backward compat */
    verified_emails_imported: verifiedEmails,
    duplicates_collapsed: counters.duplicates_collapsed ?? 0,
    already_in_crm: counters.already_in_crm_matched ?? 0,
    poor_fit_archived: counters.poor_fit_archived ?? 0,
    active_candidates: lifecycle?.active_working_leads ?? 0,
    verified_email_available_locked_total: lifecycle?.verified_email_available_locked ?? 0,
    safe_to_promote: lifecycle?.safe_to_promote ?? 0,
    safe_to_queue: lifecycle?.safe_to_queue ?? 0,
    safe_to_unlock: lifecycle?.safe_to_unlock ?? 0,
    decisions_waiting: counters.decisions_created ?? 0,
    source_quality_score: autopilot?.source_quality_score ?? null,
    next_recommended_action: autopilot?.next_recommended_action ?? null,
    pulls,
    last_diagnostics: lastDiagnostics,
    errors,
    note: "Verified-email-available pull only. Apollo confirms emails exist but does NOT release the address; reveal requires founder-approved unlock. No credits spent, no promotions, no queue rows, no sends.",
  });
});
