import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Play } from "lucide-react";

type Health = {
  readiness_score: number;
  metrics: Record<string, number>;
  blockers_by_severity: { critical: any[]; high: any[]; medium: any[]; low: any[] };
};
type Backfill = {
  sources: Array<{ source: string; target_type: string; rows_total: number; rows_already_captured: number; rows_eligible: number; rows_blocked: number; warnings?: string[] }>;
  unmatched_ledger_rows: number;
  contacts_with_timeline_gap: number;
  total_eligible: number;
};

export default function CRMHealthIntegrityPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [backfill, setBackfill] = useState<Backfill | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const [h, b] = await Promise.all([
      supabase.functions.invoke("crm-health-integrity-check", { body: {} }),
      supabase.functions.invoke("crm-backfill-preview", { body: {} }),
    ]);
    if ((h.data as any)?.readiness_score !== undefined) setHealth(h.data as Health);
    if ((b.data as any)?.sources) setBackfill(b.data as Backfill);
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const score = health?.readiness_score ?? 0;
  const scoreColor = score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive";

  const m = health?.metrics ?? {};
  const tile = (label: string, value: number | undefined, intent: "ok" | "warn" | "bad" = "ok") => (
    <div className={`rounded-md border border-border/60 p-2 text-[11px]`}>
      <div className="text-muted-foreground uppercase text-[10px]">{label}</div>
      <div className={`text-base font-semibold ${intent === "bad" ? "text-destructive" : intent === "warn" ? "text-yellow-500" : ""}`}>{value ?? 0}</div>
    </div>
  );

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24" id="crm-health">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Health & Integrity</h3>
          <Badge variant="outline" className="text-[10px]">diagnostics · repair disabled</Badge>
          <Badge variant="destructive" className="text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1" /> CRM_REPAIR_APPLY_ENABLED required
          </Badge>
          <Badge variant={scoreColor} className="text-[10px]">readiness: {score}/100</Badge>
        </div>
        <Button size="sm" onClick={run} disabled={loading}>
          <Play className="h-3 w-3 mr-1" /> {loading ? "Running…" : "Re-run diagnostics"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Read-only diagnostics. No emails, no Apollo, no Smartlead POSTs, no contact/BCR/compliance mutations.
        Repair apply requires <code>CRM_REPAIR_APPLY_ENABLED=true</code> + phrase <code>APPLY CRM REPAIR</code>.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {tile("Contacts", m.contacts_total)}
        {tile("Missing business", m.contacts_missing_business, m.contacts_missing_business > 0 ? "warn" : "ok")}
        {tile("Missing email", m.contacts_missing_email, m.contacts_missing_email > 0 ? "warn" : "ok")}
        {tile("Missing compliance", m.contacts_missing_compliance_spine, m.contacts_missing_compliance_spine > 0 ? "bad" : "ok")}
        {tile("Pending review", m.contacts_pending_review, "warn")}
        {tile("Outreach allowed", m.contacts_outreach_allowed)}
        {tile("BCRs missing biz", m.bcrs_missing_business, m.bcrs_missing_business > 0 ? "bad" : "ok")}
        {tile("Convos no contact", m.conversations_missing_contact, m.conversations_missing_contact > 0 ? "warn" : "ok")}
        {tile("Comms no contact", m.communications_missing_contact, m.communications_missing_contact > 0 ? "warn" : "ok")}
        {tile("Email evt no contact", m.email_events_missing_contact, m.email_events_missing_contact > 0 ? "warn" : "ok")}
        {tile("Provider evt unmatched", m.provider_events_unmatched, m.provider_events_unmatched > 0 ? "warn" : "ok")}
        {tile("Ledger total", m.ledger_total)}
        {tile("Ledger unmatched", m.ledger_unmatched, m.ledger_unmatched > 0 ? "warn" : "ok")}
        {tile("Empty timelines", m.contacts_empty_timeline, m.contacts_empty_timeline > 0 ? "warn" : "ok")}
        {tile("Proposals no contact", m.proposals_missing_contact, m.proposals_missing_contact > 0 ? "warn" : "ok")}
        {tile("Demos no contact", m.demos_missing_contact_or_proposal, m.demos_missing_contact_or_proposal > 0 ? "warn" : "ok")}
        {tile("Deals no contact", m.deals_missing_contact_or_business, m.deals_missing_contact_or_business > 0 ? "warn" : "ok")}
        {tile("Invoices no deal", m.invoices_missing_deal_or_business, m.invoices_missing_deal_or_business > 0 ? "warn" : "ok")}
        {tile("Payments no inv", m.payments_missing_invoice_or_business, m.payments_missing_invoice_or_business > 0 ? "warn" : "ok")}
        {tile("AI act no convo", m.ai_actions_missing_conversation, m.ai_actions_missing_conversation > 0 ? "warn" : "ok")}
        {tile("Review queue", m.founder_review_queue_pending)}
      </div>

      {health && (
        <div className="rounded-md border border-border/60 p-2 text-[11px] space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground">Blockers by severity</div>
          {(["critical","high","medium","low"] as const).map((sev) => (
            <div key={sev} className="flex flex-wrap gap-1 items-center">
              <Badge variant={sev === "critical" ? "destructive" : sev === "high" ? "default" : "secondary"} className="text-[10px] uppercase">{sev}</Badge>
              {health.blockers_by_severity[sev].length === 0 && <span className="text-muted-foreground">none</span>}
              {health.blockers_by_severity[sev].map((b: any) => (
                <Badge key={b.key} variant="outline" className="text-[10px]">{b.key}: {b.count}</Badge>
              ))}
            </div>
          ))}
        </div>
      )}

      {backfill && (
        <div className="rounded-md border border-border/60 p-2 text-[11px] space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground">Backfill preview ({backfill.total_eligible} rows eligible · apply disabled)</div>
          <div className="grid sm:grid-cols-2 gap-1">
            {backfill.sources.map((s) => (
              <div key={s.source} className="flex flex-wrap gap-1 items-center">
                <span className="font-medium">{s.target_type}</span>
                <Badge variant="outline" className="text-[10px]">total: {s.rows_total}</Badge>
                <Badge variant="outline" className="text-[10px]">captured: {s.rows_already_captured}</Badge>
                <Badge variant="outline" className="text-[10px]">eligible: {s.rows_eligible}</Badge>
                <Badge variant="destructive" className="text-[10px]">apply: disabled</Badge>
              </div>
            ))}
          </div>
          <div className="text-muted-foreground">
            Unmatched ledger rows: {backfill.unmatched_ledger_rows} · Contacts with timeline gap: {backfill.contacts_with_timeline_gap}
          </div>
        </div>
      )}
    </Card>
  );
}