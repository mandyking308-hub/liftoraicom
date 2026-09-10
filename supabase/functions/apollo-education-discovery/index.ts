// Education FREE-discovery orchestrator (Stage 4).
//
// Reads the canonical education master account list (strategic_target_accounts,
// source_key education_152_master:%) and finds candidate decision-makers using
// ONLY the credit-free Apollo People Search endpoint.
//
// HARD RULES enforced in this file:
//  - the only Apollo URL referenced is /mixed_people/api_search (free search)
//  - no /people/match, no /people/bulk_match, no phone reveal, no waterfall
//  - dry_run (default) performs ZERO provider calls
//  - CRM-NATIVE (10 Sep 2026 correction): research candidates are written to the
//    master CRM `contacts` table, linked to the canonical `organisations` row.
//    Relationship Intelligence is no longer the canonical destination.
//  - candidates are created NON-SENDABLE with no email; discovery never queues or sends outreach
//  - dedupe is by Apollo person id; verified email, suppression, bounce and DNC are never erased
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  EDUCATION_SEARCH_SENIORITIES,
  EDUCATION_SEARCH_TITLES,
  scoreEducationRole,
} from "../_shared/educationRoleScorer.ts";
import { EDUCATION_RESEARCH_PROGRAM_KEY } from "../_shared/educationAccountUniverse.ts";

