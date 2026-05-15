import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '—';

export default function ProductRoadmapQAReleasePanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["product-roadmap-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("product-roadmap-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Roadmap status refreshed."); } finally { setBusy(false); } };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-product-roadmap-qa-release">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Rocket size={14} className="text-primary" /> Product · Roadmap · QA · Release Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-deploy · Founder approval required</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Open items" value={s.items_open} />
          <Tile label="Open bugs" value={s.bugs_open} tone={s.bugs_open ? 'text-yellow-300' : ''} />
          <Tile label="Critical bugs" value={s.bugs_critical} tone={s.bugs_critical ? 'text-destructive' : ''} />
          <Tile label="High priority" value={s.high_priority_open} tone={s.high_priority_open ? 'text-yellow-300' : ''} />
          <Tile label="Customer requests" value={s.customer_requests_open} />
          <Tile label="Competitor gaps" value={s.competitor_gaps_open} />
          <Tile label="AI upgrades" value={s.ai_upgrades_open} />
          <Tile label="Integrations" value={s.integrations_open} />
          <Tile label="Compliance items" value={s.compliance_open} />
          <Tile label="Tech debt" value={s.tech_debt_open} />
          <Tile label="Overdue targets" value={s.overdue_target_release} tone={s.overdue_target_release ? 'text-destructive' : ''} />
          <Tile label="QA failures" value={s.qa_failures} tone={s.qa_failures ? 'text-destructive' : ''} />
          <Tile label="QA never run" value={s.qa_never_run} tone={s.qa_never_run ? 'text-yellow-300' : ''} />
          <Tile label="Open releases" value={s.releases_open} />
          <Tile label="Release blockers" value={s.release_blockers} tone={s.release_blockers ? 'text-destructive' : ''} />
          <Tile label="Awaiting approval" value={s.releases_awaiting_approval} tone={s.releases_awaiting_approval ? 'text-yellow-300' : ''} />
        </div>

        {data?.disclaimer && (
          <div className="text-[11px] text-muted-foreground italic flex items-start gap-1"><AlertTriangle size={11} className="mt-0.5" />{data.disclaimer}</div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next actions</div>
            <ul className="space-y-1 max-h-56 overflow-auto text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.label}</span>
                  <span className="text-muted-foreground">{a.priority ?? a.qa_status ?? fmtDate(a.planned)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(data?.critical_bugs ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Critical bugs</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.critical_bugs.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{b.title}</span>
                    <Badge variant="outline" className="text-[9px]">{b.priority_level}</Badge>
                    {b.product_name && <Badge variant="outline" className="text-[9px]">{b.product_name}</Badge>}
                  </div>
                  <div className="text-muted-foreground">{b.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.release_blockers ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Release blockers</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.release_blockers.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.release_name}</span>
                    <Badge variant="outline" className="text-[9px]">qa: {r.qa_status}</Badge>
                    <Badge variant="outline" className="text-[9px]">{r.release_status}</Badge>
                  </div>
                  <div className="text-muted-foreground">{fmtDate(r.planned_release_date)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.releases_awaiting_approval ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Releases awaiting founder approval</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {data.releases_awaiting_approval.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <span className="font-medium">{r.release_name}</span>
                  <span className="text-muted-foreground">{fmtDate(r.planned_release_date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
