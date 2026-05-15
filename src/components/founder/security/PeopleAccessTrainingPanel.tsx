import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, ListChecks, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function PeopleAccessTrainingPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["people-access-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("people-access-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => { setBusy(true); try { await refetch(); toast.success("People status refreshed."); } finally { setBusy(false); } };

  const checklistDryRun = async (mode: 'onboarding' | 'offboarding') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("people-onboarding-offboarding-checklist", { body: { mode, dry_run: true } });
      if (error) throw error;
      toast.success(`Dry-run: ${data?.would_create ?? 0} ${mode} checklist items would be created.`);
    } catch (e: any) { toast.error(e.message ?? 'Failed.'); } finally { setBusy(false); }
  };

  const s = data?.summary ?? {};
  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-people-access">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Users size={14} className="text-primary" /> People · Access · Training · Offboarding Control</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No passwords · No auto-grant · No auto-revoke</Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}><RefreshCw size={12} className="mr-1" />Refresh</Button>
            <Button size="sm" variant="outline" onClick={() => checklistDryRun('onboarding')} disabled={busy}><ListChecks size={12} className="mr-1" />Onboarding (dry-run)</Button>
            <Button size="sm" variant="outline" onClick={() => checklistDryRun('offboarding')} disabled={busy}><UserMinus size={12} className="mr-1" />Offboarding (dry-run)</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="People active" value={s.people_active} />
          <Tile label="People departing" value={s.people_departing} tone={s.people_departing ? 'text-yellow-300' : ''} />
          <Tile label="Missing NDA" value={s.missing_nda_count} tone={s.missing_nda_count ? 'text-destructive' : ''} />
          <Tile label="Missing contract" value={s.missing_contract_count} tone={s.missing_contract_count ? 'text-destructive' : ''} />
          <Tile label="Access reviews overdue" value={s.access_reviews_overdue} tone={s.access_reviews_overdue ? 'text-destructive' : ''} />
          <Tile label="Access reviews 90d" value={s.access_reviews_upcoming_90d} />
          <Tile label="Risky access" value={s.risky_access_count} tone={s.risky_access_count ? 'text-destructive' : ''} />
          <Tile label="Offboarding required" value={s.offboarding_required} tone={s.offboarding_required ? 'text-destructive' : ''} />
          <Tile label="SOPs total" value={s.sops_total} />
          <Tile label="Training due" value={s.sops_training_due} tone={s.sops_training_due ? 'text-yellow-300' : ''} />
          <Tile label="SOP review due 90d" value={s.sops_review_due_90d} />
        </div>

        {data?.disclaimer && (
          <div className="text-[11px] text-muted-foreground italic">{data.disclaimer}</div>
        )}

        {(data?.next_actions ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Next actions</div>
            <ul className="space-y-1 max-h-56 overflow-auto text-[11px]">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between border-b border-border/20 py-1">
                  <span><Badge variant="outline" className="text-[9px] mr-2">{a.kind}</Badge>{a.person ?? a.system ?? a.sop}</span>
                  <span className="text-muted-foreground">{a.role ?? a.due ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(data?.people ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">People (emails masked, no credentials shown)</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {data.people.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.person_name}</span>
                    <Badge variant="outline" className="text-[9px]">{p.role_type}</Badge>
                    <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
                    {p.email_masked && <span className="text-muted-foreground">{p.email_masked}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-[9px]">
                    <Badge variant="outline">NDA: {p.nda_status}</Badge>
                    <Badge variant="outline">Contract: {p.contract_status}</Badge>
                    <Badge variant="outline">Access: {p.data_access_level}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}