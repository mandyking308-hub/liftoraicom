import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { VIRAL_SAFETY_FLAGS, emptyStateReasons, resolveProviderStatus } from "../_shared/socialViralLogic.ts";
import { getViralProvider } from "../_shared/socialViralProvider.ts";

async function count(ad: any, table: string, business_id?: string, extra?: (q: any) => any) {
  let q = ad.from(table).select("id", { count: "exact", head: true });
  if (business_id) q = q.eq("business_id", business_id);
  if (extra) q = extra(q);
  const { count: c } = await q;
  return c ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id") ?? undefined;
  if (!business_id && req.method === "POST") {
    try { const b = await req.json(); business_id = b.business_id; } catch { /* */ }
  }
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const ad = a.admin as any;

  const [
    watchlists_total, watchlists_active,
    signals_total, signals_new,
    opportunities_total, opportunities_needing_review, opportunities_approved,
    briefs_total, briefs_awaiting_approval, briefs_linked,
    runs_total,
  ] = await Promise.all([
    count(ad, "social_viral_watchlists", business_id),
    count(ad, "social_viral_watchlists", business_id, q => q.eq("watchlist_status", "active")),
    count(ad, "social_viral_signals", business_id),
    count(ad, "social_viral_signals", business_id, q => q.eq("signal_status", "new")),
    count(ad, "social_viral_opportunities", business_id),
    count(ad, "social_viral_opportunities", business_id, q => q.eq("opportunity_status", "needs_review")),
    count(ad, "social_viral_opportunities", business_id, q => q.eq("opportunity_status", "approved")),
    count(ad, "social_viral_content_briefs", business_id),
    count(ad, "social_viral_content_briefs", business_id, q => q.eq("brief_status", "awaiting_founder_approval")),
    count(ad, "social_viral_content_briefs", business_id, q => q.eq("brief_status", "linked_to_content")),
    count(ad, "social_viral_sync_runs", business_id),
  ]);

  const { data: conn } = await ad.from("social_viral_provider_connections")
    .select("*").eq("business_id", business_id).order("created_at", { ascending: true });

  const providers = (conn ?? []).map((c: any) => {
    const p = getViralProvider(c.provider_slug);
    const resolved = resolveProviderStatus({
      configured: p.isConfigured(),
      contract_confirmed: (p as any).contractConfirmed ? (p as any).contractConfirmed() : true,
      last_successful_sync_at: c.last_successful_sync_at,
      consecutive_failures: c.consecutive_failures,
      paused: c.connection_status === "paused",
      manual_mode: c.provider_slug === "manual_import",
    });
    return {
      provider_slug: c.provider_slug,
      display_name: c.display_name,
      stored_status: c.connection_status,
      resolved_status: resolved.status,
      reason: resolved.reason,
      is_live: resolved.is_live,
      capability_verification: c.capability_verification,
      last_successful_sync_at: c.last_successful_sync_at,
    };
  });

  const { count: routes } = await ad.from("social_viral_watchlists")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business_id).not("conversion_route", "is", null);

  const primary = providers.find((p: any) => p.is_live) ?? providers[0];

  return json({
    ok: true,
    business_id,
    watchlists_total, watchlists_active,
    signals_total, signals_new,
    opportunities_total, opportunities_needing_review, opportunities_approved,
    briefs_total, briefs_awaiting_approval, briefs_linked,
    runs_total,
    providers,
    provider_status: primary?.resolved_status ?? "not_configured",
    any_provider_live: providers.some((p: any) => p.is_live),
    empty_state_reasons: emptyStateReasons({
      provider_status: (primary?.resolved_status ?? "not_configured") as any,
      watchlists: watchlists_total,
      signals: signals_total,
      opportunities: opportunities_total,
      approved_opportunities: opportunities_approved,
      conversion_routes: routes ?? 0,
    }),
    provider_calls_total: 0,
    scraped_pages_total: 0,
    no_external_action: true,
    ...VIRAL_SAFETY_FLAGS,
  });
});