import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export function OLLayout({ title, subtitle, disclaimer, children }: { title: string; subtitle?: string; disclaimer?: string; children: ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-200/80 flex items-start gap-2">
        <AlertTriangle size={12} className="mt-0.5" />
        <span>{disclaimer ?? "Tracking only. No external sends, filings or advice. Founder/admin gated."}</span>
      </div>
      {children}
    </div>
  );
}

export function OLSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="text-xs space-y-2">{children}</CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    overdue: "bg-destructive/15 text-destructive border-destructive/30",
    blocked: "bg-destructive/15 text-destructive border-destructive/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    founder_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    review_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    in_progress: "bg-primary/15 text-primary border-primary/30",
    with_adviser: "bg-primary/15 text-primary border-primary/30",
    awaiting_response: "bg-primary/15 text-primary border-primary/30",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    ready: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    filed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    settled: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    released: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  const cls = map[status] ?? "bg-secondary text-muted-foreground border-border";
  return <Badge variant="outline" className={`text-[10px] ${cls}`}>{status.replaceAll("_"," ")}</Badge>;
}
