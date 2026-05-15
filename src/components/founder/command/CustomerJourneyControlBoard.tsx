import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const ORCH_PHRASE = "RUN AGENT HANDOVER ORCHESTRATOR";

const BUCKETS: Array<{ key: string; label: string }> = [
  { key: "new_reply", label: "New reply" },
  { key: "needs_classification", label: "Needs AI classification" },
  { key: "ai_draft_ready", label: "AI draft ready" },
  { key: "founder_approval_needed", label: "Founder approval needed" },
  { key: "proposal_ready", label: "Proposal ready" },
  { key: "demo_ready", label: "Demo ready" },
  { key: "deal_ready", label: "Deal ready" },
  { key: "finance_supplier", label: "Finance / supplier" },
  { key: "compliance_review", label: "Compliance review" },
  { key: "waiting_on_customer", label: "Waiting on customer" },
  { key: "stuck_overdue", label: "Stuck / overdue" },
];

export default function CustomerJourneyControlBoard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [orch, setOrch] = useState<any>(null);
  const [phrase, setPhrase] = useState("");

  async function refresh(persist: boolean) {
    setBusy(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("customer-stewardship-status", { body: { persist } });
      if (error) throw error;
      setData(r);
      toast.success(persist ? "Stewardship persisted." : "Stewardship refreshed.");
    } catch (e: any) { toast.error(e?.message ?? "error"); }
    finally { setBusy(false); }
  }

  async function runOrchestrator(live: boolean) {
    setBusy(true);
    try {
      const body: any = { dry_run: !live, max_items: 25 };
      if (live) body.confirmation_phrase = phrase;
      const { data: r, error } = await supabase.functions.invoke("agent-handover-orchestrator", { body });
      if (error) throw error;
      setOrch(r);
      toast.success(live ? `Live: ${r?.summary?.created ?? 0} handovers created` : `Dry-run: ${r?.summary?.proposed ?? 0} proposed`);
    } catch (e: any) { toast.error(e?.message ?? "error"); }
    finally { setBusy(false); }
  }

  const journey = (data?.journey ?? {}) as Record<string, any[]>;
  const totals = BUCKETS.map((b) => ({ ...b, count: (journey[b.key] || []).length }));

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users size={16} className="text-primary" /> Customer Journey Control
          {data?.counts?.customers != null && (
            <Badge variant="secondary" className="ml-2">{data.counts.customers} active</Badge>
          )}
        </CardTitle>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => refresh(false)} className="h-7 text-xs">
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => refresh(true)} className="h-7 text-xs">
            <Save size={12} className="mr-1" /> Persist stewardship
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="rounded border border-border/60 bg-background/40 p-2 space-y-1.5">
          <div className="text-[11px] font-semibold">Run handover orchestrator (no external action)</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => runOrchestrator(false)} className="h-7 text-xs">Dry-run</Button>
            <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={ORCH_PHRASE} className="h-7 text-xs flex-1 min-w-[260px]" />
            <Button size="sm" variant="outline" disabled={busy || phrase.trim() !== ORCH_PHRASE} onClick={() => runOrchestrator(true)} className="h-7 text-xs">Run live (internal only)</Button>
          </div>
          {orch && (
            <div className="text-[11px] text-muted-foreground">
              {orch.dry_run ? "DRY-RUN" : "LIVE"} · proposed {orch.summary?.proposed} · created {orch.summary?.created} · stewardships {orch.summary?.stewardships_upserted} · tasks {orch.summary?.tasks_created} · approvals {orch.summary?.approvals_created}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {totals.map((b) => (
            <div key={b.key} className="rounded border border-border/60 bg-background/40 p-2 text-[11px]">
              <div className="text-muted-foreground">{b.label}</div>
              <div className="text-base font-semibold">{b.count}</div>
            </div>
          ))}
        </div>

        {data && (
          <div className="mt-2 space-y-2">
            {BUCKETS.filter((b) => (journey[b.key] || []).length > 0).map((b) => (
              <div key={b.key} className="rounded border border-border/60 bg-background/40 p-2">
                <div className="text-xs font-semibold mb-1.5 flex items-center justify-between">
                  <span>{b.label}</span>
                  <Badge variant="outline">{(journey[b.key] || []).length}</Badge>
                </div>
                <div className="space-y-1">
                  {(journey[b.key] || []).slice(0, 8).map((c: any) => (
                    <div key={c.contact_id + c.conversation_id} className="text-[11px] grid grid-cols-12 gap-2 py-1 border-t border-border/40">
                      <div className="col-span-3 truncate">{c.contact_email ?? c.contact_name ?? c.contact_id?.slice(0, 8)}</div>
                      <div className="col-span-2 text-muted-foreground truncate">owner: <span className="text-foreground">{c.current_owner_agent_key}</span></div>
                      <div className="col-span-2 text-muted-foreground truncate">prev: <span className="text-foreground">{c.previous_owner_agent_key ?? "—"}</span></div>
                      <div className="col-span-3 text-muted-foreground truncate">next: <span className="text-foreground">{c.next_best_action}</span></div>
                      <div className="col-span-2 text-right">
                        {c.founder_review_required && <Badge variant="outline" className="text-[10px]">approval</Badge>}
                        {(c.risk_flags || []).length > 0 && <Badge variant="outline" className="ml-1 text-[10px]">{(c.risk_flags || []).join(",")}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!data && (
          <p className="text-[11px] text-muted-foreground">Click Refresh to compute customer journey buckets (read-only).</p>
        )}
      </CardContent>
    </Card>
  );
}