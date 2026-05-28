import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, ArrowLeft } from "lucide-react";

export const NEEDS_VERIFICATION_LABEL = "Needs verification";

const TABS = [
  { to: "/founder/funding-radar", label: "Overview", end: true },
  { to: "/founder/funding-radar/companies", label: "Companies" },
  { to: "/founder/funding-radar/clusters", label: "Clusters" },
  { to: "/founder/funding-radar/capital-efficiency", label: "Capital efficiency" },
  { to: "/founder/funding-radar/monthly-run", label: "Monthly run" },
  { to: "/founder/funding-radar/shortlist", label: "Shortlist" },
  { to: "/founder/funding-radar/settings", label: "Settings" },
];

export function FundingRadarLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const loc = useLocation();
  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link to="/founder/portfolio-exit" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Portfolio & Exit
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2 mt-1">
              <Radar className="h-7 w-7 text-primary" />
              {title}
            </h1>
            {subtitle && <p className="text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          <Badge variant="outline" className="text-[10px]">Founder only · Legal/IP guarded</Badge>
        </div>

        <Card className="tech-card">
          <CardContent className="p-2 flex gap-1 overflow-x-auto text-xs">
            {TABS.map((t) => {
              const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={
                    "shrink-0 px-3 py-1.5 rounded border transition " +
                    (active
                      ? "bg-primary/10 border-primary/50 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {children}
      </div>
    </FounderLayout>
  );
}

export function FRSection({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FRStat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="border border-border/50 rounded p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function NeedsVerification({ value }: { value?: string | number | null }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-amber-400 text-xs">{NEEDS_VERIFICATION_LABEL}</span>;
  }
  return <span>{value}</span>;
}

export function ConnectorPlaceholder({ name }: { name: string }) {
  return (
    <div className="border border-dashed border-border/60 rounded p-3 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{name}</span> — connector not yet wired. Future integration placeholder.
    </div>
  );
}