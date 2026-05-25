import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODLayout, PRODSection, PRODEmpty, NoAutoDeployBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { FEATURE_STATUS_TONE } from "@/lib/productEngine";

type Feature = {
  id: string; feature_name: string; feature_summary: string | null;
  feature_status: string; priority: string; owner: string | null;
  target_release_date: string | null; updated_at: string;
};

const STATUS_ORDER = ["idea", "planned", "in_build", "qa", "ready", "released", "paused", "retired"];

export default function ProductFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("product_features").select("*").order("updated_at", { ascending: false });
      setFeatures(data ?? []);
    })();
  }, []);

  return (
    <PRODLayout title="Feature roadmap" subtitle="All features across the portfolio with status, priority, owner and target release date. Product QA Agent suggests new features from support, customer success and incident signals.">
      <NoAutoDeployBanner />
      {features.length === 0 ? (
        <PRODEmpty title="No features tracked yet" hint="Features promoted from support tickets, customer feedback or strategic initiatives appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {STATUS_ORDER.map(status => {
            const col = features.filter(f => f.feature_status === status);
            if (col.length === 0) return null;
            return (
              <PRODSection key={status} title={`${status.replace("_", " ")} (${col.length})`}>
                <div className="space-y-2">
                  {col.map(f => (
                    <div key={f.id} className="rounded border border-border/50 p-2 space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-medium text-sm">{f.feature_name}</span>
                        <Badge variant="outline" className={`${FEATURE_STATUS_TONE[f.feature_status]} text-[10px]`}>{f.feature_status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{f.priority}</Badge>
                      </div>
                      {f.feature_summary && <p className="text-[11px] text-muted-foreground line-clamp-3">{f.feature_summary}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {f.owner ? `Owner ${f.owner}` : "Unassigned"}
                        {f.target_release_date ? ` · target ${f.target_release_date}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </PRODSection>
            );
          })}
        </div>
      )}
    </PRODLayout>
  );
}