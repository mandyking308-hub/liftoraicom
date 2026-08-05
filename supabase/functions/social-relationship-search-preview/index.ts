import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import { activePauseScopes, capabilitySupported, getRelationshipAccount, getRelationshipPolicy, relationshipAudit } from "../_shared/socialRelationshipDb.ts";

const ALLOWED_CRITERIA = new Set([
  "api","category","keywords","network_distance","location","industry","company",
  "role","job_title","current_company","geography","url","limit","cursor",
]);

function sanitiseCriteria(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_CRITERIA.has(key)) continue;
    if (typeof value === "string") result[key] = value.trim().slice(0, 2000);
    else if (typeof value === "number" || typeof value === "boolean" || Array.isArray(value) || (value && typeof value === "object")) result[key] = value;
  }
  if (typeof result.url === "string") {
    try {
      const u = new URL(result.url);
      if (u.protocol !== "https:" || !u.hostname.toLowerCase().endsWith("linkedin.com")) delete result.url;
    } catch { delete result.url; }
  }
  return result;
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
  const blockers: string[] = [];
  const policy = await getRelationshipPolicy(auth.admin, businessId, account.provider, accountId);
  const pauses = await activePauseScopes(auth.admin, businessId, account.provider, accountId);
  if (account.platform !== "linkedin") blockers.push("profile_search_unsupported_for_platform");
  if (account.account_status !== "connected") blockers.push("account_not_connected");
  if (!account.real_account_confirmed) blockers.push("real_account_not_confirmed");
  if (!(await capabilitySupported(auth.admin, accountId, "profile_search"))) blockers.push("capability_unsupported:profile_search");
  if (pauses.length) blockers.push(...pauses.map((scope) => `pause:${scope}`));
  if (["test_only","paused"].includes(policy.mode)) blockers.push(`policy_mode:${policy.mode}`);
  if (!Object.keys(criteria).length) blockers.push("search_criteria_required");

  const preview = {
    business_id: businessId,
    account_id: accountId,
    provider: account.provider,
    platform: account.platform,
    search_name: String(body.search_name ?? "Social discovery search").slice(0, 160),
    criteria,
    policy_mode: policy.mode,
    blockers: [...new Set(blockers)],
    ready_to_approve: blockers.length === 0,
    no_provider_call: true,
  };
  await relationshipAudit(auth.admin, {
    business_id: businessId, provider: account.provider, account_id: accountId,
    actor_type: "founder", actor_id: auth.user.id,
    action: "social_search_preview", action_status: blockers.length ? "blocked" : "ready",
    blocker_codes: blockers, after_json: preview,
  });
  return json({ ok: true, preview, confirmation_phrase: "APPROVE AND RUN SOCIAL SEARCH" });
});
