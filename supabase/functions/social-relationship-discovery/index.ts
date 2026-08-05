import { corsHeaders, json, requireFounder, loadContext, audit } from "../_shared/socialRelationshipDb.ts";
import { getRelationshipAdapter } from "../_shared/socialRelationshipProvider.ts";
import { capabilityMap, actionSupported, scoreProfile, crmDedupeKey, resolvePause } from "../_shared/socialRelationshipLogic.ts";

const SEARCH_CONFIRMATION = "RUN APPROVED SOCIAL SEARCH";
const ALLOWED_CRITERIA = new Set(["keywords","job_title","company","industry","location","network_status","limit","job_titles","industries","locations","companies"]);
function sanitiseCriteria(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_CRITERIA.has(key)) continue;
    if (typeof raw === "string") output[key] = raw.trim().slice(0, 500);
    else if (typeof raw === "number") output[key] = key === "limit" ? Math.max(1, Math.min(50, raw)) : raw;
    else if (Array.isArray(raw)) output[key] = raw.map(String).map((item) => item.trim().slice(0, 200)).filter(Boolean).slice(0, 25);
  }
  return output;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "preview_search");

  if (action === "list_searches") {
    const { data } = await auth.admin.from("social_relationship_searches").select("*")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(50);
    return json({ ok: true, searches: data ?? [] });
  }
  if (!["preview_search","run_search"].includes(action)) return json({ ok: false, error: "unknown_action" }, 400);

  const account_id = String(body.account_id ?? "");
  const criteria = sanitiseCriteria(body.criteria);
  if (!account_id || !Object.keys(criteria).length) return json({ ok: false, error: "account_id_and_criteria_required" }, 400);
  const { data: account } = await auth.admin.from("social_relationship_accounts").select("*")
    .eq("id", account_id).eq("business_id", business_id).maybeSingle();
  if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
  const context = await loadContext(auth.admin, business_id, account.provider, account.id);
  const capabilities = capabilityMap((await auth.admin.from("social_relationship_capabilities")
    .select("capability,supported").eq("business_id", business_id).eq("account_id", account.id)).data ?? []);
  const support = actionSupported(capabilities, "sync_profile");
  const pause = resolvePause(context.pauses as any, { business_id, provider: account.provider, account_id: account.id });
  const blockers: string[] = [];
  if (!support.supported) blockers.push("capability_unsupported:profile_search");
  if (!context.connection?.last_test_ok || !context.connection?.credentials_present) blockers.push("provider_not_connected");
  if (account.account_status !== "ok") blockers.push(`account_status_${account.account_status}`);
  if (!account.real_account_declared && context.policy.require_real_account_declaration !== false) blockers.push("real_account_not_declared");
  if (pause.paused) blockers.push(`paused_${pause.scope ?? "unknown"}`);
  if (!["approval_required","approved_batch_autopilot"].includes(context.mode)) blockers.push(`policy_mode_${context.mode}`);

  const preview = {
    business_id, account_id, provider: account.provider, network: account.network,
    search_type: String(body.search_type ?? "people"), criteria,
    mode: context.mode, blockers: [...new Set(blockers)],
    ready: blockers.length === 0, no_provider_call: true,
  };
  if (action === "preview_search" || body.confirmation_phrase !== SEARCH_CONFIRMATION || blockers.length) {
    const { data: search } = await auth.admin.from("social_relationship_searches").insert({
      business_id, account_id: account.id, network: account.network,
      search_type: preview.search_type, criteria, status: blockers.length ? "blocked" : "previewed",
      blocked_reason: blockers.join(",") || null, created_by: auth.user.id,
    }).select("id").maybeSingle();
    await audit(auth.admin, {
      business_id, account_id: account.id, event: "discovery_preview",
      event_status: blockers.length ? "blocked" : "info", actor: "founder", actor_user_id: auth.user.id,
      detail: { blockers, criteria: Object.keys(criteria) },
    });
    return json({ ok: blockers.length === 0, preview, search_id: search?.id ?? null, confirmation_phrase: SEARCH_CONFIRMATION }, blockers.length ? 409 : 200);
  }

  const { data: search, error: searchError } = await auth.admin.from("social_relationship_searches").insert({
    business_id, account_id: account.id, network: account.network,
    search_type: preview.search_type, criteria, status: "running", created_by: auth.user.id,
  }).select("*").maybeSingle();
  if (searchError || !search) return json({ ok: false, error: "search_record_failed" }, 500);
  const adapter = getRelationshipAdapter(account.provider);
  const result = await adapter.searchProfiles(account.provider_account_id, account.network, criteria as any);
  if (!result.ok) {
    await auth.admin.from("social_relationship_searches").update({
      status: "failed", blocked_reason: String(result.error ?? "provider_error").slice(0, 300),
      provider_calls: result.provider_calls, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", search.id).eq("business_id", business_id);
    await audit(auth.admin, { business_id, account_id: account.id, event: "discovery_search", event_status: "failed", actor: "founder", actor_user_id: auth.user.id, provider: account.provider, provider_calls: result.provider_calls, detail: { error: result.error } });
    return json({ ok: false, error: result.error, http_status: result.http_status, search_id: search.id }, 502);
  }

  const stored: any[] = [];
  for (const profile of result.data ?? []) {
    const { score, reasons } = scoreProfile(profile, criteria as any);
    const patch = {
      business_id, network: account.network, provider_profile_id: profile.provider_profile_id,
      profile_url: profile.profile_url ?? null, full_name: profile.full_name ?? null,
      headline: profile.headline ?? null, job_title: profile.job_title ?? null,
      company_name: profile.company_name ?? null, industry: profile.industry ?? null,
      location: profile.location ?? null, relationship_status: profile.relationship_status ?? "unknown",
      source: "provider_search", source_search_id: search.id, provider_metadata: profile.raw ?? {},
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await auth.admin.from("social_relationship_profiles").select("id")
      .eq("business_id", business_id).eq("network", account.network)
      .eq("provider_profile_id", profile.provider_profile_id).maybeSingle();
    const id = existing
      ? (await auth.admin.from("social_relationship_profiles").update(patch).eq("id", existing.id).eq("business_id", business_id).select("id").maybeSingle()).data?.id
      : (await auth.admin.from("social_relationship_profiles").insert(patch).select("id").maybeSingle()).data?.id;
    if (id) stored.push({ id, ...patch, score, score_reasons: reasons, dedupe_key: crmDedupeKey(patch) });
  }
  await auth.admin.from("social_relationship_searches").update({
    status: "completed", results_count: stored.length, provider_calls: result.provider_calls,
    last_run_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", search.id).eq("business_id", business_id);
  await audit(auth.admin, { business_id, account_id: account.id, event: "discovery_search", actor: "founder", actor_user_id: auth.user.id, provider: account.provider, provider_calls: result.provider_calls, detail: { results: stored.length } });
  return json({ ok: true, search_id: search.id, results_count: stored.length, results: stored, no_action_taken: true });
});
