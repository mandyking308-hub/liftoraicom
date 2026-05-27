import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";
export type FeatureStatus = "captured" | "validated" | "in_roadmap" | "shipped" | "rejected";
export type TestimonialAskStatus = "pending_review" | "approved" | "requested" | "received" | "declined";
export type ReviewApproval = "pending" | "approved" | "sent" | "rejected";
export type ChurnStatus = "captured" | "in_recovery" | "lost" | "won_back";

export interface FeedbackRecord {
  id: string; business_name: string|null; source: string; channel: string|null;
  customer_label: string|null; sentiment: Sentiment; theme: string|null;
  summary: string; raw_excerpt: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface FeatureRequest {
  id: string; business_name: string|null; title: string; description: string|null;
  mention_count: number; customer_impact: string; status: FeatureStatus;
  recommended_next_step: string|null; requires_product_review: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface TestimonialCandidate {
  id: string; business_name: string|null; customer_label: string|null; quote: string;
  context: string|null; strength_score: number; ask_status: TestimonialAskStatus;
  requires_external_ask: boolean; founder_decision: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ReviewRequest {
  id: string; business_name: string|null; customer_label: string|null; channel: string;
  platform: string|null; draft_subject: string|null; draft_body: string;
  approval_status: ReviewApproval; requires_external_send: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface ChurnReason {
  id: string; business_name: string|null; customer_label: string|null;
  reason_category: string; primary_cause: string; detail: string|null;
  revenue_impact: number; currency: string; recoverable: boolean; status: ChurnStatus;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface PmfSignal {
  id: string; business_name: string|null; segment: string|null; signal_type: string;
  very_disappointed_pct: number|null; nps_score: number|null; sample_size: number;
  notes: string|null; watch: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface VocInsight {
  id: string; business_name: string|null; topic: string; insight: string;
  recommendation: string|null; confidence: number; source_count: number;
  founder_decision: string|null; applied: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function listFeedback(): Promise<FeedbackRecord[]> {
  const { data } = await sb.from("voc_feedback_records").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as FeedbackRecord[];
}
export async function listFeatureRequests(): Promise<FeatureRequest[]> {
  const { data } = await sb.from("voc_feature_requests").select("*").order("mention_count",{ascending:false}).limit(500);
  return (data ?? []) as FeatureRequest[];
}
export async function listTestimonials(): Promise<TestimonialCandidate[]> {
  const { data } = await sb.from("voc_testimonial_candidates").select("*").order("strength_score",{ascending:false}).limit(500);
  return (data ?? []) as TestimonialCandidate[];
}
export async function listReviewRequests(): Promise<ReviewRequest[]> {
  const { data } = await sb.from("voc_review_requests").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ReviewRequest[];
}
export async function listChurnReasons(): Promise<ChurnReason[]> {
  const { data } = await sb.from("voc_churn_reasons").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as ChurnReason[];
}
export async function listPmfSignals(): Promise<PmfSignal[]> {
  const { data } = await sb.from("voc_pmf_signals").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as PmfSignal[];
}
export async function listInsights(): Promise<VocInsight[]> {
  const { data } = await sb.from("voc_insights").select("*").order("confidence",{ascending:false}).limit(500);
  return (data ?? []) as VocInsight[];
}

export interface VocSummary {
  feedbackTotal: number;
  negativeCount: number;
  featureRequestsOpen: number;
  topFeatureMentions: number;
  testimonialsPending: number;
  reviewsPending: number;
  churnOpen: number;
  churnImpact: number;
  pmfWatch: number;
  insightsPending: number;
  watchItems: string[];
}

export async function summariseVoc(): Promise<VocSummary> {
  const [fb, fr, tc, rr, ch, pmf, ins] = await Promise.all([
    listFeedback(), listFeatureRequests(), listTestimonials(),
    listReviewRequests(), listChurnReasons(), listPmfSignals(), listInsights(),
  ]);
  const negativeCount = fb.filter(f => f.sentiment === "negative").length;
  const featureRequestsOpen = fr.filter(f => f.status === "captured" || f.status === "validated").length;
  const topFeatureMentions = fr.reduce((m,f)=>Math.max(m, f.mention_count||0), 0);
  const testimonialsPending = tc.filter(t => t.ask_status === "pending_review").length;
  const reviewsPending = rr.filter(r => r.approval_status === "pending").length;
  const churnOpen = ch.filter(c => c.status === "captured" || c.status === "in_recovery").length;
  const churnImpact = ch.filter(c => c.status !== "won_back").reduce((s,c)=>s + Number(c.revenue_impact||0), 0);
  const pmfWatch = pmf.filter(p => p.watch).length;
  const insightsPending = ins.filter(i => !i.founder_decision).length;

  const watch: string[] = [];
  if (negativeCount > 0) watch.push(`${negativeCount} negative feedback signal(s)`);
  if (testimonialsPending > 0) watch.push(`${testimonialsPending} testimonial candidate(s) awaiting approval`);
  if (reviewsPending > 0) watch.push(`${reviewsPending} review request draft(s) awaiting approval`);
  if (pmfWatch > 0) watch.push(`${pmfWatch} PMF segment(s) below threshold`);
  if (insightsPending > 0) watch.push(`${insightsPending} VoC insight(s) awaiting founder decision`);

  return {
    feedbackTotal: fb.length,
    negativeCount,
    featureRequestsOpen,
    topFeatureMentions,
    testimonialsPending,
    reviewsPending,
    churnOpen,
    churnImpact,
    pmfWatch,
    insightsPending,
    watchItems: watch,
  };
}

export function fmtMoney(n: number, ccy = "GBP") {
  try { return new Intl.NumberFormat("en-GB",{style:"currency",currency:ccy,maximumFractionDigits:0}).format(n||0); }
  catch { return `${ccy} ${Math.round(n||0)}`; }
}

export function sentimentTone(s: Sentiment): "ok"|"warn"|"bad"|"muted" {
  if (s === "positive") return "ok";
  if (s === "negative") return "bad";
  if (s === "mixed") return "warn";
  return "muted";
}