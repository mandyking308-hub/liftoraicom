import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export const RA_NAV = [
  { to: "/founder/roles", label: "Overview" },
  { to: "/founder/roles/users", label: "Users" },
  { to: "/founder/roles/permissions", label: "Permissions" },
  { to: "/founder/roles/delegation", label: "Delegation" },
  { to: "/founder/roles/access-requests", label: "Access requests" },
  { to: "/founder/roles/audit", label: "Audit" },
  { to: "/founder/roles/settings", label: "Settings" },
];

export function RALayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Role-Based Access & Delegation</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> No invites / no grants
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {RA_NAV.map(n => (
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

export function RASection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function RAStat({ label, value, tone, hint }: { label: string; value: any; tone?: "ok" | "warn" | "bad"; hint?: string }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value ?? "—"}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}