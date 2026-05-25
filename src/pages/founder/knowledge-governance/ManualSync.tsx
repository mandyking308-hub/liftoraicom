import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KGLayout, KGSection, KGEmpty, KGStat, NoUntrustedOverrideBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { TRUST_TONE, SOURCE_TYPE_LABEL } from "@/lib/knowledgeGovernanceEngine";

type Source = {
  id: string; title: string; source_type: string; trust_level: string;
  last_verified_at: string | null; updated_at: string; active: boolean;
};

export default function KnowledgeManualSync() {
  const [rows, setRows] = useState<Source[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("knowledge_sources")
        .select("id,title,source_type,trust_level,last_verified_at,updated_at,active")
        .in("source_type", ["manual", "policy", "pricing_sheet", "product_sheet"])
        .order("updated_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, []);

  const manuals = rows.filter(r => r.active);
  const approved = manuals.filter(r => r.trust_level === "founder_approved");
  const needsReview = manuals.filter(r => r.trust_level !== "founder_approved");
  const recently = manuals.filter(r => r.last_verified_at && Date.now() - new Date(r.last_verified_at).getTime() < 30 * 86400000);

  return (
    <KGLayout title="Manual sync status" subtitle="Tracks which manuals, policies, pricing and product sheets are aligned with founder-approved truth. Manuals are the single source of truth for sales, voice and support agents.">
      <NoUntrustedOverrideBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KGStat label="Manuals tracked" value={manuals.length} />
        <KGStat label="Founder-approved" value={approved.length} tone="good" />
        <KGStat label="Need review" value={needsReview.length} tone={needsReview.length > 0 ? "warn" : "good"} />
        <KGStat label="Verified <30d" value={recently.length} tone={recently.length > 0 ? "good" : "warn"} />
      </div>

      <KGSection title={`Manuals & policies (${manuals.length})`}>
        {manuals.length === 0 ? <KGEmpty title="No manuals or policies tracked" hint="Add manuals, policies, pricing sheets and product sheets to the source library." /> : (
          <div className="space-y-2">
            {manuals.map(r => (
              <div key={r.id} className="rounded border border-border/50 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-sm">{r.title}</span>
                  <Badge variant="outline" className={`${TRUST_TONE[r.trust_level]} text-[10px]`}>{r.trust_level.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABEL[r.source_type] ?? r.source_type}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {r.last_verified_at ? `Last verified ${new Date(r.last_verified_at).toLocaleDateString()}` : "Never verified"}
                  {" · "}updated {new Date(r.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </KGSection>
    </KGLayout>
  );
}