import { useEffect, useState } from "react";
import { PRLayout, PRSection, PREmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PrivacyRetention() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("data_retention_rules").select("*").order("data_category").limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  return (
    <PRLayout title="Retention rules" subtitle="Per-business, per-category retention period and deletion action with lawful basis. Rules are tracked here — the actual deletion runs as an approved scheduled job, never automatically.">
      <PRSection title="Rules">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PREmpty title="No retention rules defined yet" hint="Add a rule per data category (leads, customers, recordings, logs, financial records) so the Privacy Agent can flag expired data." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.data_category}</span>
                    <Badge variant="outline">{r.retention_period_days}d</Badge>
                    <Badge variant="outline">{r.deletion_action}</Badge>
                    {!r.active && <Badge variant="outline" className="bg-muted text-muted-foreground">inactive</Badge>}
                  </div>
                  <p className="text-muted-foreground">Legal basis: {r.legal_basis || "—"}</p>
                </div>
              ))}
            </div>
          )}
      </PRSection>
    </PRLayout>
  );
}