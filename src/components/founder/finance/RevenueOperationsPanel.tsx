import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Banknote, ShieldCheck, Lock, RefreshCw, FileText, AlertTriangle,
  Truck, Users, CheckCircle2, Briefcase,
} from "lucide-react";

type Item = {
  review_type: string;
  business_name?: string | null;
  deal_id?: string | null;
  invoice_id?: string | null;
  payment_id?: string | null;
  supplier_id?: string | null;
  assignment_id?: string | null;
  current_state?: string | null;
  recommended_action?: string;
  estimated_value?: number;
  priority_level: "low" | "normal" | "high" | "urgent";
  blockers: string[];
};

type Resp = {
  ok: boolean;
  apply_enabled: boolean;
  apply_disabled_reason: string;
  totals: {
    items: number;
    deals_scanned: number;
    invoices_scanned: number;
    payments_scanned: number;
    suppliers_scanned: number;
    assignments_scanned: number;
  };
  by_type: Record<string, number>;
  value: { pipeline_estimate: number; overdue_estimate: number; recently_received: number };
  persisted_reviews: number;
  items: Item[];
};

type MatchResp = {
  ok: boolean;
  total_deals_needing_supplier: number;
  recommendations: Array<{
    deal_id: string;
    business_name?: string | null;
    required_skills: string[];
    candidates: Array<{
      supplier_id: string;
      name: string;
      business_name?: string | null;
      status: string;
      score: number;
      reasons: string[];
      active_assignment_count: number;
      max_concurrent_assignments: number;
    }>;
    blockers: string[];
  }>;
};

const typeIcon: Record<string, any> = {
  deal_needs_invoice: FileText,
  invoice_overdue: AlertTriangle,
  payment_received: CheckCircle2,
  assignment_needs_supplier: Users,
  supplier_load_issue: Briefcase,
  delivery_blocker: Truck,
};

const typeClass: Record<string, string> = {
  deal_needs_invoice: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  invoice_overdue: "bg-red-500/10 text-red-400 border-red-500/30",
  payment_received: "bg-green-500/10 text-green-400 border-green-500/30",
  assignment_needs_supplier: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  supplier_load_issue: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  delivery_blocker: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const priorityClass: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  normal: "bg-muted text-muted-foreground border-border",
  low: "bg-muted text-muted-foreground border-border",
};

const fmt = (n: number) => `$${(n ?? 0).toLocaleString()}`;

