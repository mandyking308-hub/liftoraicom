import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowLeft, Lock } from "lucide-react";
import {
  ARCHETYPE_META, METRIC_CATEGORY_META, METRIC_STATUS_META,
  type MetricCategory, type MetricStatus,
} from "@/lib/exitMetricsEngine";

export const EXIT_NAV = [
  { to: "/founder/exit-metrics",            label: "Overview" },
  { to: "/founder/exit-metrics/businesses", label: "Businesses" },
  { to: "/founder/exit-metrics/archetypes", label: "Archetypes" },
  { to: "/founder/exit-metrics/readiness",  label: "Readiness" },
  { to: "/founder/exit-metrics/buyer-fit",  label: "Buyer fit" },
  { to: "/founder/exit-metrics/data-room",  label: "Data room" },
];

export function ExitLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Business-Type Exit Metrics Engine</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> Buyer / data-room sharing gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {EXIT_NAV.map(n => (
              <Link key={n.to} to={n.to}
                className={`shrink-0 px-2 py-1 rounded border transition ${pathname === n.to ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {n.label}
              </Link>
            ))}
          </div>
        </Card>
        {children}
      </div>
    </div>
  );
}

export function ExitSection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ExitStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="tech-card">
      <CardContent className="p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function ArchetypeBadge({ code }: { code: string }) {
  const m = ARCHETYPE_META[code] ?? ARCHETYPE_META.other;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function CategoryBadge({ c }: { c: MetricCategory }) {
  const m = METRIC_CATEGORY_META[c] ?? METRIC_CATEGORY_META.other;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function StatusBadge({ s }: { s: MetricStatus }) {
  const m = METRIC_STATUS_META[s] ?? METRIC_STATUS_META.missing;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

export function ScoreBar({ value }: { value: number | null }) {
  const v = Math.max(0, Math.min(100, Number(value ?? 0)));
  const cls = v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-blue-500" : v >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded bg-border/40 overflow-hidden">
        <div className={`h-full ${cls}`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-[11px] font-mono w-8 text-right">{value == null ? "—" : `${v}`}</span>
    </div>
  );
}

export function shortId(id: string | null | undefined, n = 6) {
  if (!id) return "—";
  return id.slice(0, n);
}

export async function fetchBusinesses(): Promise<Array<{ id: string | null; name: string; archetype: string | null }>> {
  const { supabase } = await import("@/integrations/supabase/client");
  const sb: any = supabase as any;
  try {
    const { data } = await sb.from("businesses").select("id,name,archetype");
    return (data ?? []).map((b: any) => ({ id: b.id, name: b.name ?? "—", archetype: (b.archetype ?? null) }));
  } catch {
    return [];
  }
}