import { useEffect, useState } from "react";
import { PRLayout, PRSection, PREmpty, PR_BREACH_TONE, PR_RISK_TONE, NoAutoActionsBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PrivacyBreaches() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("privacy_breach_events").select("*").order("discovered_at", { ascending: false }).limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  return (
    <PRLayout title="Breach event board" subtitle="Suspected through closed. Regulator and customer notifications never go out without founder/legal approval — the agent only prepares the timeline and content.">
      <NoAutoActionsBanner />
      <PRSection title="Events">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PREmpty title="No breach events" hint="The Privacy Agent will record suspected events the moment they are detected. Status stays in 'suspected' until investigated." />
          : (
            <div className="space-y-2">
              {rows.map((b) => (
                <div key={b.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={PR_BREACH_TONE[b.breach_status] || ""}>{b.breach_status}</Badge>
                    <Badge variant="outline" className={PR_RISK_TONE[b.severity] || ""}>{b.severity}</Badge>
                    {b.people_affected_count != null && <Badge variant="outline">{b.people_affected_count} people</Badge>}
                    {b.founder_approval_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">founder approval</Badge>}
                  </div>
                  <p className="font-medium">{b.event_summary}</p>
                  {b.data_affected && <p className="text-muted-foreground">Data: {b.data_affected}</p>}
                  <p className="text-muted-foreground">
                    Discovered {new Date(b.discovered_at).toLocaleString()}
                    {b.contained_at ? ` · Contained ${new Date(b.contained_at).toLocaleString()}` : ""}
                    {b.reported_at ? ` · Reported ${new Date(b.reported_at).toLocaleString()}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </PRSection>
    </PRLayout>
  );
}