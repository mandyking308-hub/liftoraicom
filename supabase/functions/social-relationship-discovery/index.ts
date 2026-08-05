import { corsHeaders, json, requireFounder, loadContext, audit } from "../_shared/socialRelationshipDb.ts";
import { getRelationshipAdapter } from "../_shared/socialRelationshipProvider.ts";
import {
  capabilityMap,
  actionSupported,
  confirmationAccepted,
  externalCallsAllowed,
  scoreProfile,
  crmDedupeKey,
} from "../_shared/socialRelationshipLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req);
  if ("error" in a) return a.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const business_id = String(body.business_id ?? "");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const action = String(body.action ?? "run_search");
  const ctx = await loadContext(a.admin, business_id);

  if (action === "list_searches") {
    const { data } = await a.admin
      .from("social_relationship_searches").select("*").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(50);
    return json({ ok: true, searches: data ?? [] });
  }

  if (action !== "run_search") return json({ ok: false, error: "unknown_action" }, 400);

  if (!confirmationAccepted(body.confirmation)) {
    return json({ ok: false, error: "confirmation_required", required_phrase: "SEND FOR REAL", blocked: true }, 400);
  }
  const account_id = String(body.account_id ?? "");
  const criteria = body.criteria ?? {};
  const { data: account } = await a.admin
    .from("social_relationship_accounts").select("*").eq("id", account_id).eq("business_id", business_id).maybeSingle();
  if (!account) return json({ ok: false, error: "account_not_found" }, 404);

  const caps = capabilityMap(
    (await a.admin
      .from("social_relationship_capabilities")
      .select("capability, supported")
      .eq("business_id", business_id)
      .eq("account_id", account.id)).data ?? [],
  );
  // Discovery needs a real profile_search capability — never simulate it.
  const supported = { supported: caps.profile_search === true, reason: "profile_search_unsupported" };

  const { data: search } = await a.admin
    .from("social_relationship_searches")
    .insert({
      business_id, account_id: account.id, network: account.network,
      search_type: String(body.search_type ?? "people"), criteria,
      status: "running", created_by: a.user.id,
    })
    .select("*").maybeSingle();

  const blockers: string[] = [];
  if (!supported.supported) blockers.push("capability_unsupported:profile_search");
  if (!externalCallsAllowed(ctx.mode)) blockers.push(`mode_blocks_external_calls:${ctx.mode}`);
  if (!ctx.connection?.last_test_ok) blockers.push("provider_not_connected");
  const paused = ctx.pauses.some((p: any) => p.is_paused && (p.scope === "global" || p.business_id === business_id));
  if (paused) blockers.push("paused");

  if (blockers.length) {
    await a.admin.from("social_relationship_searches")
      .update({ status: "blocked", blocked_reason: blockers.join(","), last_run_at: new Date().toISOString() })
      .eq("id", search!.id);
    await audit(a.admin, { business_id, account_id: account.id, event: "discovery_search", event_status: "blocked", actor: "founder", actor_user_id: a.user.id, detail: { blockers } });
    return json({ ok: false, blocked: true, blockers, search_id: search!.id, results: [] });
  }

  const adapter = getRelationshipAdapter(account.provider);
  const r = await adapter.searchProfiles(account.provider_account_id, account.network, criteria);
  if (!r.ok) {
    await a.admin.from("social_relationship_searches")
      .update({ status: "failed", blocked_reason: (r.error ?? "provider_error").slice(0, 300), provider_calls: r.provider_calls, last_run_at: new Date().toISOString() })
      .eq("id", search!.id);
    await audit(a.admin, { business_id, account_id: account.id, event: "discovery_search", event_status: "failed", actor: "founder", actor_user_id: a.user.id, provider: account.provider, provider_calls: r.provider_calls, detail: { error: r.error } });
    return json({ ok: false, error: r.error, http_status: r.http_status, search_id: search!.id }, 502);
  }

  const stored: any[] = [];
  for (const p of r.data ?? []) {
    const { score, reasons } = scoreProfile(p, criteria);
    const { data: existing } = await a.admin
      .from("social_relationship_profiles").select("id")
      .eq("business_id", business_id).eq("network", account.network)
      .eq("provider_profile_id", p.provider_profile_id).maybeSingle();
    const patch = {
      business_id, network: account.network, provider_profile_id: p.provider_profile_id,
      profile_url: p.profile_url ?? null, full_name: p.full_name ?? null, headline: p.headline ?? null,
      job_title: p.job_title ?? null, company_name: p.company_name ?? null, industry: p.industry ?? null,
      location: p.location ?? null, relationship_status: p.relationship_status ?? "unknown",
      source: "search", source_search_id: search!.id, provider_metadata: p.raw ?? {},
    };
    const id = existing
      ? ((await a.admin.from("social_relationship_profiles").update(patch).eq("id", existing.id).select("id").maybeSingle()).data?.id)
      : ((await a.admin.from("social_relationship_profiles").insert(patch).select("id").maybeSingle()).data?.id);
    stored.push({ id, ...patch, score, score_reasons: reasons, dedupe_key: crmDedupeKey(patch) });
  }

  await a.admin.from("social_relationship_searches")
    .update({ status: "completed", results_count: stored.length, provider_calls: r.provider_calls, last_run_at: new Date().toISOString() })
    .eq("id", search!.id);
  await audit(a.admin, { business_id, account_id: account.id, event: "discovery_search", actor: "founder", actor_user_id: a.user.id, provider: account.provider, provider_calls: r.provider_calls, detail: { results: stored.length } });

  return json({ ok: true, search_id: search!.id, results_count: stored.length, results: stored, no_action_taken: true });
});
