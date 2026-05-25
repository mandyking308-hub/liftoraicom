import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODLayout, PRODSection, PRODEmpty, NoAutoDeployBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { BUG_SEVERITY_TONE, BUG_STATUS_TONE } from "@/lib/productEngine";

type Bug = {
  id: string; bug_title: string; bug_description: string | null;
  severity: string; bug_status: string; affected_area: string | null;
  user_impact: string | null; workaround: string | null;
  linked_incident_id: string | null; updated_at: string;
};

const STATUS_ORDER = ["new", "triaged", "in_fix", "qa", "fixed", "released", "wont_fix"];

export default function ProductBugs() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("product_bugs").select("*").order("updated_at", { ascending: false });
      setBugs(data ?? []);
    })();
  }, []);

  return (
    <PRODLayout title="Bug board" subtitle="All bugs across the portfolio with severity, status, user impact and workaround. Bugs link back to incidents and support tickets so Product QA Agent can keep the customer story whole.">
      <NoAutoDeployBanner />
      {bugs.length === 0 ? (
        <PRODEmpty title="No bugs tracked yet" hint="Bugs converted from support tickets, customer complaints or incident root cause appear here." />
      ) : (
        <div className="space-y-3">
          {STATUS_ORDER.map(status => {
            const col = bugs.filter(b => b.bug_status === status);
            if (col.length === 0) return null;
            return (
              <PRODSection key={status} title={`${status.replace("_", " ")} (${col.length})`}>
                <div className="space-y-2">
                  {col.map(b => (
                    <div key={b.id} className="rounded border border-border/50 p-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-medium text-sm">{b.bug_title}</span>
                        <Badge variant="outline" className={`${BUG_SEVERITY_TONE[b.severity]} text-[10px]`}>{b.severity}</Badge>
                        <Badge variant="outline" className={`${BUG_STATUS_TONE[b.bug_status]} text-[10px]`}>{b.bug_status}</Badge>
                        {b.linked_incident_id && <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">incident-linked</Badge>}
                      </div>
                      {b.bug_description && <p className="text-[11px] text-muted-foreground">{b.bug_description}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {b.affected_area ? `Area: ${b.affected_area}` : ""}
                        {b.user_impact ? ` · Impact: ${b.user_impact}` : ""}
                        {b.workaround ? ` · Workaround: ${b.workaround}` : ""}
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