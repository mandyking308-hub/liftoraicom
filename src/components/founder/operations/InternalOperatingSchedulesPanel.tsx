import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Lock, Play, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Schedule = {
  id: string;
  schedule_key: string;
  schedule_name: string;
  run_scope: string;
  enabled: boolean;
  safe_internal_only: boolean;
  external_actions_allowed: boolean;
  cron_expression: string | null;
  frequency_label: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  status: string;
  metadata: any;
};

export function InternalOperatingSchedulesPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("internal_operating_schedules").select("*").order("schedule_name");
    setRows((data ?? []) as Schedule[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (s: Schedule, enabled: boolean) => {
    const { error } = await supabase.from("internal_operating_schedules")
      .update({ enabled, status: enabled ? "scheduled" : "paused" }).eq("id", s.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: enabled ? "Enabled" : "Paused", description: s.schedule_name }); load(); }
  };

  const runOne = async (s: Schedule) => {
    setRunning(s.schedule_key);
    try {
      const { data, error } = await supabase.functions.invoke("internal-schedule-runner", {
        body: { schedule_key: s.schedule_key, force: true },
      });
      if (error) throw error;
      setLastResult(data);
      const a = (data as any)?.aggregate ?? {};
      toast({ title: `Ran ${s.schedule_name}`, description: `tasks +${a.tasks_created ?? 0} · drafts +${a.drafts_created ?? 0} · approvals +${a.approvals_created ?? 0} · errors ${a.errors ?? 0}` });
      load();
    } catch (e: any) {
      toast({ title: "Run failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setRunning(null); }
  };

  const runAll = async () => {
    setRunning("__all__");
    try {
      const { data, error } = await supabase.functions.invoke("internal-schedule-runner", { body: { run_all_enabled: true } });
      if (error) throw error;
      setLastResult(data);
      const a = (data as any)?.aggregate ?? {};
      toast({ title: "Ran enabled schedules", description: `tasks +${a.tasks_created ?? 0} · drafts +${a.drafts_created ?? 0} · approvals +${a.approvals_created ?? 0} · errors ${a.errors ?? 0}` });
      load();
    } catch (e: any) {
      toast({ title: "Run failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setRunning(null); }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Internal Operating Schedules</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> No autosend / Apollo / Smartlead</Badge>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
            <Button size="sm" onClick={runAll} disabled={running !== null}>
              <Play className="h-4 w-4 mr-1" /> Run all enabled
            </Button>
          </div>
        </div>
        <CardDescription>Founder-controlled internal cadence. Toggling on does not enable outbound send — agents still create only internal tasks/drafts/approvals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <div className="text-sm text-muted-foreground">{loading ? "Loading…" : "No schedules seeded yet."}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((s) => (
            <div key={s.id} className="border border-border rounded-lg p-3 bg-secondary/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{s.schedule_name}</div>
                  <div className="text-[10px] text-muted-foreground">{s.schedule_key} · scope: {s.run_scope}</div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{s.frequency_label ?? s.cron_expression ?? "manual"}</Badge>
                    <Badge variant={s.status === "ok" ? "default" : s.status === "warning" ? "destructive" : "secondary"} className="text-[10px]">{s.status}</Badge>
                    {s.safe_internal_only && <Badge variant="secondary" className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> safe internal</Badge>}
                    {s.external_actions_allowed && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" /> external allowed</Badge>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s, v)} />
                  <Button size="sm" variant="outline" onClick={() => runOne(s)} disabled={running === s.schedule_key}>
                    {running === s.schedule_key ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    <span className="ml-1 text-xs">Run now</span>
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div>Last run: <span className="text-foreground">{s.last_run_at ? formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true }) : "never"}</span></div>
                <div>Next run: <span className="text-foreground">{s.next_run_at ? formatDistanceToNow(new Date(s.next_run_at), { addSuffix: true }) : "—"}</span></div>
              </div>
            </div>
          ))}
        </div>

        {lastResult && (
          <div className="border border-border rounded-md p-3 text-xs">
            <div className="font-semibold mb-1">Last run aggregate</div>
            <pre className="text-[10px] text-muted-foreground overflow-auto max-h-48">{JSON.stringify(lastResult.aggregate ?? lastResult, null, 2)}</pre>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> All schedule runs are internal: no email send, no Apollo spend, no Smartlead POST, no campaign start.
        </div>
      </CardContent>
    </Card>
  );
}

export default InternalOperatingSchedulesPanel;