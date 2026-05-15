import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function GroupHQOperatingPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["group-hq-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("group-hq-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("Group HQ status refreshed."); } finally { setBusy(false); } };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-2xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-group-hq">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Building2 size={14} className="text-primary" /> International Group HQ · Operating Brain</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No filings · No payments · No external action</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Group entities" value={s.entities_count} />
          <Tile label="Businesses tracked" value={s.businesses_count} />
          <Tile label="Overdue obligations" value={s.obligations_overdue} tone={s.obligations_overdue ? 'text-destructive' : 'text-emerald-300'} />
          <Tile label="Upcoming (90d)" value={s.obligations_upcoming_90d} tone={s.obligations_upcoming_90d ? 'text-yellow-300' : ''} />
          <Tile label="Undated obligations" value={s.obligations_undated} tone={s.obligations_undated ? 'text-yellow-300' : ''} />
          <Tile label="Adviser actions open" value={s.adviser_actions_open} />
          <Tile label="Licence renewals" value={s.licence_renewals_open} />
          <Tile label="Governance reviews due" value={s.governance_reviews_due} tone={s.governance_reviews_due ? 'text-yellow-300' : ''} />
        </div>

        {s.highest_risk_entity && (
          <div className="flex items-center gap-2 text-xs">
            <ShieldAlert size={12} className="text-destructive" />
            <span className="text-muted-foreground">Highest-risk entity:</span>
            <span className="font-medium">{s.highest_risk_entity.name}</span>
            <Badge variant="outline" className="text-[9px]">{s.highest_risk_entity.risk_level}</Badge>
          </div>
        )}

        {(data?.entities ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Entities</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {(data?.entities ?? []).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.entity_name}</span>
                    <Badge variant="outline" className="text-[9px]">{e.jurisdiction ?? 'jurisdiction tbd'}</Badge>
                    <Badge variant="outline" className="text-[9px]">{e.entity_type ?? '—'}</Badge>
                    <Badge variant="outline" className="text-[9px]">risk: {e.risk_level}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>overdue: <span className={e.overdue_obligations ? 'text-destructive' : 'text-foreground'}>{e.overdue_obligations}</span></span>
                    <span>upcoming: <span className="text-foreground">{e.upcoming_obligations}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next founder actions</div>
            <ul className="space-y-1 text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{a.kind}</Badge>
                    <span>{a.label}</span>
                  </div>
                  <span className="text-muted-foreground">{a.due_date ?? a.status ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} /> Refresh status</Button>
          <span className="text-[10px] text-muted-foreground">Read-only · no filings, no payments, no banking calls. Adviser confirmation required before any external submission.</span>
        </div>
      </CardContent>
    </Card>
  );
}