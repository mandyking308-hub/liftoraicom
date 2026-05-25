import { supabase } from "@/integrations/supabase/client";

export type SellerOpsSnapshot = {
  accounts_total: number;
  accounts_active: number;
  accounts_pending_activation: number;
  accounts_paused_or_suspended: number;
  accounts_offboarded: number;
  payouts_pending: number;
  payouts_blocked: number;
  payouts_verified: number;
  terms_pending: number;
  terms_accepted: number;
  perf_excellent: number;
  perf_healthy: number;
  perf_watch: number;
  perf_poor: number;
  perf_suspend_review: number;
  approval_queue: number;
  recommended_action: string;
  by_seller_status: Record<string, number>;
  by_payout_status: Record<string, number>;
};

export async function computeSellerOpsSnapshot(): Promise<SellerOpsSnapshot> {
  const sb: any = supabase as any;
  const [accounts, payouts, terms, perf] = await Promise.all([
    sb.from("seller_accounts").select("seller_status,terms_status,payout_status").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("seller_payout_profiles").select("payout_status,payout_risk_flags").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("seller_terms_acceptance").select("accepted").then((r: any) => r.data ?? []).catch(() => []),
    sb.from("seller_performance_metrics").select("performance_status,created_at").order("created_at", { ascending: false }).limit(500).then((r: any) => r.data ?? []).catch(() => []),
  ]);

  const by_seller_status: Record<string, number> = {};
  accounts.forEach((a: any) => { by_seller_status[a.seller_status] = (by_seller_status[a.seller_status] ?? 0) + 1; });
  const by_payout_status: Record<string, number> = {};
  payouts.forEach((p: any) => { by_payout_status[p.payout_status] = (by_payout_status[p.payout_status] ?? 0) + 1; });

  const latestBySeller: Record<string, any> = {};
  perf.forEach((p: any) => { if (!latestBySeller[p.seller_id ?? "anon"]) latestBySeller[p.seller_id ?? "anon"] = p; });
  const perfStatuses = Object.values(latestBySeller).map((p: any) => p.performance_status);

  const accounts_pending_activation = (by_seller_status["invited"] ?? 0) + (by_seller_status["applying"] ?? 0) + (by_seller_status["verified"] ?? 0);
  const accounts_paused_or_suspended = (by_seller_status["paused"] ?? 0) + (by_seller_status["suspended"] ?? 0);
  const payouts_blocked = (by_payout_status["blocked"] ?? 0) + (by_payout_status["suspended"] ?? 0);
  const terms_pending = terms.filter((t: any) => !t.accepted).length;
  const perf_suspend_review = perfStatuses.filter(s => s === "suspend_review").length;
  const perf_poor = perfStatuses.filter(s => s === "poor").length;

  const approval_queue = accounts_pending_activation + payouts_blocked + perf_suspend_review;

  let recommended_action = "Seller operations stable — keep onboarding pace steady.";
  if (accounts.length === 0) recommended_action = "No seller accounts yet — qualify prospects to begin onboarding.";
  else if (perf_suspend_review > 0) recommended_action = `${perf_suspend_review} sellers flagged for suspension review.`;
  else if (payouts_blocked > 0) recommended_action = `${payouts_blocked} payout profiles blocked — review before activation (approval required).`;
  else if (terms_pending > 0) recommended_action = `${terms_pending} sellers missing terms acceptance.`;
  else if (accounts_pending_activation > 0) recommended_action = `${accounts_pending_activation} sellers ready for founder activation review.`;

  return {
    accounts_total: accounts.length,
    accounts_active: by_seller_status["active"] ?? 0,
    accounts_pending_activation,
    accounts_paused_or_suspended,
    accounts_offboarded: by_seller_status["offboarded"] ?? 0,
    payouts_pending: by_payout_status["pending"] ?? 0,
    payouts_blocked,
    payouts_verified: by_payout_status["verified"] ?? 0,
    terms_pending,
    terms_accepted: terms.filter((t: any) => t.accepted).length,
    perf_excellent: perfStatuses.filter(s => s === "excellent").length,
    perf_healthy: perfStatuses.filter(s => s === "healthy").length,
    perf_watch: perfStatuses.filter(s => s === "watch").length,
    perf_poor,
    perf_suspend_review,
    approval_queue,
    recommended_action,
    by_seller_status,
    by_payout_status,
  };
}