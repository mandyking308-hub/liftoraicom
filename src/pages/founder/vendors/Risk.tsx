import { useEffect, useState } from "react";
import { VNDLayout, VNDSection, VNDEmpty, VND_RISK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsRisk() {
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [missing, setMissing] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("vendor_risk_reviews")
      .select("id,vendor_id,risk_summary,data_accessed,security_notes,dpa_status,review_status,reviewed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setReviews(data ?? []));
    (async () => {
      const sb: any = supabase as any;
      const [{ data: vendors }, { data: r }] = await Promise.all([
        sb.from("vendors").select("id,vendor_name,vendor_type,risk_level,data_processor,dpa_required,active"),
        sb.from("vendor_risk_reviews").select("vendor_id,dpa_status"),
      ]);
      const dpaOk = new Set((r ?? []).filter((x: any) => ["in_place", "signed"].includes(x.dpa_status)).map((x: any) => x.vendor_id));
      const miss = (vendors ?? []).filter((v: any) => v.active && (v.data_processor || v.dpa_required) && !dpaOk.has(v.id));
      setMissing(miss);
    })();
  }, []);

  return (
    <VNDLayout title="Vendor risk board" subtitle="Data processing risk, security notes, DPA status. Vendors missing a required DPA are flagged here for legal/compliance follow-up.">
      <VNDSection title="Vendors missing required DPA">
        {!missing ? <p className="text-xs text-muted-foreground">Loading…</p>
          : missing.length === 0 ? <VNDEmpty title="All data-processing vendors have a DPA on file" />
          : (
            <div className="space-y-2">
              {missing.map((v) => (
                <div key={v.id} className="rounded border border-border/40 p-3 text-xs flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">DPA missing</Badge>
                  <span className="font-medium">{v.vendor_name}</span>
                  <Badge variant="outline">{v.vendor_type}</Badge>
                  {v.risk_level && <Badge variant="outline" className={VND_RISK_TONE[v.risk_level] || ""}>{v.risk_level} risk</Badge>}
                </div>
              ))}
            </div>
          )}
      </VNDSection>

      <VNDSection title="Risk reviews">
        {!reviews ? <p className="text-xs text-muted-foreground">Loading…</p>
          : reviews.length === 0 ? <VNDEmpty title="No risk reviews yet" hint="The Vendor Agent prepares risk reviews for new and high-risk vendors. Each requires founder sign-off." />
          : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{r.review_status}</Badge>
                    {r.dpa_status && <Badge variant="outline">DPA: {r.dpa_status}</Badge>}
                  </div>
                  {r.risk_summary && <p>{r.risk_summary}</p>}
                  {r.data_accessed && <p className="text-muted-foreground">Data accessed: {r.data_accessed}</p>}
                  {r.security_notes && <p className="text-muted-foreground">Security: {r.security_notes}</p>}
                  <p className="text-[10px] text-muted-foreground">Vendor {r.vendor_id?.slice(0,8)} · {new Date(r.created_at).toLocaleString()}{r.reviewed_at ? ` · reviewed ${new Date(r.reviewed_at).toLocaleString()}` : ""}</p>
                </div>
              ))}
            </div>
          )}
      </VNDSection>
    </VNDLayout>
  );
}