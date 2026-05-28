import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, GitBranch, Database, KeyRound, Map as MapIcon, BookOpen, ClipboardCheck, Lock } from "lucide-react";

const TABS = [
  { to: "/founder/security-vault", label: "Overview", icon: ShieldCheck },
  { to: "/founder/security-vault/build-snapshots", label: "Build Snapshots", icon: GitBranch },
  { to: "/founder/security-vault/secrets-register", label: "Secrets Register", icon: KeyRound },
  { to: "/founder/security-vault/backup-restore", label: "Backup & Restore", icon: Database },
  { to: "/founder/security-vault/security-audit", label: "Security Audit", icon: ClipboardCheck },
];

export function SVLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={22} />
            <h1 className="text-2xl md:text-3xl font-bold">Liftor Build Preservation &amp; Security Vault</h1>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px] ml-2">
              <Lock size={9} className="mr-1" /> Metadata only · no secret values
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-3xl">{subtitle ?? "Preservation, restore, secrets metadata and security review for the current Liftor build. Founder approval is required for any destructive, export, rotation, branch-protection, live-mode or external-send change. No raw secrets are ever displayed or stored here."}</p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = loc.pathname === t.to;
            return (
              <Link key={t.to} to={t.to} className={`text-xs px-3 py-1.5 rounded border ${active ? "border-primary text-primary bg-primary/10" : "border-border/40 text-muted-foreground hover:text-foreground"} inline-flex items-center gap-1.5`}>
                <Icon size={12} /> {t.label}
              </Link>
            );
          })}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">{title}</h2>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SVCard({ title, icon: Icon, children, footer }: { title: string; icon?: any; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {Icon && <Icon size={14} className="text-primary" />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">{children}{footer}</CardContent>
    </Card>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5 accent-primary" disabled aria-label={it} />
          <span className="text-muted-foreground">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function KVRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/30 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function ApprovalBoundary({ items }: { items: string[] }) {
  return (
    <Card className="tech-card border-amber-500/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-300"><Lock size={14} /> Founder approval required before</CardTitle>
      </CardHeader>
      <CardContent className="text-xs">
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

export const VAULT_APPROVAL_GATES = [
  "Exporting database data",
  "Rotating secrets",
  "Deleting backup records",
  "Changing branch protection",
  "Disabling approval gates",
  "Enabling external sending",
  "Enabling paid APIs",
  "Changing live mode",
  "Publishing public site changes",
];