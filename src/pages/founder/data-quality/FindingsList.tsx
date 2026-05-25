import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DQSection, DQEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { DQ_FINDING_LABEL, DQ_SEVERITY_TONE, DQ_STATUS_TONE } from "@/lib/dataQualityEngine";

type Finding = {
  id: string; finding_type: string; severity: string; fix_status: string;
  source_table: string | null; source_record_id: string | null;
  finding_summary: string; recommended_fix: string | null; updated_at: string;
};

export default function FindingsList({ types, emptyTitle, emptyHint, title }: { types: string[]; emptyTitle: string; emptyHint?: string; title: string }) {
  const [rows, setRows] = useState<Finding[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("data_quality_findings")
        .select("*")
        .in("finding_type", types)
        .order("updated_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, [types.join(",")]);

  return (
    <DQSection title={`${title} (${rows.length})`}>
      {rows.length === 0 ? <DQEmpty title={emptyTitle} hint={emptyHint} /> : (
        <div className="space-y-2">
          {rows.map(f => (
            <div key={f.id} className="rounded border border-border/50 p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline" className="text-[10px]">{DQ_FINDING_LABEL[f.finding_type] ?? f.finding_type}</Badge>
                <Badge variant="outline" className={`${DQ_SEVERITY_TONE[f.severity]} text-[10px]`}>{f.severity}</Badge>
                <Badge variant="outline" className={`${DQ_STATUS_TONE[f.fix_status]} text-[10px]`}>{f.fix_status.replace("_", " ")}</Badge>
                {f.source_table && <Badge variant="outline" className="text-[10px]">{f.source_table}{f.source_record_id ? `#${f.source_record_id.slice(0, 8)}` : ""}</Badge>}
              </div>
              <p className="text-sm">{f.finding_summary}</p>
              {f.recommended_fix && <p className="text-[11px] text-muted-foreground"><span className="uppercase">Recommended fix:</span> {f.recommended_fix}</p>}
            </div>
          ))}
        </div>
      )}
    </DQSection>
  );
}