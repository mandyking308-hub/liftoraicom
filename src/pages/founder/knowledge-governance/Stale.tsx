import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KGLayout, KGSection, KGEmpty, NoUntrustedOverrideBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { TRUST_TONE, SOURCE_TYPE_LABEL } from "@/lib/knowledgeGovernanceEngine";

type Source = {
  id: string; title: string; source_type: string; trust_level: string;
  last_verified_at: string | null; expires_at: string | null; active: boolean; verified_by: string | null;
};

const STALE_DAYS = 90;

export default function KnowledgeStale() {
  const [rows, setRows] = useState<Source[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("knowledge_sources")
        .select("id,title,source_type,trust_level,last_verified_at,expires_at,active,verified_by")
        .eq("active", true);
      setRows(data ?? []);
    })();
  }, []);

  const now = Date.now();
  const cutoff = now - STALE_DAYS * 86400000;
  const expired = rows.filter(r => r.expires_at && new Date(r.expires_at).getTime() < now);
  const stale = rows.filter(r => !r.expires_at || new Date(r.expires_at).getTime() >= now)
    .filter(r => !r.last_verified_at || new Date(r.last_verified_at).getTime() < cutoff);

  return (
    <KGLayout title="Stale source warnings" subtitle="Sources not verified in the last 90 days or past their expiry date. Stale sources are de-prioritised when feeding sales/voice/support context.">
      <NoUntrustedOverrideBanner />

      <KGSection title={`Expired (${expired.length})`} description="Past explicit expiry — re-verify or retire before using.">
        {expired.length === 0 ? <KGEmpty title="No expired sources" /> : (
          <div className="space-y-2">
            {expired.map(r => <Row key={r.id} r={r} />)}
          </div>
        )}
      </KGSection>

      <KGSection title={`Stale (${stale.length})`} description={`Not verified in ${STALE_DAYS} days.`}>
        {stale.length === 0 ? <KGEmpty title="No stale sources" /> : (
          <div className="space-y-2">
            {stale.map(r => <Row key={r.id} r={r} />)}
          </div>
        )}
      </KGSection>
    </KGLayout>
  );
}

function Row({ r }: { r: Source }) {
  return (
    <div className="rounded border border-border/50 p-3 space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-medium text-sm">{r.title}</span>
        <Badge variant="outline" className={`${TRUST_TONE[r.trust_level]} text-[10px]`}>{r.trust_level.replace("_", " ")}</Badge>
        <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABEL[r.source_type] ?? r.source_type}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {r.last_verified_at ? `Last verified ${new Date(r.last_verified_at).toLocaleDateString()}${r.verified_by ? ` by ${r.verified_by}` : ""}` : "Never verified"}
        {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : ""}
      </p>
    </div>
  );
}