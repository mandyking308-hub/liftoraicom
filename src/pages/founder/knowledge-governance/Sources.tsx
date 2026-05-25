import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KGLayout, KGSection, KGEmpty, NoUntrustedOverrideBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { TRUST_TONE, SOURCE_TYPE_LABEL } from "@/lib/knowledgeGovernanceEngine";

type Source = {
  id: string; title: string; summary: string | null;
  source_type: string; trust_level: string; source_url: string | null;
  file_reference: string | null; last_verified_at: string | null;
  verified_by: string | null; expires_at: string | null; active: boolean; updated_at: string;
};

const TRUST_ORDER = ["founder_approved", "high", "medium", "low", "untrusted"];

export default function KnowledgeSources() {
  const [rows, setRows] = useState<Source[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("knowledge_sources").select("*").order("updated_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, []);

  return (
    <KGLayout title="Source library" subtitle="Every catalogued knowledge source grouped by trust level. External and uploaded content defaults to untrusted until reviewed.">
      <NoUntrustedOverrideBanner />
      {rows.length === 0 ? (
        <KGEmpty title="No sources catalogued yet" hint="Add manuals, pricing sheets, founder notes and policies — the agent will keep them aligned." />
      ) : (
        TRUST_ORDER.map(trust => {
          const col = rows.filter(s => s.trust_level === trust);
          if (col.length === 0) return null;
          return (
            <KGSection key={trust} title={`${trust.replace("_", " ")} (${col.length})`}>
              <div className="space-y-2">
                {col.map(s => (
                  <div key={s.id} className="rounded border border-border/50 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium text-sm">{s.title}</span>
                      <Badge variant="outline" className={`${TRUST_TONE[s.trust_level]} text-[10px]`}>{s.trust_level.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABEL[s.source_type] ?? s.source_type}</Badge>
                      {!s.active && <Badge variant="outline" className="text-[10px] bg-muted">archived</Badge>}
                    </div>
                    {s.summary && <p className="text-[11px] text-muted-foreground">{s.summary}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {s.last_verified_at ? `Verified ${new Date(s.last_verified_at).toLocaleDateString()}${s.verified_by ? ` by ${s.verified_by}` : ""}` : "Never verified"}
                      {s.expires_at ? ` · expires ${new Date(s.expires_at).toLocaleDateString()}` : ""}
                      {s.source_url ? ` · ${s.source_url}` : ""}
                      {s.file_reference ? ` · file ${s.file_reference}` : ""}
                    </p>
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