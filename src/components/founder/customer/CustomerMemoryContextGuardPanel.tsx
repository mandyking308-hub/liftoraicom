import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ShieldAlert, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function CustomerMemoryContextGuardPanel({ businessId, contactId }: { businessId?: string | null; contactId?: string | null }) {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['customer-memory-guard', businessId ?? null, contactId ?? null],
    queryFn: async () => {
      let memQ = supabase.from('customer_memory_profiles').select('*').limit(50).order('updated_at', { ascending: false });
      let chkQ = supabase.from('response_context_checks').select('id, action_type, agent_key, allowed_to_draft, allowed_to_send, context_quality_score, blockers, missing_context, created_at').limit(20).order('created_at', { ascending: false });
      if (contactId) { memQ = memQ.eq('contact_id', contactId); chkQ = chkQ.eq('contact_id', contactId); }
      else if (businessId) { memQ = memQ.eq('business_id', businessId); chkQ = chkQ.eq('business_id', businessId); }
      const [mem, chk] = await Promise.all([memQ, chkQ]);
      return { profiles: mem.data ?? [], checks: chk.data ?? [] };
    },
    staleTime: 30_000,
  });

  const profile = data?.profiles?.[0];
  const checks = data?.checks ?? [];
  const blockedDrafts = checks.filter((c: any) => !c.allowed_to_draft).length;
  const totalProfiles = data?.profiles?.length ?? 0;

  const onRefresh = async () => {
    if (!contactId) return;
    setRefreshing(true);
    try {
      await supabase.functions.invoke('customer-memory-refresh', { body: { business_id: businessId, contact_id: contactId } });
      await refetch();
    } finally { setRefreshing(false); }
  };

  const Tile = ({ label, value }: any) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-customer-memory-guard">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Brain size={14} className="text-primary" /> Customer Memory & CRM Context Guard</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]"><ShieldAlert size={10} className="mr-1" /> AI must check CRM before drafting</Badge>
            {contactId && <Button size="sm" variant="outline" disabled={refreshing} onClick={onRefresh}><RefreshCw size={12} className="mr-1" />{refreshing ? 'Refreshing…' : 'Refresh memory'}</Button>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Tile label="Memory profiles" value={totalProfiles} />
          <Tile label="Recent context checks" value={checks.length} />
          <Tile label="Drafts blocked" value={blockedDrafts} />
          <Tile label="Latest score" value={profile ? '—' : '—'} />
        </div>
        {profile ? (
          <div className="rounded-lg border border-border/50 p-3 mb-3">
            <div className="text-xs text-muted-foreground mb-1">Profile summary</div>
            <div className="text-sm">{profile.customer_summary ?? '—'}</div>
            {(profile.risk_flags ?? []).length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {(profile.risk_flags as any[]).map((f, i) => <Badge key={i} variant="outline" className="border-destructive/40 text-destructive text-[10px]">{String(f)}</Badge>)}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-3">No memory profile loaded for this scope.</p>
        )}
        <div className="space-y-1">
          <div className="text-xs font-medium mb-1">Recent context checks</div>
          {checks.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No checks yet.</p>
          ) : checks.slice(0, 6).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between text-[11px] border-b border-border/30 py-1">
              <span className="truncate">{c.agent_key ?? c.action_type}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{c.context_quality_score != null ? `${Math.round(Number(c.context_quality_score)*100)}%` : '—'}</span>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${c.allowed_to_draft ? 'border-green-500/40 text-green-300' : 'border-destructive/40 text-destructive'}`}>
                  {c.allowed_to_draft ? 'draft ok' : 'blocked'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Send is always blocked from the guard — founder approval required for any external send.</p>
      </CardContent>
    </Card>
  );
}