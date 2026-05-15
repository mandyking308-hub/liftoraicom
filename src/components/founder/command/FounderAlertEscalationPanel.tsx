import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function FounderAlertEscalationPanel() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const run = async (confirm = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("founder-alert-run", { body: { confirm } });
      if (error) throw error;
      setStatus(data);
      if (confirm) qc.invalidateQueries({ queryKey: ["founder-notif-queue"] });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { run(false); }, []);

  const { data: queue } = useQuery({
    queryKey: ["founder-notif-queue"],
    queryFn: async () => {
      const { data } = await supabase.from("founder_notification_queue")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    refetchInterval: 30000,
  });
  const { data: rules } = useQuery({
    queryKey: ["founder-alert-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("founder_alert_rules").select("*").order("rule_name");
      return data ?? [];
    },
  });

  const mark = async (id: string, patch: any) => {
    await supabase.from("founder_notification_queue").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["founder-notif-queue"] });
  };

  const list = queue ?? [];
  const unread = list.filter((n: any) => n.status === "unread").length;
  const high = list.filter((n: any) => ["high", "critical"].includes(n.severity) && n.status !== "resolved").length;
  const action = list.filter((n: any) => n.founder_action_required && n.status !== "resolved").length;

  return (
    <Card className="tech-card border-primary/40" id="sec-founder-alerts">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Founder Alerts · Escalation · Mobile</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Internal Command Centre alert queue. Mobile/SMS/email channels are locked and require founder activation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">No external send</Badge>
            <Badge variant="outline" className="text-xs">No customer message</Badge>
            <Badge variant="outline" className="text-xs">No sensitive payload</Badge>
            <Badge variant="outline" className="text-xs">External channels locked</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Unread" value={unread} />
          <Stat label="High/Critical" value={high} />
          <Stat label="Action required" value={action} />
          <Stat label="Active rules" value={(rules ?? []).filter((r: any) => r.enabled).length} />
          <Stat label="Detected" value={status?.summary?.detected ?? 0} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => run(false)} disabled={loading}>{loading ? "Scanning…" : "Dry-run scan"}</Button>
          <Button size="sm" onClick={() => run(true)} disabled={loading}>Create alerts</Button>
        </div>
        <div className="space-y-1 max-h-80 overflow-auto">
          {list.map((n: any) => (
            <div key={n.id} className="flex items-center justify-between gap-2 text-xs border border-border/40 rounded px-2 py-1.5">
              <div className="min-w-0">
                <div className="font-medium truncate">{n.alert_title}</div>
                <div className="text-muted-foreground truncate">{n.severity} · {n.source_table ?? "—"} · {new Date(n.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {n.status === "unread" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => mark(n.id, { status: "read", read_at: new Date().toISOString() })}>Read</Button>
                )}
                {n.status !== "resolved" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => mark(n.id, { status: "resolved", resolved_at: new Date().toISOString() })}>Resolve</Button>
                )}
              </div>
            </div>
          ))}
          {!list.length && <div className="text-xs text-muted-foreground">No alerts in queue.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}