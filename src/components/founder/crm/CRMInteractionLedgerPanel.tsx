import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, ShieldAlert } from "lucide-react";

export default function CRMInteractionLedgerPanel() {
  const [summary, setSummary] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [typeCount, setTypeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: sum }, { data: types }, { data: rows }] = await Promise.all([
      supabase.rpc("get_crm_interaction_ledger_summary" as any, {}),
      supabase.from("crm_interaction_types" as any).select("id", { count: "exact", head: false }).limit(1000),
      supabase
        .from("crm_interaction_ledger" as any)
        .select("id, occurred_at, source_system, source_channel, interaction_type, direction, contact_email, subject, matched_status, founder_review_required")
        .order("occurred_at", { ascending: false })
        .limit(10),
    ]);
    setSummary(sum);
    setTypeCount((types as any[] | null)?.length ?? 0);
    setRecent((rows as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sourceSystems = summary?.interactions_by_source_system
    ? Object.keys(summary.interactions_by_source_system)
    : [];

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Interaction Ledger</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Canonical customer memory. Captures every interaction (Smartlead, native, founder, AI,
        proposal, demo, deal, finance, supplier, compliance, system) and links it to CRM objects.
        No automatic processing — capture only.
      </p>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
        <Stat label="Ledger ready" value={summary?.ledger_ready ? "yes" : "—"} />
        <Stat label="Types seeded" value={typeCount ?? "—"} />
        <Stat label="Total" value={summary?.total_interactions ?? 0} />
        <Stat label="Matched" value={summary?.matched_interactions ?? 0} />
        <Stat label="Unmatched" value={summary?.unmatched_interactions ?? 0} />
        <Stat label="Last 7d" value={summary?.interactions_last_7_days ?? 0} />
        <Stat label="Founder review" value={summary?.interactions_requiring_founder_review ?? 0} />
        <Stat label="AI relevant" value={summary?.ai_relevant_interactions ?? 0} />
        <Stat label="Compliance" value={summary?.compliance_relevant_interactions ?? 0} />
        <Stat label="Dedupe conflicts" value={summary?.duplicate_dedupe_conflicts ?? 0} />
        <Stat label="Source systems" value={sourceSystems.length} />
      </div>

      {sourceSystems.length > 0 && (
        <div className="rounded border border-border/60 p-2 text-[11px]">
          <div className="font-medium mb-1">Source systems covered</div>
          <div className="flex flex-wrap gap-1">
            {sourceSystems.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] font-mono">
                {s}: {String(summary.interactions_by_source_system[s])}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-border/60 p-2 text-[11px]">
        <div className="font-medium mb-1">Recent interactions</div>
        {recent.length === 0 ? (
          <div className="text-muted-foreground">No interactions captured yet.</div>
        ) : (
          <div className="space-y-1">
            {recent.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-2 font-mono text-[10px]">
                <span className="truncate">
                  {r.interaction_type} · {r.source_system}/{r.source_channel} · {r.direction ?? "—"} · {r.contact_email ?? "—"}
                </span>
                <span className="opacity-60">{new Date(r.occurred_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-200 flex items-start gap-2">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5" />
        <div>
          Capture-only ledger. No emails sent. No conversations / proposals / deals / invoices
          auto-created. No Smartlead POSTs. No Apollo calls. Operational records are not mutated.
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border border-border/60 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{String(value)}</div>
    </div>
  );
}
