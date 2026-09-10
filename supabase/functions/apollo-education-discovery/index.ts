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
//  - writes go ONLY to relationship_intelligence_contacts (research candidates)
//  - never promotes to CRM, never queues or sends outreach
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
const MAX_CANDIDATES_PER_ACCOUNT = 3;

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
  const perAccount = Math.min(Math.max(1, body.candidates_per_account ?? 3), MAX_CANDIDATES_PER_ACCOUNT);

  let query = admin
    .from("strategic_target_accounts")
    .select("id, account_name, account_domain, geography, account_type, metadata")
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
        writes_to: "relationship_intelligence_contacts",
      })),
      note: "Plan only — no Apollo request was made. Free People Search costs no credits; this run performs no reveal, no phone lookup and no outreach.",
    });
  }

  const apiKey = Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) return json({ error: "apollo_api_key_missing" }, 400);

  const results: Array<Record<string, unknown>> = [];
  let providerCalls = 0;
  let candidatesWritten = 0;

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

    for (let rank = 0; rank < scored.length; rank++) {
      const c = scored[rank];
      const p = c.person as Record<string, any>;
      const apolloId = String(p.id ?? "");
      if (!apolloId) continue;

      const row = {
        full_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || String(p.name ?? "Unknown"),
        role_title: c.title || null,
        organisation_name: account.account_name,
        source: "apollo_free_search",
        relationship_type: "school_education_contact",
        education_group_id: String((account.metadata as any)?.education_group_id ?? ""),
        strategic_target_account_id: account.id,
        apollo_org_id: String(p.organization_id ?? "") || null,
        education_role_family: c.score.role_family,
        education_role_score: c.score.score,
        research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY,
        reveal_status: "not_revealed",
        notes: `Rank ${rank + 1}. ${c.score.reasons.join("; ")}`,
        metadata: {
          apollo_person_id: apolloId,
          rank: rank + 1,
          score_reasons: c.score.reasons,
          score_penalties: c.score.penalties,
          group_scope: c.score.group_scope,
          buying_authority: c.score.buying_authority,
          discovery_mode: "free_search_only",
        },
      };

      const { data: existing } = await admin
        .from("relationship_intelligence_contacts")
        .select("id")
        .eq("strategic_target_account_id", account.id)
        .contains("metadata", { apollo_person_id: apolloId })
        .maybeSingle();

      if (existing?.id) {
        // Never overwrite a verified email — this path holds no email at all.
        const { error } = await admin.from("relationship_intelligence_contacts")
          .update({
            role_title: row.role_title,
            education_role_family: row.education_role_family,
            education_role_score: row.education_role_score,
            notes: row.notes,
          })
          .eq("id", existing.id);
        if (!error) candidatesWritten++;
      } else {
        const { error } = await admin.from("relationship_intelligence_contacts").insert(row);
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
    candidates_written: candidatesWritten,
    results,
    side_effects: { crm_promotions: 0, emails_sent: 0, outreach_queue_rows: 0, paid_reveals: 0 },
  });
});
