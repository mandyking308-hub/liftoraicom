import { useEffect, useState } from "react";
import { AGLayout, AGSection, AGEmpty, AG_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function AccessGovernanceUsers() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [sys, setSys] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("access_assignments").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("access_systems").select("id,system_name,risk_level").then(({ data }: any) => {
      const m: Record<string, any> = {};
      (data ?? []).forEach((s: any) => { m[s.id] = s; });
      setSys(m);
    });
  }, []);
  const now = Date.now();
  return (
    <AGLayout title="Access assignments" subtitle="Who has access to which system, at what level, and whether that grant has been reviewed. Granting or changing real access is a founder/admin action.">
      <AGSection title="Assignments">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <AGEmpty title="No access assignments yet" hint="Record each user-to-system assignment so revocations and reviews can be tracked." />
          : (
            <div className="space-y-2">
              {rows.map((a) => {
                const expired = a.access_status === "active" && a.expires_at && new Date(a.expires_at).getTime() < now;
                return (
                  <div key={a.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.user_or_operator}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{sys[a.system_id]?.system_name || "Unknown system"}</span>
                      {a.access_level && <Badge variant="outline">{a.access_level}</Badge>}
                      <Badge variant="outline" className={AG_STATUS_TONE[a.access_status] || ""}>{a.access_status}</Badge>
                      {expired && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">past expiry</Badge>}
                    </div>
                    <p className="text-muted-foreground">
                      {a.granted_at ? `Granted ${new Date(a.granted_at).toLocaleDateString()}` : "Not yet granted"}
                      {a.expires_at ? ` · Expires ${new Date(a.expires_at).toLocaleDateString()}` : ""}
                      {a.revoked_at ? ` · Revoked ${new Date(a.revoked_at).toLocaleDateString()}` : ""}
                      {a.reviewed_at ? ` · Reviewed ${new Date(a.reviewed_at).toLocaleDateString()}` : " · Not reviewed"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
      </AGSection>
    </AGLayout>
  );
}