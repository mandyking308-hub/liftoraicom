import { useEffect, useState } from "react";
import { AGLayout, AGSection, AGEmpty, AG_RISK_TONE, NoRawSecretsBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function AccessGovernanceSecrets() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [sys, setSys] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("secret_inventory").select("*").order("secret_name").limit(500)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("access_systems").select("id,system_name").then(({ data }: any) => {
      const m: Record<string, any> = {};
      (data ?? []).forEach((s: any) => { m[s.id] = s; });
      setSys(m);
    });
  }, []);
  const now = Date.now();
  return (
    <AGLayout title="Secrets inventory" subtitle="Inventory of every API key, password, token, OAuth credential, webhook secret, SMTP/IMAP credential and payment credential. Only configured yes/no and rotation metadata are shown — never the raw value.">
      <NoRawSecretsBanner />
      <AGSection title="Secrets">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <AGEmpty title="No secrets tracked yet" hint="Add an inventory entry for each credential. The value is configured outside this UI in the Lovable Cloud secrets vault — only metadata lives here." />
          : (
            <div className="space-y-2">
              {rows.map((s) => {
                const dueNow = s.rotation_due_at && new Date(s.rotation_due_at).getTime() <= now;
                return (
                  <div key={s.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.secret_name}</span>
                      <Badge variant="outline">{s.secret_type}</Badge>
                      <Badge variant="outline" className={s.configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}>
                        {s.configured ? "configured" : "missing"}
                      </Badge>
                      <Badge variant="outline" className={AG_RISK_TONE[s.risk_level] || ""}>{s.risk_level} risk</Badge>
                      {!s.active && <Badge variant="outline" className="bg-muted text-muted-foreground">inactive</Badge>}
                      {dueNow && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">rotation overdue</Badge>}
                      {!s.last_rotated_at && s.configured && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">never rotated</Badge>}
                    </div>
                    <p className="text-muted-foreground">
                      System: {sys[s.system_id]?.system_name || "—"} · Owner: {s.owner || "—"} ·
                      {" "}Storage: {s.storage_location_summary || "—"}
                    </p>
                    <p className="text-muted-foreground">
                      Last rotated: {s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleDateString() : "never"} ·
                      {" "}Due: {s.rotation_due_at ? new Date(s.rotation_due_at).toLocaleDateString() : "not scheduled"}
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