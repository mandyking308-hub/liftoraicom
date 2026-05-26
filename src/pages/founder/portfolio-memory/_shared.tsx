import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, ArrowLeft, Lock } from "lucide-react";

export const PM_NAV = [
  { to: "/founder/portfolio-memory",                 label: "Overview" },
  { to: "/founder/portfolio-memory/businesses",      label: "Businesses" },
  { to: "/founder/portfolio-memory/handover-packs",  label: "Handover packs" },
  { to: "/founder/portfolio-memory/operator-briefs", label: "Operator" },
  { to: "/founder/portfolio-memory/adviser-briefs",  label: "Adviser" },
  { to: "/founder/portfolio-memory/buyer-briefs",    label: "Buyer" },
  { to: "/founder/portfolio-memory/history",         label: "History" },
];

export function PMLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Portfolio Memory / Handover</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live summaries</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Sharing gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {PM_NAV.map(n => (
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

export function PMStat({ label, value, hint, tone }: { label: string; value: number|string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

import { PACK_STATUS_META, PACK_TYPE_LABEL, SENSITIVITY_META, type HandoverPack, type HandoverPackItem, type MemorySummary } from "@/lib/portfolioMemory";

export function PackCard({ pack, items }: { pack: HandoverPack; items: HandoverPackItem[] }) {
  const st = PACK_STATUS_META[pack.pack_status];
  const se = SENSITIVITY_META[pack.sensitivity_level];
  const own = items.filter(i => i.pack_id === pack.id);
  return (
    <div className="border border-border/50 rounded p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
        <Badge variant="outline" className="text-[10px]">{PACK_TYPE_LABEL[pack.pack_type]}</Badge>
        <Badge variant="outline" className={`text-[10px] ${se.cls}`}>{se.label}</Badge>
        {pack.founder_approval_required && pack.pack_status !== "approved" && (
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" />Approval to share</Badge>
        )}
        {pack.audit_metadata?.live_internal_test && (
          <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">Live internal test</Badge>
        )}
      </div>
      <p className="text-sm font-semibold">{pack.pack_title}</p>
      {pack.pack_summary && <p className="text-xs text-muted-foreground">{pack.pack_summary}</p>}
      {pack.included_sections.length > 0 && (
        <p className="text-[11px] text-muted-foreground">Sections: {pack.included_sections.join(" · ")}</p>
      )}
      {own.length > 0 && (
        <ul className="text-[11px] space-y-0.5 pt-1">
          {own.map(i => (
            <li key={i.id} className="flex gap-2">
              <span className="text-muted-foreground capitalize">{i.item_type}:</span>
              <span>{i.item_summary}</span>
              {i.audit_metadata?.secrets_redacted && <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Secrets redacted</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SummaryCard({ s }: { s: MemorySummary }) {
  const isEst = !!s.audit_metadata?.estimated_metrics || !!s.key_metrics?.estimated;
  return (
    <div className="border border-border/50 rounded p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] capitalize">{s.summary_type}</Badge>
        {s.current_status && <Badge variant="outline" className="text-[10px]">{s.current_status}</Badge>}
        {isEst && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Estimated</Badge>}
        {s.audit_metadata?.live_internal_test && (
          <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">Live internal test</Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {s.last_generated_at ? `Generated ${new Date(s.last_generated_at).toLocaleString()}` : "Not generated"}
        </span>
      </div>
      <p className="text-sm font-semibold">{s.summary_title}</p>
      {s.summary_body && <p className="text-xs text-muted-foreground">{s.summary_body}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
        <Block title="Key metrics" items={Object.entries(s.key_metrics ?? {}).map(([k,v]) => `${k}: ${String(v)}`)} />
        <Block title="Open risks" items={s.open_risks ?? []} />
        <Block title="Open work" items={s.open_work_items ?? []} />
      </div>
    </div>
  );
}
function Block({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="border border-border/40 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{title}</p>
      {items.length === 0 ? <p className="text-muted-foreground">—</p> : (
        <ul className="space-y-0.5">{items.slice(0,5).map((i,idx) => <li key={idx}>· {String(i)}</li>)}</ul>
      )}
    </div>
  );
}