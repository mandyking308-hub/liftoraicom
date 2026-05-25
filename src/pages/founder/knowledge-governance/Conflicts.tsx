import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KGLayout, KGSection, KGEmpty, NoUntrustedOverrideBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { CONFLICT_STATUS_TONE, CONFLICT_SEVERITY_TONE, CONFLICT_TYPE_LABEL } from "@/lib/knowledgeGovernanceEngine";

type Conflict = {
  id: string; conflict_type: string; conflict_summary: string;
  severity: string; resolution_status: string;
  source_a_id: string | null; source_b_id: string | null;
  resolved_value: string | null; resolved_by: string | null; resolved_at: string | null;
  updated_at: string;
};

const STATUS_ORDER = ["founder_review", "open", "resolved", "ignored"];

export default function KnowledgeConflicts() {
  const [rows, setRows] = useState<Conflict[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const [cRes, sRes] = await Promise.all([
        sb.from("knowledge_conflicts").select("*").order("updated_at", { ascending: false }),
        sb.from("knowledge_sources").select("id,title"),
      ]);
      setRows(cRes.data ?? []);
      const map: Record<string, string> = {};
      (sRes.data ?? []).forEach((s: any) => { map[s.id] = s.title; });
      setSources(map);
    })();
  }, []);

  return (
    <KGLayout title="Conflict resolution" subtitle="Two sources disagreeing about pricing, claims, policy, legal or product. Founder Review queue holds anything sensitive — the agent never resolves price, legal or policy conflicts without founder sign-off.">
      <NoUntrustedOverrideBanner />
      {rows.length === 0 ? (
        <KGEmpty title="No conflicts detected" hint="Conflicts between sources surface here as the agent scans." />
      ) : (
        STATUS_ORDER.map(status => {
          const col = rows.filter(c => c.resolution_status === status);
          if (col.length === 0) return null;
          return (
            <KGSection key={status} title={`${status.replace("_", " ")} (${col.length})`}>
              <div className="space-y-2">
                {col.map(c => (
                  <div key={c.id} className="rounded border border-border/50 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{CONFLICT_TYPE_LABEL[c.conflict_type] ?? c.conflict_type}</Badge>
                      <Badge variant="outline" className={`${CONFLICT_SEVERITY_TONE[c.severity]} text-[10px]`}>{c.severity}</Badge>
                      <Badge variant="outline" className={`${CONFLICT_STATUS_TONE[c.resolution_status]} text-[10px]`}>{c.resolution_status.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm">{c.conflict_summary}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Source A: {c.source_a_id ? (sources[c.source_a_id] ?? c.source_a_id.slice(0, 8)) : "—"}
                      {" · "}Source B: {c.source_b_id ? (sources[c.source_b_id] ?? c.source_b_id.slice(0, 8)) : "—"}
                    </p>
                    {c.resolved_value && <p className="text-[11px]"><span className="text-muted-foreground">Resolved as:</span> {c.resolved_value}{c.resolved_by ? ` (by ${c.resolved_by})` : ""}{c.resolved_at ? ` on ${new Date(c.resolved_at).toLocaleDateString()}` : ""}</p>}
                  </div>
                ))}
              </div>
            </KGSection>
          );
        })
      )}
    </KGLayout>
  );
}