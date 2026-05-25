import { useEffect, useState } from "react";
import { AGLayout, AGSection, AGEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function AccessGovernanceRevocation() {
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [operators, setOperators] = useState<Record<string, any>>({});
  const [sys, setSys] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("access_assignments").select("*").eq("access_status", "active").limit(500)
      .then(({ data }: any) => setAssignments(data ?? []));
    (supabase as any).from("access_systems").select("id,system_name").then(({ data }: any) => {
      const m: Record<string, any> = {}; (data ?? []).forEach((s: any) => { m[s.id] = s; }); setSys(m);
    });
    (supabase as any).from("human_operators").select("name,status").then(({ data }: any) => {
      const m: Record<string, any> = {}; (data ?? []).forEach((o: any) => { m[o.name.toLowerCase()] = o; }); setOperators(m);
    });
  }, []);

  const now = Date.now();
  const items = (assignments ?? []).map((a) => {
    const op = operators[(a.user_or_operator || "").toLowerCase()];
    const offboarded = op && (op.status === "offboarded" || op.status === "paused");
    const expired = a.expires_at && new Date(a.expires_at).getTime() < now;
    const reasons: string[] = [];
    if (offboarded) reasons.push(`operator ${op.status}`);
    if (expired) reasons.push("past expiry");
    return { a, reasons };
  }).filter((x) => x.reasons.length > 0);

  return (
    <AGLayout title="Revocation checklist" subtitle="Active access that should be revoked — because the operator is offboarded, their assignment has expired, or the system has been retired. Revocation itself is a founder/admin action.">
      <AGSection title="Needs revocation">
        {!assignments ? <p className="text-xs text-muted-foreground">Loading…</p>
          : items.length === 0 ? <AGEmpty title="Nothing to revoke" hint="No active assignments belong to offboarded operators or sit past their expiry date." />
          : (
            <div className="space-y-2">
              {items.map(({ a, reasons }) => (
                <div key={a.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.user_or_operator}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{sys[a.system_id]?.system_name || "Unknown system"}</span>
                    {reasons.map((r) => (
                      <Badge key={r} variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">{r}</Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    Granted {a.granted_at ? new Date(a.granted_at).toLocaleDateString() : "—"}
                    {a.expires_at ? ` · Expired ${new Date(a.expires_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </AGSection>
    </AGLayout>
  );
}