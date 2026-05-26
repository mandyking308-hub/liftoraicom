import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, ArrowLeft, ShieldAlert } from "lucide-react";

export const SLA_NAV = [
  { to: "/founder/internal-sla",           label: "Overview" },
  { to: "/founder/internal-sla/handoffs",  label: "Handoffs" },
  { to: "/founder/internal-sla/overdue",   label: "Overdue & breaches" },
  { to: "/founder/internal-sla/by-agent",  label: "By agent" },
  { to: "/founder/internal-sla/by-human",  label: "By human" },
  { to: "/founder/internal-sla/settings",  label: "Settings" },
];

export function SlaLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Internal SLA / Handoff Control</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live tracking</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> No external messages
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {SLA_NAV.map(n => (
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

export function Stat({ label, value, hint, tone }: { label: string; value: number|string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === "critical" || priority === "urgent" ? "bg-red-500/15 text-red-300 border-red-500/30" :
               priority === "high" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
               priority === "normal" ? "bg-secondary/40 text-muted-foreground border-border/40" :
               "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "resolved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "created" || status === "accepted" || status === "acknowledged" ? "bg-secondary/40 text-muted-foreground border-border/40" :
    status === "in_progress" ? "bg-primary/15 text-primary border-primary/30" :
    status === "blocked" || status === "overdue" || status === "open" ? "bg-red-500/15 text-red-300 border-red-500/30" :
    "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{status.replace(/_/g," ")}</Badge>;
}

export function dueLabel(due_at: string | null) {
  if (!due_at) return "—";
  const ms = new Date(due_at).getTime() - Date.now();
  const overdue = ms < 0;
  const mins = Math.round(Math.abs(ms) / 60000);
  const txt = mins > 1440 ? `${Math.round(mins/1440)}d` : mins > 60 ? `${Math.round(mins/60)}h` : `${mins}m`;
  return overdue ? `overdue ${txt}` : `in ${txt}`;
}

export function HandoffTable({ rows }: { rows: any[] }) {
  return (
    <Card className="tech-card p-0 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-secondary/30 text-muted-foreground">
          <tr>
            <th className="text-left p-2">When</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">From → To</th>
            <th className="text-left p-2">Module</th>
            <th className="text-left p-2">Summary</th>
            <th className="text-left p-2">Priority</th>
            <th className="text-left p-2">Due</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No handoffs.</td></tr>}
          {rows.map(r => {
            const overdueRow = r.due_at && new Date(r.due_at).getTime() < Date.now() && r.handoff_status !== "completed" && r.handoff_status !== "cancelled";
            return (
              <tr key={r.id} className={`border-t border-border/30 ${overdueRow ? "bg-red-500/5" : ""}`}>
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{r.handoff_type.replace(/_/g," ")}</td>
                <td className="p-2 text-muted-foreground">
                  {(r.from_actor_type ?? "—")}{r.from_actor_id ? ` · ${String(r.from_actor_id).slice(0,8)}` : ""} → {(r.to_actor_type ?? "—")}{r.to_actor_id ? ` · ${String(r.to_actor_id).slice(0,8)}` : ""}
                </td>
                <td className="p-2">{r.source_module}</td>
                <td className="p-2 max-w-[280px] truncate">{r.handoff_summary ?? "—"}</td>
                <td className="p-2"><PriorityBadge priority={r.priority} /></td>
                <td className={`p-2 whitespace-nowrap ${overdueRow ? "text-red-300" : "text-muted-foreground"}`}>{dueLabel(r.due_at)}</td>
                <td className="p-2"><StatusBadge status={overdueRow && r.handoff_status !== "overdue" ? "overdue" : r.handoff_status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}