import { useEffect, useState } from "react";
import { AGLayout, AGSection, AGEmpty, AG_RISK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function AccessGovernanceSystems() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("access_systems").select("*").order("system_name").limit(300)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  return (
    <AGLayout title="Systems" subtitle="Every system Liftor depends on — email, CRM, AI providers, voice, payments, calendars, social, hosting, databases, repos, analytics. High-risk systems must have a named owner.">
      <AGSection title="System list">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <AGEmpty title="No systems recorded yet" hint="Add the systems Liftor uses so secrets, access and rotations can be tracked against them." />
          : (
            <div className="space-y-2">
              {rows.map((s) => (
                <div key={s.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.system_name}</span>
                    <Badge variant="outline">{s.system_type}</Badge>
                    <Badge variant="outline" className={AG_RISK_TONE[s.risk_level] || ""}>{s.risk_level} risk</Badge>
                    {!s.active && <Badge variant="outline" className="bg-muted text-muted-foreground">inactive</Badge>}
                    {!s.owner && ["high","critical"].includes(s.risk_level) && (
                      <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">unknown owner</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Owner: {s.owner || "—"}{s.login_method_summary ? ` · Login: ${s.login_method_summary}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </AGSection>
    </AGLayout>
  );
}