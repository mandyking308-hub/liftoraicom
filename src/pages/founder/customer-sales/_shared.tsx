import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowLeft } from "lucide-react";

export const CS_NAV: { to: string; label: string }[] = [
  { to: "/founder/customer-sales", label: "Hub" },
  { to: "/founder/customer-sales/voice-console", label: "Voice Console" },
  { to: "/founder/customer-sales/product-knowledge", label: "Product Knowledge" },
  { to: "/founder/customer-sales/playbooks", label: "Playbooks" },
  { to: "/founder/customer-sales/conversations", label: "Conversations" },
  { to: "/founder/customer-sales/call-logs", label: "Call Logs" },
  { to: "/founder/customer-sales/close-engine", label: "Close Engine" },
  { to: "/founder/customer-sales/offers", label: "Offers" },
  { to: "/founder/customer-sales/objections", label: "Objections" },
  { to: "/founder/customer-sales/follow-up", label: "Follow-up" },
  { to: "/founder/customer-sales/safety", label: "Safety Centre" },
  { to: "/founder/customer-sales/settings", label: "Settings" },
];

export function CSLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Customer Voice + Sales Close Engine</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live operating</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> External actions approval-gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {CS_NAV.map(n => (
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

export function CSEmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Card className="tech-card border-dashed">
      <CardContent className="py-10 text-center space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground max-w-md mx-auto">{hint}</p>}
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}

export function CSSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}