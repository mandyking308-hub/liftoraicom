import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODLayout, PRODSection, PRODEmpty, NoAutoDeployBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { RELEASE_STATUS_TONE } from "@/lib/productEngine";

type Release = {
  id: string; release_name: string; release_status: string;
  release_notes: string | null; risk_summary: string | null;
  rollback_plan: string | null; founder_approval_required: boolean;
  approved_at: string | null; approved_by: string | null;
  released_at: string | null; features_included: any[]; bugs_fixed: any[];
  updated_at: string;
};

export default function ProductReleases() {
  const [rows, setRows] = useState<Release[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("release_records").select("*").order("updated_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, []);

  return (
    <PRODLayout title="Release dashboard" subtitle="Every release draft, QA candidate, approved release and rolled-back release. Product QA Agent drafts release notes from features and bugs included. Production deploy requires founder approval.">
      <NoAutoDeployBanner />
      {rows.length === 0 ? (
        <PRODEmpty title="No releases drafted yet" hint="Bundle ready features and fixed bugs into a release draft." />
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <PRODSection key={r.id} title={r.release_name} actions={
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className={`${RELEASE_STATUS_TONE[r.release_status]} text-[10px]`}>{r.release_status}</Badge>
                {r.founder_approval_required && !r.approved_at && (
                  <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">awaiting founder approval</Badge>
                )}
                {r.released_at && <Badge variant="outline" className="text-[10px]">released {new Date(r.released_at).toLocaleDateString()}</Badge>}
              </div>
            }>
              <div className="space-y-2 text-xs">
                {r.release_notes && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Release notes (draft)</p>
                    <p className="whitespace-pre-wrap text-foreground">{r.release_notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Features included</p>
                    {Array.isArray(r.features_included) && r.features_included.length > 0 ? (
                      <ul className="list-disc pl-4">
                        {r.features_included.map((f: any, i: number) => <li key={i}>{f?.name ?? f?.title ?? String(f)}</li>)}
                      </ul>
                    ) : <p className="text-muted-foreground">None</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Bugs fixed</p>
                    {Array.isArray(r.bugs_fixed) && r.bugs_fixed.length > 0 ? (
                      <ul className="list-disc pl-4">
                        {r.bugs_fixed.map((b: any, i: number) => <li key={i}>{b?.title ?? b?.name ?? String(b)}</li>)}
                      </ul>
                    ) : <p className="text-muted-foreground">None</p>}
                  </div>
                </div>
                {r.risk_summary && <p><span className="text-muted-foreground">Risk:</span> {r.risk_summary}</p>}
                {r.rollback_plan && <p><span className="text-muted-foreground">Rollback plan:</span> {r.rollback_plan}</p>}
                {r.approved_at && <p className="text-[10px] text-muted-foreground">Approved by {r.approved_by ?? "founder"} on {new Date(r.approved_at).toLocaleString()}</p>}
              </div>
            </PRODSection>
          ))}
        </div>
      )}
    </PRODLayout>
  );
}