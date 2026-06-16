import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, ArrowLeft, Lock } from "lucide-react";

const PORTAL_NAV_SUFFIXES: { suffix: string; label: string }[] = [
  { suffix: "",                  label: "Overview" },
  { suffix: "/customer",         label: "Customer" },
  { suffix: "/seller",           label: "Seller" },
  { suffix: "/partner",          label: "Partner" },
  { suffix: "/adviser",          label: "Adviser" },
  { suffix: "/document-upload",  label: "Document Upload" },
  { suffix: "/access",           label: "Access events" },
  { suffix: "/settings",         label: "Settings" },
];

/** Builds the portal sub-nav scoped to whichever prefix the user landed on
 *  (`/founder/portals` or the founder/admin alias `/founder/portal-admin`),
 *  so deep links and breadcrumbs stay internally consistent. */
export function buildPortalNav(prefix: "/founder/portals" | "/founder/portal-admin") {
  return PORTAL_NAV_SUFFIXES.map(n => ({ to: `${prefix}${n.suffix}`, label: n.label }));
}

// Back-compat export: default to the legacy /founder/portals prefix.
export const PORTAL_NAV = buildPortalNav("/founder/portals");

export function PortalsLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const prefix: "/founder/portals" | "/founder/portal-admin" =
    pathname.startsWith("/founder/portal-admin") ? "/founder/portal-admin" : "/founder/portals";
  const nav = buildPortalNav(prefix);
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>{prefix === "/founder/portal-admin" ? "Portal Admin" : "External Portals Architecture"}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DoorOpen size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">Internal only</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Invites approval-gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {nav.map(n => (
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

export function PortalStat({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}