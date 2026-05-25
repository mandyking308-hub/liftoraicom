import { supabase } from "@/integrations/supabase/client";

export type MarketplaceSnapshot = {
  marketplaces: number;
  active_marketplaces: number;
  prospects_total: number;
  prospects_new: number;
  prospects_qualified: number;
  prospects_approval_required: number;
  prospects_invited: number;
  prospects_onboarded: number;
  onboarding_in_progress: number;
  onboarding_blocked: number;
  verifications_pending: number;
  verifications_failed: number;
  listings_draft: number;
  listings_approval_required: number;
  listings_published: number;
  supply_gap_alerts: number;
  demand_gap_alerts: number;
  recommended_action: string;
  by_qualification: Record<string, number>;
  by_listing_status: Record<string, number>;
};

export async function computeMarketplaceSnapshot(): Promise<MarketplaceSnapshot> {
  const sb: any = supabase as any;
  const [profiles, prospects, onboarding, checks, listings, snapshots] = await Promise.all([
    sb.from("marketplace_profiles").select("id,active").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("seller_prospects").select("qualification_status,founder_approval_required").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("seller_onboarding_records").select("onboarding_status,payout_setup_status,listing_setup_status").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("seller_verification_checks").select("check_status").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("marketplace_listings").select("listing_status").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("marketplace_supply_demand_snapshots").select("supply_gap_score,demand_gap_score,recommended_action,created_at").order("created_at", { ascending: false }).limit(50).then((r: any) => r.data ?? []).catch(() => []),
  ]);

  const by_qualification: Record<string, number> = {};
  prospects.forEach((p: any) => { by_qualification[p.qualification_status] = (by_qualification[p.qualification_status] ?? 0) + 1; });
  const by_listing_status: Record<string, number> = {};
  listings.forEach((l: any) => { by_listing_status[l.listing_status] = (by_listing_status[l.listing_status] ?? 0) + 1; });

  const supply_gap_alerts = snapshots.filter((s: any) => Number(s.supply_gap_score ?? 0) >= 0.5).length;
  const demand_gap_alerts = snapshots.filter((s: any) => Number(s.demand_gap_score ?? 0) >= 0.5).length;

  const prospects_total = prospects.length;
  const prospects_qualified = by_qualification["qualified"] ?? 0;
  const prospects_approval_required = by_qualification["approval_required"] ?? 0;
  const onboarding_in_progress = onboarding.filter((o: any) =>
    ["invited", "application_received", "verifying", "incomplete"].includes(o.onboarding_status),
  ).length;
  const onboarding_blocked = onboarding.filter((o: any) =>
    o.payout_setup_status === "blocked" || o.onboarding_status === "rejected",
  ).length;
  const listings_approval_required = by_listing_status["approval_required"] ?? 0;

  let recommended_action = "Marketplace healthy — recruit selectively to close supply gaps.";
  if (profiles.length === 0) recommended_action = "Set up a marketplace profile to enable supply-side engine.";
  else if (supply_gap_alerts > 0) recommended_action = `${supply_gap_alerts} category/location with supply gap — prepare recruitment targets (approval required).`;
  else if (listings_approval_required > 0) recommended_action = `${listings_approval_required} listings awaiting approval — review before publishing.`;
  else if (prospects_approval_required > 0) recommended_action = `${prospects_approval_required} prospects ready — review outreach drafts.`;
  else if (onboarding_blocked > 0) recommended_action = `${onboarding_blocked} sellers blocked — review verification or payout setup.`;

  return {
    marketplaces: profiles.length,
    active_marketplaces: profiles.filter((p: any) => p.active).length,
    prospects_total,
    prospects_new: by_qualification["new"] ?? 0,
    prospects_qualified,
    prospects_approval_required,
    prospects_invited: by_qualification["invited"] ?? 0,
    prospects_onboarded: by_qualification["onboarded"] ?? 0,
    onboarding_in_progress,
    onboarding_blocked,
    verifications_pending: checks.filter((c: any) => c.check_status === "pending" || c.check_status === "needs_review").length,
    verifications_failed: checks.filter((c: any) => c.check_status === "failed" || c.check_status === "expired").length,
    listings_draft: by_listing_status["draft"] ?? 0,
    listings_approval_required,
    listings_published: by_listing_status["published"] ?? 0,
    supply_gap_alerts,
    demand_gap_alerts,
    recommended_action,
    by_qualification,
    by_listing_status,
  };
}