export default function RevenueOperationsPanel() {
  const ops = useQuery({
    queryKey: ["revenue-operations-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("revenue-operations-preview", { body: {} });
      if (error) throw error;
      return data as Resp;
    },
  });

  const match = useQuery({
    queryKey: ["supplier-match-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("supplier-match-preview", { body: {} });
      if (error) throw error;
      return data as MatchResp;
    },
  });

  const data = ops.data;

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote size={18} className="text-primary" /> Revenue Operations (preview)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send · No-Auto-Create
          </Badge>
          <Badge variant="outline" className={`text-[10px] uppercase ${data?.apply_enabled ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
            <Lock size={10} className="mr-1" /> apply {data?.apply_enabled ? "enabled" : "disabled"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => { ops.refetch(); match.refetch(); }} disabled={ops.isFetching || match.isFetching}>
            <RefreshCw size={14} className={ops.isFetching || match.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ops.isLoading && <p className="text-sm text-muted-foreground">Loading revenue operations preview…</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Readiness items</p>
                <p className="text-2xl font-semibold">{data.totals.items}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Pipeline est.</p>
                <p className="text-sm font-semibold">{fmt(data.value.pipeline_estimate)}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Overdue est.</p>
                <p className="text-sm font-semibold text-red-400">{fmt(data.value.overdue_estimate)}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Recently received</p>
                <p className="text-sm font-semibold text-green-400">{fmt(data.value.recently_received)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {Object.entries(data.by_type).map(([k, v]) => (
                <Badge key={k} variant="outline" className={`text-[10px] ${typeClass[k] ?? ""}`}>{k} · {v}</Badge>
              ))}
              <Badge variant="outline" className="text-[10px]">deals · {data.totals.deals_scanned}</Badge>
              <Badge variant="outline" className="text-[10px]">invoices · {data.totals.invoices_scanned}</Badge>
              <Badge variant="outline" className="text-[10px]">payments · {data.totals.payments_scanned}</Badge>
              <Badge variant="outline" className="text-[10px]">suppliers · {data.totals.suppliers_scanned}</Badge>
              <Badge variant="outline" className="text-[10px]">assignments · {data.totals.assignments_scanned}</Badge>
              <Badge variant="outline" className="text-[10px]">persisted · {data.persisted_reviews}</Badge>
            </div>

            <div className="space-y-2">
              {data.items.slice(0, 12).map((it, i) => {
                const Icon = typeIcon[it.review_type] ?? AlertTriangle;
                return (
                  <div key={`${it.review_type}-${i}`} className="rounded-md border border-border/50 p-2.5 bg-card/40 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] uppercase ${typeClass[it.review_type] ?? ""}`}>
                            <Icon size={10} className="mr-1" />{it.review_type}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] uppercase ${priorityClass[it.priority_level] ?? ""}`}>
                            {it.priority_level}
                          </Badge>
                          {it.current_state && <Badge variant="outline" className="text-[10px]">{it.current_state}</Badge>}
                        </div>
                        <p className="text-sm font-medium truncate mt-1">{it.business_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{it.recommended_action ?? "Founder review required."}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" disabled title="Apply disabled — REVENUE_OPERATIONS_APPLY_ENABLED + per-action flag required">
                          <Lock size={12} className="mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      {it.estimated_value ? (
                        <Badge variant="outline" className="text-[10px]">{fmt(it.estimated_value)}</Badge>
                      ) : null}
                      {it.blockers.map((b) => (
                        <Badge key={b} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">blocker · {b}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
              {data.items.length === 0 && (
                <p className="text-xs text-muted-foreground">No readiness items right now.</p>
              )}
              {data.items.length > 12 && (
                <p className="text-[11px] text-muted-foreground">+ {data.items.length - 12} more items…</p>
              )}
            </div>

            <div className="border-t border-border/40 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                <Users size={12} /> Supplier match recommendations
              </p>
              {match.isLoading && <p className="text-xs text-muted-foreground">Loading supplier match…</p>}
              {match.data && match.data.recommendations.length === 0 && (
                <p className="text-xs text-muted-foreground">No deals currently need supplier assignment.</p>
              )}
              <div className="space-y-2">
                {match.data?.recommendations.slice(0, 6).map((r) => (
                  <div key={r.deal_id} className="rounded-md border border-border/50 p-2 bg-card/30">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{r.business_name ?? r.deal_id}</p>
                      <Badge variant="outline" className="text-[10px]">{r.candidates.length} candidates</Badge>
                    </div>
                    {r.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.required_skills.map((s) => <Badge key={s} variant="outline" className="text-[9px]">skill · {s}</Badge>)}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1.5">
                      {r.candidates.map((c) => (
                        <div key={c.supplier_id} className="flex items-center justify-between rounded border border-border/40 p-1.5 text-xs">
                          <span className="truncate">{c.business_name ?? c.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-[9px]">{c.status}</Badge>
                            <Badge variant="outline" className="text-[9px]">{c.active_assignment_count}/{c.max_concurrent_assignments || "∞"}</Badge>
                            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">score {c.score}</Badge>
                          </div>
                        </div>
                      ))}
                      {r.blockers.map((b) => (
                        <Badge key={b} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">blocker · {b}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground">
              Apply controls are presentation-only until <code>REVENUE_OPERATIONS_APPLY_ENABLED=true</code>, confirmation phrase <code>APPLY REVENUE OPERATION</code>, and a per-action future flag are supplied. No invoices, payments, assignments, or emails are created from this preview.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}