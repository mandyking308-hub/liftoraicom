import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function KnowledgeSourceTruthPanel() {
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["knowledge-truth-check"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("knowledge-truth-check", { body: {} });
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const refresh = async () => {
    setBusy(true);
    try { await refetch(); toast.success("Knowledge truth refreshed."); }
    catch (e: any) { toast.error(e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const s = data?.summary ?? {};

  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Knowledge · Source Truth Layer
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Approval, freshness, reliability, conflicts, and risk for every knowledge source AI uses.
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[10px]">No auto-delete</Badge>
            <Badge variant="outline" className="text-[10px]">No external exposure</Badge>
            <Badge variant="outline" className="text-[10px]">Founder review required</Badge>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Sources" value={s.sources_total} />
          <Tile label="Approved" value={s.approved} tone="text-emerald-400" />
          <Tile label="Unreviewed" value={s.unreviewed} tone="text-amber-400" />
          <Tile label="Outdated" value={s.outdated} tone="text-amber-400" />
          <Tile label="Disputed" value={s.disputed} tone="text-amber-400" />
          <Tile label="Risky" value={s.risky} tone="text-red-400" />
          <Tile label="Low reliability" value={s.low_reliability} tone="text-red-400" />
          <Tile label="Open conflicts" value={s.conflicts_open} tone="text-red-400" />
        </div>

        {Number(s.internal_leak_risk ?? 0) > 0 && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-semibold">{s.internal_leak_risk} internal-only sources flagged customer-visible.</div>
              <div className="opacity-80">Founder must review before AI may use these in customer-facing drafts.</div>
            </div>
          </div>
        )}

        {Array.isArray(data?.next_actions) && data.next_actions.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Next actions
            </div>
            <ul className="space-y-1.5">
              {data.next_actions.map((a: any, i: number) => (
                <li key={i} className="text-xs rounded border border-border/40 bg-secondary/30 p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{a.kind}</Badge>
                    <span className="font-medium truncate">{a.label}</span>
                  </div>
                  {a.fix && <div className="text-muted-foreground mt-1">{a.fix}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {data?.disclaimer ?? 'Read-only. No sources deleted, exported or published.'}
        </p>
      </CardContent>
    </Card>
  );
}