import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KGLayout, KGSection, KGEmpty, NoUntrustedOverrideBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { CLAIM_STATUS_TONE, CLAIM_TYPE_LABEL } from "@/lib/knowledgeGovernanceEngine";

type Claim = {
  id: string; claim_text: string; claim_type: string;
  approval_status: string; evidence_source_id: string | null;
  approved_by: string | null; approved_at: string | null;
  product_id: string | null; updated_at: string;
};

const STATUS_ORDER = ["founder_approved", "draft", "prohibited", "retired"];

export default function KnowledgeApprovedClaims() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const [cRes, sRes] = await Promise.all([
        sb.from("approved_claims").select("*").order("updated_at", { ascending: false }),
        sb.from("knowledge_sources").select("id,title"),
      ]);
      setRows(cRes.data ?? []);
      const map: Record<string, string> = {};
      (sRes.data ?? []).forEach((s: any) => { map[s.id] = s.title; });
      setSources(map);
    })();
  }, []);

  return (
    <KGLayout title="Approved claims library" subtitle="Founder-approved claims about benefits, results, guarantees, pricing, features, compliance and proof. Sales, voice and support can only speak in these claims. Prohibited claims are blocked at the gateway.">
      <NoUntrustedOverrideBanner />
      {rows.length === 0 ? (
        <KGEmpty title="No claims captured yet" hint="Promote founder-approved claims from sales, marketing and product. The agent drafts new claims for review." />
      ) : (
        STATUS_ORDER.map(status => {
          const col = rows.filter(c => c.approval_status === status);
          if (col.length === 0) return null;
          return (
            <KGSection key={status} title={`${status.replace("_", " ")} (${col.length})`}>
              <div className="space-y-2">
                {col.map(c => (
                  <div key={c.id} className="rounded border border-border/50 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{CLAIM_TYPE_LABEL[c.claim_type] ?? c.claim_type}</Badge>
                      <Badge variant="outline" className={`${CLAIM_STATUS_TONE[c.approval_status]} text-[10px]`}>{c.approval_status.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm">{c.claim_text}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.evidence_source_id ? `Evidence: ${sources[c.evidence_source_id] ?? c.evidence_source_id.slice(0, 8)}` : "No evidence source linked"}
                      {c.approved_by ? ` · approved by ${c.approved_by}` : ""}
                      {c.approved_at ? ` · ${new Date(c.approved_at).toLocaleDateString()}` : ""}
                      {c.product_id ? ` · product ${c.product_id.slice(0, 8)}` : ""}
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