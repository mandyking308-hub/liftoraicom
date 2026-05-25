import { useEffect, useState } from "react";
import { AGLayout, AGSection, AGEmpty, AG_SEVERITY_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { redactSecretLikeStrings } from "@/lib/accessGovernanceEngine";

export default function AccessGovernanceAudit() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [sys, setSys] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("access_audit_events").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("access_systems").select("id,system_name").then(({ data }: any) => {
      const m: Record<string, any> = {}; (data ?? []).forEach((s: any) => { m[s.id] = s; }); setSys(m);
    });
  }, []);
  return (
    <AGLayout title="Audit events" subtitle="Append-only log of access requests, grants, revocations, secret configurations, rotation milestones, leak-prevention triggers and suspicious access. Any secret-like strings in summaries are auto-redacted before display.">
      <AGSection title="Events">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <AGEmpty title="No audit events yet" hint="Events are written by the Access Governance Agent and integration hooks." />
          : (
            <div className="space-y-2">
              {rows.map((e) => (
                <div key={e.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.event_type}</Badge>
                    <Badge variant="outline" className={AG_SEVERITY_TONE[e.severity] || ""}>{e.severity}</Badge>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                    {e.system_id && <span className="text-muted-foreground">· {sys[e.system_id]?.system_name || "—"}</span>}
                  </div>
                  {e.event_summary && <p className="text-muted-foreground">{redactSecretLikeStrings(e.event_summary)}</p>}
                </div>
              ))}
            </div>
          )}
      </AGSection>
    </AGLayout>
  );
}