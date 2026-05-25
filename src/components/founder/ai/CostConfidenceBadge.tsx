import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity, HelpCircle } from "lucide-react";

export type CostBasis =
  | "actual_tokens"
  | "provider_reported"
  | "streaming_estimate"
  | "manual_estimate"
  | "pricing_missing"
  | "live"
  | "estimated"
  | "unknown";

export type PricingConfidence = "verified" | "estimated" | "unknown";

export interface CostConfidenceBadgeProps {
  cost_basis?: string | null;
  actual_cost_gbp?: number | null;
  estimated_cost?: number | null;
  pricing_confidence?: PricingConfidence | null;
  pricing_missing?: boolean;
  className?: string;
  size?: "xs" | "sm";
}

/**
 * Renders a clear, honest label for how a cost figure was derived.
 * Never pretends an estimate is verified.
 */
export default function CostConfidenceBadge({
  cost_basis,
  actual_cost_gbp,
  estimated_cost,
  pricing_confidence,
  pricing_missing,
  className,
  size = "xs",
}: CostConfidenceBadgeProps) {
  const basis = String(cost_basis ?? "").toLowerCase();
  const hasActual = actual_cost_gbp != null && Number(actual_cost_gbp) > 0;
  const hasEstimate = estimated_cost != null && Number(estimated_cost) > 0;

  let label: string;
  let tone: string;
  let Icon = Activity;

  if (pricing_missing || basis === "pricing_missing") {
    label = "Pricing missing";
    tone = "bg-destructive/10 text-destructive border-destructive/30";
    Icon = ShieldAlert;
  } else if (basis === "actual_tokens" || (hasActual && (basis === "live" || basis === ""))) {
    label =
      pricing_confidence === "verified"
        ? "Actual · verified pricing"
        : "Actual tokens · estimated pricing";
    tone =
      pricing_confidence === "verified"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        : "bg-amber-500/10 text-amber-400 border-amber-500/30";
    Icon = pricing_confidence === "verified" ? ShieldCheck : AlertTriangle;
  } else if (basis === "provider_reported") {
    label = "Provider-reported";
    tone = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    Icon = ShieldCheck;
  } else if (basis === "streaming_estimate") {
    label = "Streaming estimate";
    tone = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    Icon = AlertTriangle;
  } else if (basis === "manual_estimate" || basis === "estimated") {
    label = "Manual estimate";
    tone = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    Icon = AlertTriangle;
  } else if (hasActual) {
    label =
      pricing_confidence === "verified"
        ? "Actual · verified pricing"
        : "Actual · estimated pricing";
    tone =
      pricing_confidence === "verified"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        : "bg-amber-500/10 text-amber-400 border-amber-500/30";
    Icon = pricing_confidence === "verified" ? ShieldCheck : AlertTriangle;
  } else if (hasEstimate) {
    label = "Estimated";
    tone = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    Icon = AlertTriangle;
  } else {
    label = "Unknown basis";
    tone = "bg-muted text-muted-foreground border-border";
    Icon = HelpCircle;
  }

  const sz = size === "sm" ? "text-xs px-2 py-0.5" : "text-[10px] px-1.5 py-0";
  return (
    <Badge variant="outline" className={cn(tone, sz, "gap-1 whitespace-nowrap", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}