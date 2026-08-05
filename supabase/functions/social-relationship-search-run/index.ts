import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import { activePauseScopes, capabilitySupported, getRelationshipAccount, getRelationshipPolicy, relationshipAudit } from "../_shared/socialRelationshipDb.ts";
import { providerAdapter } from "../_shared/socialRelationshipProvider.ts";

const CONFIRMATION = "APPROVE AND RUN SOCIAL SEARCH";
const ALLOWED_CRITERIA = new Set([
  "api","category","keywords","network_distance","location","industry","company",
  "role","job_title","current_company","geography","url","limit","cursor",
]);

function sanitiseCriteria(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_CRITERIA.has(key)) continue;
    output[key] = typeof value === "string" ? value.trim().slice(0, 2000) : value;
  }
  if (typeof output.url === "string") {
    try {
      const url = new URL(output.url);
      if (url.protocol !== "https:" || !url.hostname.toLowerCase().endsWith("linkedin.com")) delete output.url;
    } catch { delete output.url; }
  }
  const requested = Number(output.limit ?? 25);
  output.limit = Number.isFinite(requested) ? Math.max(1, Math.min(50, requested)) : 25;
  return output;
}

function relation(value: string | null | undefined): string {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("pending")) return "invitation_pending";
  if (v.includes("connected") || v.includes("distance_1") || v === "1") return "connected";
  if (v.includes("follow")) return "following";
  if (v.includes("block")) return "blocked";
  if (v) return "not_connected";
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const businessId = String(body.business_id ?? "");
  const accountId = String(body.account_id ?? "");
  if (!businessId || !accountId) return json({ ok: false, error: "business_id_and_account_id_required" }, 400);

  const account = await getRelationshipAccount(auth.admin, accountId);
  if (!account) return json({ ok: false, error: "account_not_found" }, 404);
  const criteria = sanitiseCriteria(body.criteria);
  const policy = await getRelationshipPolicy(auth.admin, businessId, account.provider, accountId);
  const pauses = await activePauseScopes(auth.admin, businessId, account.provider, accountId);
  const blockers: string[] = [];
  if (body.confirmation_phrase !== CONFIRMATION) blockers.push("confirmation_required");
  if (account.platform !== "linkedin") blockers.push("profile_search_unsupported_for_platform");
  if (account.account_status !== "connected") blockers.push("account_not_connected");
  if (!account.real_account_confirmed) blockers.push("real_account_not_confirmed");
  if (!account.execution_enabled) blockers.push("account_execution_disabled");
  if (!(await capabilitySupported(auth.admin, accountId, "profile_search"))) blockers.push("capability_unsupported:profile_search");
  if (pauses.length) blockers.push(...pauses.map((scope) => `pause:${scope}`));
  if (!(["approval_required","approved_batch_autopilot"] as string[]).includes(policy.mode)) blockers.push(`policy_mode:${policy.mode}`);
  if (!Object.keys(criteria).length) blockers.push("search_criteria_required");

  if (blockers.length) {
    await relationshipAudit(auth.admin, {
      business_id: businessId, provider: account.provider, account_id: accountId,
      actor_type: "founder", actor_id: auth.user.id,
      action: "social_search_run", action_status: "blocked", blocker_codes: blockers,
    });
    return json({ ok: false, error: "search_blocked", blockers: [...new Set(blockers)], confirmation_phrase: CONFIRMATION }, 409);
  }

  const now = new Date().toISOString();
  const { data: search, error: createError } = await auth.admin.from("social_relationship_searches").insert({
    business_id: businessId,
    provider: account.provider,
    platform: account.platform,
    account_id: accountId,
    search_name: String(body.search_name ?? "Approved social discovery search").slice(0, 160),
    search_status: "running",
    criteria_json: criteria,
    external_search_allowed: true,
    approval_status: "approved",
    approved_by: auth.user.id,
    approved_at: now,
  }).select("*").maybeSingle();
  if (createError || !search) return json({ ok: false, error: "search_record_create_failed", detail: createError?.message }, 500);

  const adapter = providerAdapter(account.provider);
  if (!adapter) return json({ ok: false, error: "provider_unsupported" }, 400);
  const result = await adapter.searchProfiles(account.external_account_id, account.platform, criteria);
  if (!result.ok) {
    await auth.admin.from("social_relationship_searches").update({
      search_status: "failed", last_error: result.errorCode ?? result.errorMessage, updated_at: new Date().toISOString(),
    }).eq("id", search.id);
    await relationshipAudit(auth.admin, {
      business_id: businessId, provider: account.provider, account_id: accountId,
      actor_type: "founder", actor_id: auth.user.id,
      action: "social_search_run", action_status: "failed", entity_type: "search", entity_id: search.id,
      provider_response_summary: { status: result.status, error_code: result.errorCode ?? null },
    });
    return json({ ok: false, error: result.errorCode ?? "provider_search_failed", message: result.errorMessage, search_id: search.id }, result.status >= 400 ? result.status : 502);
  }

  const profiles = result.data ?? [];
  const rows = profiles.map((profile) => ({
    business_id: businessId,
    provider: account.provider,
    platform: account.platform,
    account_id: accountId,
    external_profile_id: profile.providerId,
    public_identifier: profile.publicIdentifier,
    profile_url: profile.profileUrl,
    first_name: profile.firstName,
    last_name: profile.lastName,
    full_name: profile.fullName,
    headline: profile.headline,
    current_company: profile.currentCompany,
    job_title: profile.jobTitle,
    geography: profile.geography,
    industry: profile.industry,
    relationship_status: relation(profile.relationshipStatus),
    source_type: "provider_search",
    source_search_id: search.id,
    source_provenance: { provider: account.provider, platform: account.platform, search_id: search.id },
    profile_snapshot: {
      public_identifier: profile.publicIdentifier,
      headline: profile.headline,
      current_company: profile.currentCompany,
      relationship_status: profile.relationshipStatus,
    },
    risk_status: "unreviewed",
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  let persisted: any[] = [];
  if (rows.length) {
    const upsert = await auth.admin.from("social_relationship_profiles")
      .upsert(rows, { onConflict: "business_id,provider,external_profile_id" })
      .select("id,full_name,headline,current_company,job_title,geography,profile_url,relationship_status,risk_status");
    if (upsert.error) {
      await auth.admin.from("social_relationship_searches").update({ search_status: "failed", last_error: upsert.error.message, updated_at: new Date().toISOString() }).eq("id", search.id);
      return json({ ok: false, error: "profile_persist_failed", detail: upsert.error.message }, 500);
    }
    persisted = upsert.data ?? [];
  }

  await auth.admin.from("social_relationship_searches").update({
    search_status: "completed", result_count: persisted.length, last_error: null, updated_at: new Date().toISOString(),
  }).eq("id", search.id);
  await relationshipAudit(auth.admin, {
    business_id: businessId, provider: account.provider, account_id: accountId,
    actor_type: "founder", actor_id: auth.user.id,
    action: "social_search_run", action_status: "completed", entity_type: "search", entity_id: search.id,
    after_json: { result_count: persisted.length },
  });
  return json({ ok: true, search_id: search.id, result_count: persisted.length, profiles: persisted, outreach_started: false });
});
