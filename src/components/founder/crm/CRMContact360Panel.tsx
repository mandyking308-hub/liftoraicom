import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ShieldAlert } from "lucide-react";
import CRMContactTimelinePanel from "./CRMContactTimelinePanel";
import PortfolioCrmSummaryPanel from "./PortfolioCrmSummaryPanel";
import PortfolioCrmArchitecturePanel from "./PortfolioCrmArchitecturePanel";
import PortfolioCrmEducationWavePanel from "./PortfolioCrmEducationWavePanel";
import PortfolioContactRelationshipsTable from "./PortfolioContactRelationshipsTable";

type Summary = {
  ok: boolean;
  reason?: string;
  contact?: any;
  business_relationships?: any[];
  business_names?: string[];
  compliance_state?: { open_count?: number; high_critical_open?: number; last_event_at?: string | null };
  latest_interaction?: any;
  latest_inbound?: { last_inbound_at?: string | null };
  latest_outbound?: { last_outbound_at?: string | null };
  latest_ai?: { last_ai_at?: string | null };
  proposal_count?: number;
  demo_count?: number;
  deal_count?: number;
  invoice_count?: number;
  payment_count?: number;
  open_conversations?: number;
  risk_flags?: string[];
  next_recommended_action?: string;
  timeline_readiness_score?: number;
};

export default function CRMContact360Panel({
  contactId, businessId, showTimeline = true,
}: { contactId?: string | null; businessId?: string | null; showTimeline?: boolean }) {
  const [input, setInput] = useState(contactId ?? "");
  const [activeId, setActiveId] = useState(contactId ?? null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (id: string | null) => {
    if (!id) { setSummary(null); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_crm_contact_360_summary" as any, {
      p_contact_id: id, p_business_id: businessId ?? null,
    });
    if (!error) setSummary(data as Summary);
    setLoading(false);
  };

  useEffect(() => { load(activeId); }, [activeId, businessId]);

  return (
    <div className="space-y-4">
      {!contactId && (
        <div className="space-y-4">
          <PortfolioCrmSummaryPanel />
          <PortfolioCrmArchitecturePanel />
          <PortfolioCrmEducationWavePanel />
          <div>
            <div className="mb-2">
              <h3 className="text-base font-semibold">People → all relevant Liftor businesses</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Portfolio view uses business_contact_relationships as the source of truth. The legacy assigned_business field is no longer treated as the commercial model.
              </p>
            </div>
            <PortfolioContactRelationshipsTable />
          </div>
        </div>
      )}

      <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Contact 360</h3>
            <Badge variant="outline" className="text-[10px]">read-only</Badge>
          </div>
          <div className="flex items-center gap-2">
            {!contactId && (
              <>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="contact uuid"
                  className="h-7 text-[11px] w-[260px]"
                />
                <Button size="sm" variant="outline" onClick={() => setActiveId(input.trim() || null)}>Load</Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => load(activeId)} disabled={loading || !activeId}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>

        {!activeId && (
          <div className="text-[11px] text-muted-foreground italic">Provide a contact UUID above to view the 360.</div>
        )}

        {summary && summary.ok === false && (
          <div className="text-[11px] text-destructive">Not found: {summary.reason}</div>
        )}

        {summary?.ok && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-md border border-border/60 p-2 space-y-0.5">
                <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Identity</div>
                <div className="font-medium">{summary.contact?.name || "(no name)"} · {summary.contact?.email}</div>
                <div className="text-muted-foreground">{summary.contact?.company} · {summary.contact?.role}</div>
                <div className="text-muted-foreground">status: {summary.contact?.status}</div>
              </div>
              <div className="rounded-md border border-border/60 p-2 space-y-0.5">
                <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Business relationships</div>
                {(summary.business_relationships ?? []).length === 0 && <div className="italic text-muted-foreground">none</div>}
                {(summary.business_relationships ?? []).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium">{b.business_name}</span>
                    <Badge variant="outline" className="text-[10px]">{b.qualification}</Badge>
                    <Badge variant="outline" className="text-[10px]">{b.current_stage}</Badge>
                    {b.do_not_contact && <Badge variant="destructive" className="text-[10px]">DNC</Badge>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
              <Stat label="Readiness" value={`${summary.timeline_readiness_score ?? 0}`} />
              <Stat label="Open conv" value={summary.open_conversations ?? 0} />
              <Stat label="Proposals" value={summary.proposal_count ?? 0} />
              <Stat label="Demos" value={summary.demo_count ?? 0} />
              <Stat label="Deals" value={summary.deal_count ?? 0} />
              <Stat label="Invoices/Payments" value={`${summary.invoice_count ?? 0}/${summary.payment_count ?? 0}`} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-md border border-border/60 p-2 space-y-0.5">
                <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Compliance</div>
                <div>open: <strong>{summary.compliance_state?.open_count ?? 0}</strong> · high/critical: <strong>{summary.compliance_state?.high_critical_open ?? 0}</strong></div>
                <div className="text-muted-foreground">last event: {summary.compliance_state?.last_event_at ? new Date(summary.compliance_state.last_event_at).toLocaleString() : "—"}</div>
                {(summary.risk_flags ?? []).map((f, i) => (
                  <Badge key={i} variant="destructive" className="text-[10px] mr-1">
                    <ShieldAlert className="h-3 w-3 mr-1" />{f}
                  </Badge>
                ))}
              </div>
              <div className="rounded-md border border-border/60 p-2 space-y-0.5">
                <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Latest activity</div>
                <div>inbound: {summary.latest_inbound?.last_inbound_at ? new Date(summary.latest_inbound.last_inbound_at).toLocaleString() : "—"}</div>
                <div>outbound: {summary.latest_outbound?.last_outbound_at ? new Date(summary.latest_outbound.last_outbound_at).toLocaleString() : "—"}</div>
                <div>AI: {summary.latest_ai?.last_ai_at ? new Date(summary.latest_ai.last_ai_at).toLocaleString() : "—"}</div>
              </div>
            </div>

            <div className="rounded-md border border-primary/40 bg-primary/5 p-2 text-[11px]">
              <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Next recommended action</div>
              <div className="font-medium">{summary.next_recommended_action}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Suggestion only — no automatic execution. No emails, no Apollo, no Smartlead POSTs.</div>
            </div>

            {showTimeline && (
              <CRMContactTimelinePanel contactId={activeId!} businessId={businessId} limit={20} title="Recent timeline" />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
