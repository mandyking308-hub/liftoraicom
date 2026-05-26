import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Control Fabric Card
 *
 * Single aggregated Command Centre surface for the 15 cross-cutting
 * Liftor control modules: Master Work Queue / Portfolio PMO, Unified
 * Notifications & Escalations, Role-Based Access & Delegation,
 * Reporting Truth Layer, External Portals, Reconciliation,
 * Jurisdiction / Tax, E-commerce / Inventory / Returns, Booking /
 * Scheduling, Document Vault / Data Room, AI Evals, SOP Governance,
 * Backup / Export / Recovery, Founder Decision Register and
 * Portfolio Memory / Handover.
 *
 * Live-first: shows internal counts only. No external action is ever
 * initiated from this card; every drill-through opens the owning
 * module which keeps its own approval gates.
 */

type Line = {
  key: string;
  label: string;
  to: string;
  count: number;
  tone: "neutral" | "warning" | "critical";
  hint: string;
};

const TONE: Record<Line["tone"], string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

async function count(table: string, build: (q: any) => any): Promise<number> {
  try {
    const q = build((supabase as any).from(table).select("id", { count: "exact", head: true }));
    const { count: c, error } = await q;
    if (error) return 0;
    return c ?? 0;
  } catch {
    return 0;
  }
}

