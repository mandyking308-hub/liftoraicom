// Education Apollo FREE-discovery orchestrator — CRM-native correction, 10 Sep 2026.
//
// Account truth: organisations (through strategic_target_accounts.existing_organisation_id).
// Person truth: contacts. Free discovery creates/refreshes non-sendable CRM candidate contacts.
//
// Provider boundary: this function can call ONLY Apollo People Search. It contains no paid
// reveal/enrichment endpoint, no Smartlead call and no outbound action. Dry-run is default and
// makes zero provider calls.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  EDUCATION_SEARCH_SENIORITIES,
  EDUCATION_SEARCH_TITLES,
  scoreEducationRole,
} from "../_shared/educationRoleScorer.ts";
import { EDUCATION_RESEARCH_PROGRAM_KEY } from "../_shared/educationAccountUniverse.ts";
import {
  safeFreeSearchRefreshPatch,
  toEducationCandidateContact,
  type EducationOrganisationRow,
} from "../_shared/educationCrm.ts";

const APOLLO_FREE_SEARCH_URL = "https://api.apollo.io/api/v1/mixed_people/api_search";
const MAX_ACCOUNTS_PER_RUN = 25;
const DEFAULT_CANDIDATES_PER_ACCOUNT = 10;
const MAX_CANDIDATES_PER_ACCOUNT = 25;
const DEFAULT_QUALIFICATIONS = ["International operator"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).in("role", ["founder", "admin"]);
  if (!roles?.length) return json({ error: "founder_role_required" }, 403);

  let body: {
    dry_run?: boolean;
    confirm?: boolean;
    account_limit?: number;
    group_ids?: string[];
    qualifications?: string[];
    candidates_per_account?: number;
  } = {};
  try { body = await req.json(); } catch { /* defaults */ }

  const dryRun = body.dry_run !== false && body.confirm !== true;
  const accountLimit = Math.min(Math.max(1, body.account_limit ?? 10), MAX_ACCOUNTS_PER_RUN);
  const perAccount = Math.min(
    Math.max(1, body.candidates_per_account ?? DEFAULT_CANDIDATES_PER_ACCOUNT),
    MAX_CANDIDATES_PER_ACCOUNT,
  );
  const qualifications = body.qualifications?.length ? body.qualifications : DEFAULT_QUALIFICATIONS;

  let accountQuery = admin
    .from("strategic_target_accounts")
    .select("id,source_key,account_name,account_domain,account_type,existing_organisation_id,metadata")
    .like("source_key", "education_152_master:%")
    .in("account_type", qualifications)
    .order("account_name", { ascending: true })
    .limit(accountLimit);
  if (body.group_ids?.length) {
    accountQuery = accountQuery.in("source_key", body.group_ids.map((g) => `education_152_master:${g.toUpperCase()}`));
  }
  const { data: accounts, error: accountErr } = await accountQuery;
  if (accountErr) return json({ error: "education_account_query_failed", detail: accountErr.message }, 500);

  if (!accounts?.length) {
    return json({
      ok: true,
      dry_run: dryRun,
      provider_calls: 0,
      accounts_selected: 0,
      reason: "no_education_accounts_for_selection",
      qualification_filter: qualifications,
      note: "Load the reviewed Education 152 universe into CRM organisations first.",
    });
  }

  const orgIds = Array.from(new Set(accounts.map((a: any) => a.existing_organisation_id).filter(Boolean)));
  const { data: orgRows, error: orgErr } = orgIds.length
    ? await admin.from("organisations")
        .select("id,name,education_group_id,website_domain,source_key,is_education_target,qualification")
        .in("id", orgIds)
    : { data: [], error: null } as any;
  if (orgErr) return json({ error: "crm_organisation_query_failed", detail: orgErr.message }, 500);
  const orgById = new Map((orgRows ?? []).map((o: any) => [o.id, o]));

  const missingCanonicalOrganisation = accounts
    .filter((a: any) => !a.existing_organisation_id || !orgById.has(a.existing_organisation_id))
    .map((a: any) => ({ group_id: a.metadata?.education_group_id ?? null, account_name: a.account_name }));

  if (dryRun) {
    return json({
      ok: missingCanonicalOrganisation.length === 0,
      dry_run: true,
      provider_calls: 0,
      apollo_endpoint_that_would_be_used: APOLLO_FREE_SEARCH_URL,
      paid_endpoints_used: [],
      smartlead_calls: 0,
      estimated_apollo_credits: 0,
      qualifications,
      accounts_selected: accounts.length,
      candidates_per_account: perAccount,
      max_candidates_per_account: MAX_CANDIDATES_PER_ACCOUNT,
      canonical_company_table: "organisations",
      canonical_person_table: "contacts",
      missing_canonical_organisations: missingCanonicalOrganisation,
      plan: accounts.map((a: any) => ({
        group_id: a.metadata?.education_group_id ?? null,
        account_name: a.account_name,
        organisation_id: a.existing_organisation_id ?? null,
        search_by: "q_organization_name",
        candidate_destination: "contacts",
        candidate_sendable_status: "needs_review",
      })),
      note: "Plan only — zero Apollo calls and zero writes. Live discovery is free People Search only and creates non-sendable CRM candidates.",
    });
  }

  if (missingCanonicalOrganisation.length) {
    return json({
      ok: false,
      error: "canonical_crm_organisation_missing",
      missing: missingCanonicalOrganisation,
      provider_calls: 0,
    }, 412);
  }

  const apiKey = Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) return json({ error: "apollo_api_key_missing" }, 400);

  const results: Array<Record<string, unknown>> = [];
  let providerCalls = 0;
  let candidatesCreated = 0;
  let candidatesRefreshed = 0;
  let identityConflicts = 0;

  for (const account of accounts as any[]) {
    const organisation = orgById.get(account.existing_organisation_id) as (EducationOrganisationRow & { education_group_id: string }) | undefined;
    if (!organisation?.education_group_id) {
      results.push({ account_name: account.account_name, skipped: "missing_education_group_id" });
      continue;
    }

    const searchBody = {
      q_organization_name: account.account_name,
      person_titles: EDUCATION_SEARCH_TITLES,
      person_seniorities: EDUCATION_SEARCH_SENIORITIES,
      contact_email_status: ["verified"],
      page: 1,
      per_page: 100,
    };

    let people: Array<Record<string, any>> = [];
    let status = 0;
    try {
      const res = await fetch(APOLLO_FREE_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
        body: JSON.stringify(searchBody),
      });
      providerCalls++;
      status = res.status;
      if (res.ok) {
        const payload = await res.json().catch(() => null);
        people = (payload?.people ?? payload?.contacts ?? []) as Array<Record<string, any>>;
      }
    } catch {
      status = 0;
    }

    const scored = people
      .map((person) => ({
        person,
        score: scoreEducationRole({
          title: String(person.title ?? ""),
          organisation: account.account_name,
          seniority: String(person.seniority ?? ""),
        }),
      }))
      .filter((c) => c.score.relevant)
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, perAccount);

    for (const candidate of scored) {
      const pid = String(candidate.person.id ?? "").trim();
      if (!pid) continue;

      const { data: existing, error: lookupErr } = await admin.from("contacts")
        .select("id,organisation_id,email,email_verified_status,sendable_status,hard_bounced,is_globally_suppressed,do_not_contact_at,unsubscribed_at")
        .eq("apollo_person_id", pid)
        .maybeSingle();
      if (lookupErr) {
        identityConflicts++;
        continue;
      }

      if (existing?.id) {
        if (existing.organisation_id && existing.organisation_id !== organisation.id) {
          identityConflicts++;
          continue; // fail closed; identity resolution is a separate workflow.
        }
        const patch = safeFreeSearchRefreshPatch({
          person: candidate.person,
          organisation,
          strategic_target_account_id: account.id,
          score: candidate.score,
          research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY,
        });
        const { error } = await admin.from("contacts").update(patch).eq("id", existing.id);
        if (!error) candidatesRefreshed++;
        continue;
      }

      const row = toEducationCandidateContact({
        person: candidate.person,
        organisation,
        strategic_target_account_id: account.id,
        score: candidate.score,
        research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY,
      });
      const { error } = await admin.from("contacts").insert(row);
      if (!error) candidatesCreated++;
      else if ((error as any).code === "23505") identityConflicts++;
    }

    results.push({
      education_group_id: organisation.education_group_id,
      account_name: account.account_name,
      organisation_id: organisation.id,
      http_status: status,
      people_returned: people.length,
      relevant_candidates_retained: scored.length,
    });
  }

  return json({
    ok: true,
    dry_run: false,
    apollo_endpoint_used: APOLLO_FREE_SEARCH_URL,
    paid_endpoints_used: [],
    apollo_credits_spent: 0,
    smartlead_calls: 0,
    provider_calls: providerCalls,
    accounts_processed: accounts.length,
    candidates_created: candidatesCreated,
    candidates_refreshed: candidatesRefreshed,
    identity_conflicts: identityConflicts,
    canonical_company_table: "organisations",
    canonical_person_table: "contacts",
    results,
    side_effects: { paid_reveals: 0, emails_sent: 0, outreach_queue_rows: 0, campaign_starts: 0 },
  });
});
