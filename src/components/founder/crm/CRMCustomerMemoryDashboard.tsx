import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ShieldCheck, ShieldAlert, Play, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type StageStatus = "ready" | "partial" | "blocked";
type Stage = {
  key: string;
  label: string;
  status: StageStatus;
  count?: number;
  blockers: string[];
  next_action: string;
  mutation_disabled: true;
};

const STATUS_VARIANT: Record<StageStatus, "default" | "secondary" | "destructive"> = {
  ready: "default",
  partial: "secondary",
  blocked: "destructive",
};
const STATUS_ICON = {
  ready: <CheckCircle2 className="h-3 w-3" />,
  partial: <AlertTriangle className="h-3 w-3" />,
  blocked: <XCircle className="h-3 w-3" />,
};

export default function CRMCustomerMemoryDashboard() {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [readiness, setReadiness] = useState<number | null>(null);
  const [criticalBlockers, setCriticalBlockers] = useState<{ key: string; count: number }[]>([]);

  const load = async () => {
    setLoading(true);
    const head = (table: string, build?: (q: any) => any) => {
      let q = supabase.from(table as any).select("id", { count: "exact", head: true });
      if (build) q = build(q);
      return q;
    };
    const [
      contacts, bcrs, ledger, ledgerUnmatched, adapters, matchCandidates,
      bridgeReviews, stages, rules, queue, findings,
    ] = await Promise.all([
      head("contacts"),
      head("business_contact_relationships"),
      head("crm_interaction_ledger"),
      head("crm_interaction_ledger", (q: any) => q.eq("matched_status", "unmatched")),
      head("crm_interaction_source_adapters"),
      head("crm_match_candidates"),
      head("crm_conversation_bridge_reviews"),
      head("crm_lifecycle_stages"),
      head("crm_next_action_rules"),
      head("crm_founder_review_queue", (q: any) => q.eq("status", "pending")),
      head("crm_integrity_findings", (q: any) => q.eq("status", "open")),
    ]);
    const c: Record<string, number> = {
      contacts: contacts.count ?? 0,
      bcrs: bcrs.count ?? 0,
      ledger: ledger.count ?? 0,
      ledger_unmatched: ledgerUnmatched.count ?? 0,
      adapters: adapters.count ?? 0,
      match_candidates: matchCandidates.count ?? 0,
      bridge_reviews: bridgeReviews.count ?? 0,
      stages: stages.count ?? 0,
      rules: rules.count ?? 0,
      queue_pending: queue.count ?? 0,
      findings_open: findings.count ?? 0,
    };
    setCounts(c);
    try {
      const { data } = await supabase.functions.invoke("crm-health-integrity-check", { body: {} });
      if ((data as any)?.readiness_score !== undefined) {
        setReadiness((data as any).readiness_score);
        setCriticalBlockers(((data as any).blockers_by_severity?.critical ?? []) as any);
      }
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stageRows: Stage[] = useMemo(() => {
    const c = counts;
    return [
      {
        key: "contacts_bcr",
        label: "1 · Contacts / BCR spine",
        status: c.contacts > 0 && c.bcrs > 0 ? "ready" : c.contacts > 0 ? "partial" : "blocked",
        count: c.contacts,
        blockers: c.bcrs === 0 ? ["no_bcrs"] : [],
        next_action: "Continue capturing contact ↔ business relationships.",
        mutation_disabled: true,
      },
      {
        key: "compliance",
        label: "2 · Compliance spine",
        status: "partial",
        count: c.contacts,
        blockers: ["compliance_status_audit_pending"],
        next_action: "Run health check to surface contacts missing compliance.",
        mutation_disabled: true,
      },
      {
        key: "ledger",
        label: "3 · Interaction ledger",
        status: c.ledger > 0 ? "ready" : "partial",
        count: c.ledger,
        blockers: c.ledger === 0 ? ["no_interactions_captured"] : [],
        next_action: "Backfill ledger via crm-backfill-preview (apply disabled).",
        mutation_disabled: true,
      },
      {
        key: "adapters",
        label: "4 · Source adapters",
        status: c.adapters > 0 ? "ready" : "blocked",
        count: c.adapters,
        blockers: c.adapters === 0 ? ["adapters_not_seeded"] : [],
        next_action: "Capture remains disabled until founder enables CRM_INTERACTION_CAPTURE_ENABLED.",
        mutation_disabled: true,
      },
      {
        key: "matching",
        label: "5 · Identity matching",
        status: c.match_candidates > 0 ? "ready" : c.ledger > 0 ? "partial" : "blocked",
        count: c.match_candidates,
        blockers: c.ledger > 0 && c.match_candidates === 0 ? ["no_match_candidates_yet"] : [],
        next_action: "Run match preview from CRM Identity panel.",
        mutation_disabled: true,
      },
      {
        key: "timeline",
        label: "6 · Unified timeline",
        status: c.ledger > 0 ? "ready" : "partial",
        count: c.ledger,
        blockers: c.ledger === 0 ? ["timeline_empty"] : [],
        next_action: "Open Contact 360 to validate per-contact timelines.",
        mutation_disabled: true,
      },
      {
        key: "bridge",
        label: "7 · Conversation bridge",
        status: c.bridge_reviews > 0 ? "ready" : "partial",
        count: c.bridge_reviews,
        blockers: ["crm_conversation_bridge_disabled"],
        next_action: "Bridge apply requires CRM_CONVERSATION_BRIDGE_ENABLED.",
        mutation_disabled: true,
      },
      {
        key: "lifecycle",
        label: "8 · Lifecycle / next action",
        status: c.stages > 0 && c.rules > 0 ? "ready" : "blocked",
        count: c.stages,
        blockers: c.stages === 0 ? ["stages_not_seeded"] : c.rules === 0 ? ["rules_not_seeded"] : [],
        next_action: "Next-action apply requires CRM_NEXT_ACTION_APPLY_ENABLED.",
        mutation_disabled: true,
      },
      {
        key: "queue",
        label: "9 · Founder review queue",
        status: c.queue_pending >= 0 ? "ready" : "blocked",
        count: c.queue_pending,
        blockers: [],
        next_action: "Pending items appear here once apply writers run.",
        mutation_disabled: true,
      },
      {
        key: "agent",
        label: "10 · Agent readiness",
        status: "partial",
        count: 0,
        blockers: ["agents_not_activated", "auto_send_disabled"],
        next_action: "Agents stay off until founder explicitly activates each one.",
        mutation_disabled: true,
      },
    ];
  }, [counts]);

  // Agent readiness badge
  const agentReady = useMemo(() => {
    const blockers: string[] = [];
    if (counts.ledger === undefined) blockers.push("ledger_table_missing");
    if ((counts.adapters ?? 0) === 0) blockers.push("adapters_not_seeded");
    if ((counts.stages ?? 0) === 0) blockers.push("lifecycle_stages_not_seeded");
    if ((counts.rules ?? 0) === 0) blockers.push("next_action_rules_not_seeded");
    if (criticalBlockers.length > 0) blockers.push(...criticalBlockers.map((b) => b.key));
    let level: "yes" | "partial" | "no" = "yes";
    if (blockers.length > 0) level = "partial";
    if ((counts.ledger ?? 0) === 0) level = "no";
    return { level, blockers };
  }, [counts, criticalBlockers]);

  const badgeVariant = agentReady.level === "yes" ? "default" : agentReady.level === "partial" ? "secondary" : "destructive";

  return (
    <Card className="p-5 space-y-3 border-2 border-primary/40 scroll-mt-24" id="crm-customer-memory">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Customer Memory Dashboard</h3>
          <Badge variant={badgeVariant} className="text-[10px]">
            {agentReady.level === "yes" ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
            CRM ready for AI agents: {agentReady.level}
          </Badge>
          {readiness !== null && (
            <Badge variant={readiness >= 80 ? "default" : readiness >= 50 ? "secondary" : "destructive"} className="text-[10px]">
              health: {readiness}/100
            </Badge>
          )}
          <Badge variant="destructive" className="text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1" /> auto_send=false · no Apollo · no Smartlead POST
          </Badge>
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          <Play className="h-3 w-3 mr-1" /> {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Single truth for CRM customer memory. Read-only — no emails, no AI replies, no operational mutations.
        All apply paths require an explicit feature flag + confirmation phrase.
      </p>

      {agentReady.blockers.length > 0 && (
        <div className="rounded-md border border-destructive/40 p-2 text-[11px]">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Agent readiness blockers</div>
          <div className="flex flex-wrap gap-1">
            {agentReady.blockers.map((b) => <Badge key={b} variant="destructive" className="text-[10px]">{b}</Badge>)}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {stageRows.map((s) => (
          <div key={s.key} className="rounded-md border border-border/60 p-2 text-[11px] flex flex-wrap gap-2 items-center">
            <Badge variant={STATUS_VARIANT[s.status]} className="text-[10px] flex items-center gap-1">
              {STATUS_ICON[s.status]} {s.status}
            </Badge>
            <span className="font-medium">{s.label}</span>
            {typeof s.count === "number" && <Badge variant="outline" className="text-[10px]">count: {s.count}</Badge>}
            {s.blockers.map((b) => <Badge key={b} variant="destructive" className="text-[10px]">{b}</Badge>)}
            <Badge variant="outline" className="text-[10px]">live mutation: disabled</Badge>
            <span className="text-muted-foreground ml-auto truncate">{s.next_action}</span>
          </div>
        ))}
      </div>

      {criticalBlockers.length > 0 && (
        <div className="rounded-md border border-destructive/40 p-2 text-[11px]">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Critical health blockers</div>
          <div className="flex flex-wrap gap-1">
            {criticalBlockers.map((b) => <Badge key={b.key} variant="destructive" className="text-[10px]">{b.key}: {b.count}</Badge>)}
          </div>
        </div>
      )}
    </Card>
  );
}