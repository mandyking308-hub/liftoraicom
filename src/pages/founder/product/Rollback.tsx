import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODLayout, PRODSection, PRODEmpty, NoAutoDeployBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { RELEASE_STATUS_TONE } from "@/lib/productEngine";

type Release = {
  id: string; release_name: string; release_status: string;
  rollback_plan: string | null; risk_summary: string | null;
  released_at: string | null;
};

export default function ProductRollback() {
  const [rows, setRows] = useState<Release[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("release_records")
        .select("id,release_name,release_status,rollback_plan,risk_summary,released_at")
        .order("released_at", { ascending: false, nullsFirst: false });
      setRows(data ?? []);
    })();
  }, []);

  const released = rows.filter(r => ["released", "rolled_back"].includes(r.release_status));
  const pending = rows.filter(r => !["released", "rolled_back", "cancelled"].includes(r.release_status));

  return (
    <PRODLayout title="Rollback plans" subtitle="Every release must declare a rollback plan before founder approval. Product QA Agent recommends rollback when post-release telemetry shows regression. Rollback execution itself stays under founder control.">
      <NoAutoDeployBanner />

      <PRODSection title={`Live & released (${released.length})`}>
        {released.length === 0 ? <PRODEmpty title="No live releases" /> : (
          <div className="space-y-2">
            {released.map(r => (
              <div key={r.id} className="rounded border border-border/50 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-sm">{r.release_name}</span>
                  <Badge variant="outline" className={`${RELEASE_STATUS_TONE[r.release_status]} text-[10px]`}>{r.release_status}</Badge>
                </div>
                {r.rollback_plan ? (
                  <p className="text-xs"><span className="text-muted-foreground">Rollback plan:</span> {r.rollback_plan}</p>
                ) : (
                  <p className="text-xs text-red-400">No rollback plan recorded — capture before next release.</p>
                )}
                {r.risk_summary && <p className="text-[11px] text-muted-foreground">Risk: {r.risk_summary}</p>}
              </div>
            ))}
          </div>
        )}
      </PRODSection>

      <PRODSection title={`Pending rollback review (${pending.length})`} description="Drafts and QA candidates without a rollback plan can't be approved for production.">
        {pending.length === 0 ? <PRODEmpty title="All in-flight releases have rollback plans" /> : (
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="rounded border border-border/50 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-sm">{r.release_name}</span>
                  <Badge variant="outline" className={`${RELEASE_STATUS_TONE[r.release_status]} text-[10px]`}>{r.release_status}</Badge>
                  {!r.rollback_plan && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">no rollback plan</Badge>}
                </div>
                {r.rollback_plan && <p className="text-xs"><span className="text-muted-foreground">Plan:</span> {r.rollback_plan}</p>}
              </div>
            ))}
          </div>
        )}
      </PRODSection>
    </PRODLayout>
  );
}