const APOLLO_FREE_SEARCH_URL = "https://api.apollo.io/api/v1/mixed_people/api_search";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_ACCOUNTS_PER_RUN = 25;
const MAX_CANDIDATES_PER_ACCOUNT = 25;
const DEFAULT_CANDIDATES_PER_ACCOUNT = 10;

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
    dry_run?: boolean; confirm?: boolean;
    account_limit?: number; group_ids?: string[];
    candidates_per_account?: number;
  } = {};
  try { body = await req.json(); } catch { /* defaults */ }

  const dryRun = body.dry_run !== false && body.confirm !== true;
  const accountLimit = Math.min(Math.max(1, body.account_limit ?? 10), MAX_ACCOUNTS_PER_RUN);
  const perAccount = Math.min(Math.max(1, body.candidates_per_account ?? DEFAULT_CANDIDATES_PER_ACCOUNT), MAX_CANDIDATES_PER_ACCOUNT);

  let query = admin
    .from("strategic_target_accounts")
    .select("id, account_name, account_domain, geography, account_type, metadata, existing_organisation_id, source_key")
    .like("source_key", "education_152_master:%")
    .order("account_name", { ascending: true })
    .limit(accountLimit);
  if (body.group_ids?.length) {
    query = query.in("source_key", body.group_ids.map((g) => `education_152_master:${g.toUpperCase()}`));
  }
  const { data: accounts, error: accErr } = await query;
  if (accErr) return json({ error: accErr.message }, 500);

  if (!accounts?.length) {
    return json({
      ok: true, dry_run: dryRun, provider_calls: 0, accounts_selected: 0,
      reason: "no_education_master_accounts",
      note: "The education account universe is empty. Import it first via apollo-education-account-import.",
    });
  }

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      provider_calls: 0,
      apollo_endpoint_that_would_be_used: APOLLO_FREE_SEARCH_URL,
      paid_endpoints_used: [],
      accounts_selected: accounts.length,
      candidates_per_account: perAccount,
      estimated_apollo_credits: 0,
      plan: accounts.map((a) => ({
        account_name: a.account_name,
        account_domain: a.account_domain,
        search_titles: EDUCATION_SEARCH_TITLES.length,
        search_seniorities: EDUCATION_SEARCH_SENIORITIES,
        crm_organisation_linked: Boolean(a.existing_organisation_id),
        writes_to: "contacts (master CRM, non-sendable research candidates)",
      })),
      note: "Plan only — no Apollo request was made. Free People Search costs no credits; this run performs no reveal, no phone lookup and no outreach.",
    });
  }

  const apiKey = Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) return json({ error: "apollo_api_key_missing" }, 400);

  const results: Array<Record<string, unknown>> = [];
  let providerCalls = 0;
  let candidatesWritten = 0;
  let candidatesUpdated = 0;

  for (const account of accounts) {
    const searchBody = {
      q_organization_domains: account.account_domain ? [account.account_domain] : undefined,
      organization_names: account.account_domain ? undefined : [account.account_name],
      person_titles: EDUCATION_SEARCH_TITLES,
      person_seniorities: EDUCATION_SEARCH_SENIORITIES,
      page: 1,
      per_page: 25,
    };

    let people: Array<Record<string, unknown>> = [];
    let status = 0;
    try {
      // FREE search only. No paid endpoint is reachable from this function.
      const res = await fetch(APOLLO_FREE_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "x-api-key": apiKey },
        body: JSON.stringify(searchBody),
      });
      providerCalls++;
      status = res.status;
      if (res.ok) {
        const payload = await res.json();
        people = (payload?.people ?? payload?.contacts ?? []) as Array<Record<string, unknown>>;
      }
    } catch {
      status = 0;
    }

    const scored = people.map((p) => {
      const title = String(p.title ?? "");
      const score = scoreEducationRole({
        title,
        organisation: account.account_name,
        seniority: String(p.seniority ?? ""),
      });
      return { person: p, score, title };
    })
      .filter((c) => c.score.relevant)
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, perAccount);

    // Resolve the canonical CRM organisation for this account.
    let organisationId: string | null = (account as any).existing_organisation_id ?? null;
    if (!organisationId && (account as any).source_key) {
      const { data: org } = await admin
        .from("organisations").select("id").eq("source_key", (account as any).source_key).maybeSingle();
      organisationId = org?.id ?? null;
    }
    if (!organisationId) {
      results.push({
        account_name: account.account_name,
        http_status: status,
        people_returned: people.length,
        candidates_kept: 0,
        skipped: "no_canonical_crm_organisation",
      });
      continue;
    }

    for (let rank = 0; rank < scored.length; rank++) {
      const c = scored[rank];
      const p = c.person as Record<string, any>;
      const apolloId = String(p.id ?? "");
      if (!apolloId) continue;

      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ") || String(p.name ?? "Unknown");
      const groupId = String((account.metadata as any)?.education_group_id ?? "");
      const researchFields = {
        organisation_id: organisationId,
        company: account.account_name,
        role: c.title || "",
        education_group_id: groupId || null,
        education_role_family: c.score.role_family,
        education_role_score: c.score.score,
        research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY,
        is_research_candidate: true,
        apollo_person_id: apolloId,
        apollo_organization_id: String(p.organization_id ?? "") || null,
        linkedin_url: p.linkedin_url ?? null,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        notes: `Education research candidate. Rank ${rank + 1}. ${c.score.reasons.join("; ")}`,
      };

      // Dedupe by Apollo person id first, then by organisation + name.
      const { data: byApollo } = await admin
        .from("contacts").select("id, sendable_status, reveal_status").eq("apollo_person_id", apolloId).maybeSingle();
      let existing = byApollo ?? null;
      if (!existing) {
        const { data: byName } = await admin
          .from("contacts").select("id, sendable_status, reveal_status")
          .eq("organisation_id", organisationId).ilike("name", fullName).maybeSingle();
        existing = byName ?? null;
      }

      if (existing?.id) {
        // NEVER erase a verified email, suppression, bounce or DNC state: this update
        // touches only research/mapping fields and leaves email + status untouched.
        const { error } = await admin.from("contacts").update(researchFields).eq("id", existing.id);
        if (!error) candidatesUpdated++;
      } else {
        const { error } = await admin.from("contacts").insert({
          ...researchFields,
          name: fullName,
          source: "apollo_free_search_education",
          status: "NEW",
          sendable_status: "not_sendable",
          reveal_status: "not_revealed",
          apollo_enrichment_status: "pending",
          data_source: "apollo_people_search",
          source_platform: "apollo",
          source_record_id: apolloId,
          tags: ["education-research", "not-sendable"],
        });
        if (!error) candidatesWritten++;
      }
    }

    results.push({
      account_name: account.account_name,
      http_status: status,
      people_returned: people.length,
      candidates_kept: scored.length,
    });
  }

  return json({
    ok: true,
    dry_run: false,
    apollo_endpoint_used: APOLLO_FREE_SEARCH_URL,
    paid_endpoints_used: [],
    apollo_credits_spent: 0,
    provider_calls: providerCalls,
    accounts_processed: accounts.length,
    crm_contacts_created: candidatesWritten,
    crm_contacts_updated: candidatesUpdated,
    candidates_written: candidatesWritten + candidatesUpdated,
    results,
    canonical_destination: "contacts (linked to organisations)",
    side_effects: { emails_queued: 0, emails_sent: 0, outreach_queue_rows: 0, paid_reveals: 0 },
  });
});
