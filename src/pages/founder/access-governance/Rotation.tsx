import { useEffect, useState } from "react";
import { AGLayout, AGSection, AGEmpty, AG_RISK_TONE, NoRawSecretsBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function AccessGovernanceRotation() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [sys, setSys] = useState<Record<string, any>>({});
  useEffect(() => {
    (supabase as any).from("secret_inventory").select("*").eq("active", true).limit(500)
      .then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("access_systems").select("id,system_name").then(({ data }: any) => {
      const m: Record<string, any> = {}; (data ?? []).forEach((s: any) => { m[s.id] = s; }); setSys(m);
    });
  }, []);
  const now = Date.now();
  const in30 = now + 30 * 86400000;
  const buckets = {
    overdue: [] as any[], next30: [] as any[], later: [] as any[], unscheduled: [] as any[],
  };
  (rows ?? []).forEach((s) => {
    if (!s.configured) return;
    if (!s.rotation_due_at) { buckets.unscheduled.push(s); return; }
    const t = new Date(s.rotation_due_at).getTime();
    if (t <= now) buckets.overdue.push(s);
    else if (t <= in30) buckets.next30.push(s);
    else buckets.later.push(s);
  });

  const Bucket = ({ title, list, tone }: { title: string; list: any[]; tone: string }) => (
    <AGSection title={`${title} (${list.length})`}>
      {list.length === 0 ? <p className="text-xs text-muted-foreground">None.</p>
        : (
          <div className="space-y-2">
            {list.map((s) => (
              <div key={s.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.secret_name}</span>
                  <Badge variant="outline">{s.secret_type}</Badge>
                  <Badge variant="outline" className={AG_RISK_TONE[s.risk_level] || ""}>{s.risk_level}</Badge>
                  <Badge variant="outline" className={tone}>
                    {s.rotation_due_at ? `due ${new Date(s.rotation_due_at).toLocaleDateString()}` : "no schedule"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  System: {sys[s.system_id]?.system_name || "—"} · Owner: {s.owner || "—"} ·
                  {" "}Last rotated: {s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleDateString() : "never"}
                </p>
              </div>
            ))}
          </div>
        )}
    </AGSection>
  );

  return (
    <AGLayout title="Rotation calendar" subtitle="Rotation checklist for active configured secrets. The agent only prepares the schedule — rotating a real secret remains a founder/admin action performed outside this UI.">
      <NoRawSecretsBanner />
      {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
        : (rows.length === 0) ? <AGEmpty title="No active secrets to rotate" />
        : (
          <>
            <Bucket title="Overdue" list={buckets.overdue} tone="bg-red-500/15 text-red-400 border-red-500/30" />
            <Bucket title="Due next 30 days" list={buckets.next30} tone="bg-yellow-500/15 text-yellow-300 border-yellow-500/30" />
            <Bucket title="Unscheduled" list={buckets.unscheduled} tone="bg-orange-500/15 text-orange-400 border-orange-500/30" />
            <Bucket title="Scheduled later" list={buckets.later} tone="bg-blue-500/15 text-blue-400 border-blue-500/30" />
          </>
        )}
    </AGLayout>
  );
}