import { useEffect, useState } from "react";
import { PPLLayout, PPLSection, PPLEmpty, PPL_ACCESS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PeopleAccess() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [ops, setOps] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("human_operator_access")
      .select("*").order("created_at", { ascending: false }).limit(300)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("human_operators").select("id,name").then(({ data }: any) => {
      const m: Record<string, any> = {};
      (data ?? []).forEach((o: any) => { m[o.id] = o; });
      setOps(m);
    });
  }, []);
  const now = Date.now();
  return (
    <PPLLayout title="Access checklist" subtitle="Per-operator, per-system access tracking. Access is never granted automatically — every request is logged here and must be approved and provisioned by the founder via the Approval Queue and Access/Secrets module.">
      <PPLSection title="Access records">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PPLEmpty title="No access records yet" hint="Add an access request when an operator needs a system. Status stays in 'requested' until founder grants it." />
          : (
            <div className="space-y-2">
              {rows.map((r) => {
                const expiringSoon = r.access_status === "active" && r.expires_at && new Date(r.expires_at).getTime() <= now + 30*86400000;
                return (
                  <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{ops[r.operator_id]?.name || "Unknown operator"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{r.system_name}</span>
                      {r.access_level && <Badge variant="outline">{r.access_level}</Badge>}
                      <Badge variant="outline" className={PPL_ACCESS_TONE[r.access_status] || ""}>{r.access_status}</Badge>
                      {expiringSoon && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">expires soon</Badge>}
                    </div>
                    <p className="text-muted-foreground">
                      {r.granted_at ? `Granted ${new Date(r.granted_at).toLocaleDateString()}` : "Not yet granted"}
                      {r.expires_at ? ` · Expires ${new Date(r.expires_at).toLocaleDateString()}` : ""}
                      {r.revoked_at ? ` · Revoked ${new Date(r.revoked_at).toLocaleDateString()}` : ""}
                    </p>
                    {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
      </PPLSection>
    </PPLLayout>
  );
}