export default function ControlFabricCard() {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [
        workOpen,
        notifUnread,
        escOpen,
        accessOpen,
        kpiOpen,
        invitesPending,
        reconOpen,
        jurOpen,
        invLow,
        bookingDrafts,
        docHigh,
        roomsDraft,
        evalFails,
        sopStale,
        backupWarn,
        decisionsOpen,
        handoverStale,
      ] = await Promise.all([
        count("master_work_items", (q) => q.in("status", ["new", "active", "waiting_approval", "blocked"])),
        count("unified_notifications", (q) => q.in("notification_status", ["unread", "acknowledged"])),
        count("escalation_records", (q) => q.in("escalation_status", ["open", "acknowledged"])),
        count("access_requests", (q) => q.in("request_status", ["draft", "pending", "approval_required"])),
        count("reporting_conflicts", (q) => q.in("conflict_status", ["open", "review_required"])),
        count("portal_invites", (q) => q.in("invite_status", ["draft", "approval_required"])),
        count("reconciliation_exceptions", (q) => q.in("status", ["open", "review_required"])),
        count("jurisdiction_review_queue", (q) => q.eq("status", "pending")),
        count("inventory_records", (q) => q.in("inventory_status", ["low_stock", "out_of_stock"])),
        count("booking_records", (q) => q.in("booking_status", ["draft", "approval_required"])),
        count("document_vault_items", (q) => q.in("sensitivity_level", ["confidential", "restricted", "secret"])),
        count("data_room_items", (q) => q.in("item_status", ["draft", "approval_required"])),
        count("ai_eval_results", (q) => q.eq("result_status", "fail")),
        count("sop_review_tasks", (q) => q.in("review_status", ["pending", "in_progress"])),
        count("backup_status_records", (q) => q.in("backup_status", ["warning", "failed", "unknown", "not_configured"])),
        count("founder_decisions", (q) => q.in("status", ["pending", "open", "review_required"])),
        count("handover_packs", (q) => q.in("pack_status", ["draft", "review_required"])),
      ]);
      if (cancel) return;
      const out: Line[] = [
        { key: "work", label: "Master work items open", to: "/founder/work-queue", count: workOpen, tone: workOpen > 0 ? "warning" : "neutral", hint: "Portfolio PMO queue" },
        { key: "notif", label: "Urgent notifications", to: "/founder/notifications", count: notifUnread, tone: notifUnread > 0 ? "warning" : "neutral", hint: "Deduped notification centre" },
        { key: "esc", label: "Escalations", to: "/founder/notifications/escalations", count: escOpen, tone: escOpen > 0 ? "critical" : "neutral", hint: "Founder-routed escalations" },
        { key: "access", label: "Access risks / requests", to: "/founder/roles", count: accessOpen, tone: accessOpen > 0 ? "warning" : "neutral", hint: "Role / delegation requests" },
        { key: "kpi", label: "KPI / reporting conflicts", to: "/founder/reporting-truth", count: kpiOpen, tone: kpiOpen > 0 ? "warning" : "neutral", hint: "Single source of truth" },
        { key: "invite", label: "Portal invites pending approval", to: "/founder/portals/invites", count: invitesPending, tone: invitesPending > 0 ? "warning" : "neutral", hint: "External invites — gated" },
        { key: "recon", label: "Reconciliation exceptions", to: "/founder/reconciliation", count: reconOpen, tone: reconOpen > 0 ? "warning" : "neutral", hint: "Bank / payment / payout" },
        { key: "jur", label: "Jurisdiction / tax review flags", to: "/founder/jurisdiction-tax", count: jurOpen, tone: jurOpen > 0 ? "warning" : "neutral", hint: "Adviser-review queue" },
        { key: "inv", label: "Inventory / returns warnings", to: "/founder/ecommerce/inventory", count: invLow, tone: invLow > 0 ? "warning" : "neutral", hint: "Low / out of stock" },
        { key: "book", label: "Bookings needing approval", to: "/founder/scheduling", count: bookingDrafts, tone: bookingDrafts > 0 ? "warning" : "neutral", hint: "Draft / approval-required" },
        { key: "doc", label: "Document / data room risks", to: "/founder/documents", count: docHigh + roomsDraft, tone: docHigh + roomsDraft > 0 ? "warning" : "neutral", hint: "Confidential vault + draft data rooms" },
        { key: "eval", label: "Failed AI evals", to: "/founder/ai-evals/results", count: evalFails, tone: evalFails > 0 ? "critical" : "neutral", hint: "Regression / safety failures" },
        { key: "sop", label: "Stale SOP reviews", to: "/founder/sops/reviews", count: sopStale, tone: sopStale > 0 ? "warning" : "neutral", hint: "Review tasks open" },
        { key: "backup", label: "Backup / export warnings", to: "/founder/backup-recovery", count: backupWarn, tone: backupWarn > 0 ? "critical" : "neutral", hint: "System health" },
        { key: "decision", label: "Open founder decisions", to: "/founder/decisions/open", count: decisionsOpen, tone: decisionsOpen > 0 ? "warning" : "neutral", hint: "Decision register" },
        { key: "handover", label: "Stale handover packs", to: "/founder/portfolio-memory/handover-packs", count: handoverStale, tone: handoverStale > 0 ? "warning" : "neutral", hint: "Operator / adviser / buyer" },
      ];
      setLines(out);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const totalOpen = lines.reduce((acc, l) => acc + l.count, 0);
  const critical = lines.filter((l) => l.tone === "critical" && l.count > 0).length;

  return (
    <Card className="tech-card border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Network size={18} className="text-primary" />
          Control Fabric
          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px]">
            15 modules live
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ml-auto ${critical > 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : totalOpen > 0 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}
          >
            {loading ? "Loading…" : critical > 0 ? `${critical} critical` : totalOpen > 0 ? `${totalOpen} open` : "All clear"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          Internal counts only. No external action is initiated from this card —
          invites, exports, restores, payouts, data room shares and irreversible
          decisions remain approval-gated inside their owning modules.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {lines.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              className={`rounded-lg border px-3 py-2 hover:bg-card-hover transition-colors ${TONE[l.tone]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium leading-tight">{l.label}</span>
                <span className="text-base font-semibold tabular-nums">{l.count}</span>
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">{l.hint}</div>
            </Link>
          ))}
        </div>
        {critical > 0 && (
          <p className="text-[11px] text-rose-300 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Critical lanes need founder attention — open the relevant module to act.
          </p>
        )}
      </CardContent>
    </Card>
  );
}