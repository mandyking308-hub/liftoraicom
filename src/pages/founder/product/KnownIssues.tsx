import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODLayout, PRODSection, PRODEmpty, NoAutoDeployBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { BUG_SEVERITY_TONE, BUG_STATUS_TONE } from "@/lib/productEngine";

type Bug = {
  id: string; bug_title: string; bug_description: string | null;
  severity: string; bug_status: string; affected_area: string | null;
  user_impact: string | null; workaround: string | null;
};

export default function ProductKnownIssues() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("product_bugs")
        .select("id,bug_title,bug_description,severity,bug_status,affected_area,user_impact,workaround")
        .in("bug_status", ["wont_fix", "released", "qa", "in_fix"]);
      setBugs(data ?? []);
    })();
  }, []);

  const wontFix = bugs.filter(b => b.bug_status === "wont_fix");
  const inflight = bugs.filter(b => ["qa", "in_fix"].includes(b.bug_status));

  return (
    <PRODLayout title="Known issues" subtitle="Issues users may encounter. Customer Support, Customer Success and the public docs draw on this list so the team always speaks in one voice. Publishing to a public help centre still requires founder approval.">
      <NoAutoDeployBanner />

      <PRODSection title={`Documented known issues (${wontFix.length})`} description="Won't-fix or by-design issues with documented workarounds.">
        {wontFix.length === 0 ? <PRODEmpty title="No documented known issues" /> : (
          <div className="space-y-2">
            {wontFix.map(b => <BugRow key={b.id} b={b} />)}
          </div>
        )}
      </PRODSection>

      <PRODSection title={`Active issues with workaround (${inflight.length})`} description="Bugs currently in fix or QA that users may hit before the next release.">
        {inflight.length === 0 ? <PRODEmpty title="No active workarounds tracked" /> : (
          <div className="space-y-2">
            {inflight.map(b => <BugRow key={b.id} b={b} />)}
          </div>
        )}
      </PRODSection>
    </PRODLayout>
  );
}

function BugRow({ b }: { b: Bug }) {
  return (
    <div className="rounded border border-border/50 p-3 space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-medium text-sm">{b.bug_title}</span>
        <Badge variant="outline" className={`${BUG_SEVERITY_TONE[b.severity]} text-[10px]`}>{b.severity}</Badge>
        <Badge variant="outline" className={`${BUG_STATUS_TONE[b.bug_status]} text-[10px]`}>{b.bug_status}</Badge>
      </div>
      {b.bug_description && <p className="text-[11px] text-muted-foreground">{b.bug_description}</p>}
      {b.user_impact && <p className="text-[11px]"><span className="text-muted-foreground">Impact:</span> {b.user_impact}</p>}
      {b.workaround && <p className="text-[11px]"><span className="text-muted-foreground">Workaround:</span> {b.workaround}</p>}
      {b.affected_area && <p className="text-[10px] text-muted-foreground">Area: {b.affected_area}</p>}
    </div>
  );
}