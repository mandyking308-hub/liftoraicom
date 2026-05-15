import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copyright, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function IPRightsBrandControlPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["ip-rights-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ip-rights-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("IP & rights refreshed."); } finally { setBusy(false); } };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? 0}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-ip-rights-brand">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Copyright size={14} className="text-primary" /> IP · Rights · Licensing · Brand Asset Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No auto-publish · No auto-license · No ownership claim · Founder approval required</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Total assets" value={s.total_assets} />
          <Tile label="Ownership unknown" value={s.ownership_unknown} tone={s.ownership_unknown ? 'text-destructive' : ''} />
          <Tile label="High rights risk" value={s.high_risk} tone={s.high_risk ? 'text-destructive' : ''} />
          <Tile label="Public-use blocked" value={s.public_use_blocked} tone={s.public_use_blocked ? 'text-yellow-300' : ''} />
          <Tile label="Registration review" value={s.not_registered} tone={s.not_registered ? 'text-yellow-300' : ''} />
          <Tile label="Licensing opportunities" value={s.licensing_opportunities} />
          <Tile label="Distribution checklists" value={s.distribution_open} />
          <Tile label="Missing paperwork" value={s.distribution_missing_paperwork} tone={s.distribution_missing_paperwork ? 'text-yellow-300' : ''} />
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
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.label ?? a.checklist_type ?? '—'}</span>
                  <span className="text-muted-foreground">{a.asset_type ?? a.risk ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.by_type ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Assets by type</div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {data.by_type.map((t: any) => (
                  <div key={t.asset_type} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                    <span>{t.asset_type}</span><span className="text-muted-foreground">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.high_risk ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">High rights risk</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.high_risk.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><span className="font-medium">{a.asset_name}</span><Badge variant="outline" className="text-[9px]">{a.asset_type}</Badge></span>
                    <span className="text-destructive">{a.rights_risk_level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.ownership_unknown ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Ownership unknown / disputed</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.ownership_unknown.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><span className="font-medium">{a.asset_name}</span><Badge variant="outline" className="text-[9px]">{a.asset_type}</Badge></span>
                    <span className="text-muted-foreground">{a.ownership_status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.distribution_open ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Open distribution checklists</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.distribution_open.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><Badge variant="outline" className="text-[9px]">{c.checklist_type}</Badge><span>{c.checklist_status}</span></span>
                    <span className="text-muted-foreground">missing: {Array.isArray(c.missing_items) ? c.missing_items.length : 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.licensing_opportunities ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Licensing opportunities</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.licensing_opportunities.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><span className="font-medium">{a.asset_name}</span><Badge variant="outline" className="text-[9px]">{a.asset_type}</Badge></span>
                    <span className="text-muted-foreground">{a.usage_rights ?? '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.not_registered ?? []).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
              <div className="text-xs font-medium mb-2">Trademark / registration review</div>
              <ul className="space-y-1 max-h-48 overflow-auto text-[11px]">
                {data.not_registered.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between border-b border-border/20 py-1">
                    <span className="flex items-center gap-2 flex-wrap"><span className="font-medium">{a.asset_name}</span><Badge variant="outline" className="text-[9px]">{a.asset_type}</Badge></span>
                    <span className="text-muted-foreground">{a.registration_status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}