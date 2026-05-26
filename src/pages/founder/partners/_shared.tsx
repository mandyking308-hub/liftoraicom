import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, ArrowLeft, Lock } from "lucide-react";
import {
  OUTREACH_STATUS_META, REFERRAL_STATUS_META, PARTNER_TYPE_META,
  type OutreachStatus, type ReferralStatus, type PartnerType,
} from "@/lib/partnerEngine";

export const PA_NAV = [
  { to: "/founder/partners",             label: "Overview" },
  { to: "/founder/partners/prospects",   label: "Prospects" },
  { to: "/founder/partners/referrals",   label: "Referrals" },
  { to: "/founder/partners/affiliates",  label: "Affiliates" },
  { to: "/founder/partners/commissions", label: "Commissions" },
  { to: "/founder/partners/performance", label: "Performance" },
];

export function PALayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Affiliate / Partner / Referral Engine</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Handshake size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> Contact / commission gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {PA_NAV.map(n => (
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

export function PASection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
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

export function PAStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
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

export function OutreachBadge({ status }: { status: OutreachStatus }) {
  const m = OUTREACH_STATUS_META[status];
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function ReferralBadge({ status }: { status: ReferralStatus }) {
  const m = REFERRAL_STATUS_META[status];
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function PartnerTypeBadge({ type }: { type: PartnerType }) {
  const m = PARTNER_TYPE_META[type];
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

export function shortId(id: string | null | undefined, n = 6) {
  if (!id) return "—";
  return id.slice(0, n);
}

export function fmtMoney(n: number | null | undefined, currency = "GBP") {
  if (n == null) return "—";
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(n)); }
  catch { return `${currency} ${Number(n).toFixed(2)}`; }
}
