import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Lock } from "lucide-react";

export const SEARCH_NAV = [
  { to: "/founder/search",                label: "Overview" },
  { to: "/founder/search/all",            label: "All results" },
  { to: "/founder/search/customers",      label: "Customers" },
  { to: "/founder/search/businesses",     label: "Businesses" },
  { to: "/founder/search/documents",      label: "Documents" },
  { to: "/founder/search/communications", label: "Communications" },
  { to: "/founder/search/audit",          label: "Audit" },
  { to: "/founder/search/settings",       label: "Settings" },
];

export function SearchLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Global Search</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Index live</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Safe summaries only
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {SEARCH_NAV.map(n => (
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

export function sensitivityBadge(s: string) {
  const m: Record<string, string> = {
    public:               "bg-muted text-muted-foreground border-border/50",
    internal:             "bg-primary/15 text-primary border-primary/30",
    confidential:         "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    restricted:           "bg-red-500/15 text-red-300 border-red-500/30",
    legal_sensitive:      "bg-red-500/15 text-red-300 border-red-500/30",
    financial_sensitive:  "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return m[s] ?? "bg-muted";
}

export function typeBadge(_t: string) { return "bg-primary/15 text-primary border-primary/30"; }