import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeSnapshot {
  total_sources: number;
  active_sources: number;
  founder_approved_sources: number;
  untrusted_sources: number;
  stale_sources: number;
  expired_sources: number;
  conflicts_open: number;
  conflicts_founder_review: number;
  conflicts_resolved: number;
  claims_total: number;
  claims_founder_approved: number;
  claims_draft: number;
  claims_prohibited: number;
  by_trust: Record<string, number>;
  by_type: Record<string, number>;
  completeness_score: number;
  recommended_action: string;
}

const STALE_DAYS = 90;

export async function computeKnowledgeSnapshot(): Promise<KnowledgeSnapshot> {
  const sb: any = supabase as any;
  const [sRes, cRes, kRes] = await Promise.all([
    sb.from("knowledge_sources").select("id,source_type,trust_level,active,last_verified_at,expires_at"),
    sb.from("knowledge_conflicts").select("id,resolution_status,severity"),
    sb.from("approved_claims").select("id,approval_status"),
  ]);
  const sources = sRes.data ?? [];
  const conflicts = cRes.data ?? [];
  const claims = kRes.data ?? [];

  const now = Date.now();
  const staleCutoff = now - STALE_DAYS * 86400000;

  const by_trust: Record<string, number> = {};
  const by_type: Record<string, number> = {};
  sources.forEach((s: any) => {
    by_trust[s.trust_level] = (by_trust[s.trust_level] ?? 0) + 1;
    by_type[s.source_type] = (by_type[s.source_type] ?? 0) + 1;
  });

  const active_sources = sources.filter((s: any) => s.active).length;
  const founder_approved_sources = sources.filter((s: any) => s.trust_level === "founder_approved" && s.active).length;
  const untrusted_sources = sources.filter((s: any) => s.trust_level === "untrusted" && s.active).length;
  const stale_sources = sources.filter((s: any) => s.active && (!s.last_verified_at || new Date(s.last_verified_at).getTime() < staleCutoff)).length;
  const expired_sources = sources.filter((s: any) => s.active && s.expires_at && new Date(s.expires_at).getTime() < now).length;

  const conflicts_open = conflicts.filter((c: any) => c.resolution_status === "open").length;
  const conflicts_founder_review = conflicts.filter((c: any) => c.resolution_status === "founder_review").length;
  const conflicts_resolved = conflicts.filter((c: any) => c.resolution_status === "resolved").length;

  const claims_founder_approved = claims.filter((c: any) => c.approval_status === "founder_approved").length;
  const claims_draft = claims.filter((c: any) => c.approval_status === "draft").length;
  const claims_prohibited = claims.filter((c: any) => c.approval_status === "prohibited").length;

  // Completeness: ratio of founder-approved sources & resolved conflicts, penalised by stale/untrusted
  const base = active_sources === 0 ? 0 : (founder_approved_sources / active_sources) * 60;
  const conflictPenalty = (conflicts_open + conflicts_founder_review) * 4;
  const stalePenalty = (stale_sources + expired_sources) * 2;
  const untrustedPenalty = untrusted_sources * 3;
  const claimsBoost = claims_founder_approved > 0 ? 40 : claims_draft > 0 ? 20 : 0;
  const completeness_score = Math.max(0, Math.min(100, Math.round(base + claimsBoost - conflictPenalty - stalePenalty - untrustedPenalty)));

  let recommended_action = "Knowledge base looks aligned. Nothing critical to review.";
  if (conflicts_founder_review > 0) recommended_action = `${conflicts_founder_review} conflict(s) awaiting founder review.`;
  else if (untrusted_sources > 0) recommended_action = `${untrusted_sources} untrusted source(s) active — review trust level before allowing into sales/voice.`;
  else if (expired_sources > 0) recommended_action = `${expired_sources} source(s) past expiry — re-verify or retire.`;
  else if (conflicts_open > 0) recommended_action = `${conflicts_open} open conflict(s) — agent will draft resolution summary.`;
  else if (stale_sources > 0) recommended_action = `${stale_sources} source(s) not verified in ${STALE_DAYS} days.`;
  else if (claims_draft > 0) recommended_action = `${claims_draft} approved-claim draft(s) — founder approval needed before use.`;
  else if (active_sources === 0) recommended_action = `No active knowledge sources — onboard manuals, pricing sheets and policies.`;

  return {
    total_sources: sources.length,
    active_sources,
    founder_approved_sources,
    untrusted_sources,
    stale_sources,
    expired_sources,
    conflicts_open,
    conflicts_founder_review,
    conflicts_resolved,
    claims_total: claims.length,
    claims_founder_approved,
    claims_draft,
    claims_prohibited,
    by_trust,
    by_type,
    completeness_score,
    recommended_action,
  };
}

export const TRUST_TONE: Record<string, string> = {
  untrusted: "bg-red-500/15 text-red-400 border-red-500/30",
  low: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  founder_approved: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  manual: "Manual",
  website: "Website",
  uploaded_file: "Uploaded file",
  founder_note: "Founder note",
  pricing_sheet: "Pricing sheet",
  policy: "Policy",
  product_sheet: "Product sheet",
  transcript: "Transcript",
  email: "Email",
  external: "External",
};

export const CONFLICT_STATUS_TONE: Record<string, string> = {
  open: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  founder_review: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ignored: "bg-muted text-muted-foreground border-border/50",
};

export const CONFLICT_SEVERITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/50",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const CLAIM_STATUS_TONE: Record<string, string> = {
  draft: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  founder_approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  retired: "bg-muted text-muted-foreground border-border/50",
  prohibited: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const CLAIM_TYPE_LABEL: Record<string, string> = {
  benefit: "Benefit",
  result: "Result",
  guarantee: "Guarantee",
  price: "Price",
  feature: "Feature",
  compliance: "Compliance",
  proof: "Proof",
  case_study: "Case study",
};

export const CONFLICT_TYPE_LABEL: Record<string, string> = {
  pricing: "Pricing",
  product_claim: "Product claim",
  policy: "Policy",
  legal: "Legal",
  technical: "Technical",
  brand: "Brand",
  customer_info: "Customer info",
  other: "Other",
};