import { useEffect, useState } from "react";
import { PETLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchAlerts, fetchTargets, fetchSettings, syncAlertsForTarget, ackAlert, type Alert } from "@/lib/portfolioExitTargetEngine";

export default function PETAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function load() { setAlerts(await fetchAlerts()); }
  useEffect(() => { void load(); }, []);

  async function syncAll() {
    setSyncing(true);
    try {
      const [ts, s] = await Promise.all([fetchTargets(), fetchSettings()]);
      for (const t of ts) await syncAlertsForTarget(t, s);
      toast.success("Alerts refreshed");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Sync failed"); }
    finally { setSyncing(false); }
  }

  async function ack(id: string) {
    try { await ackAlert(id); await load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  const open = alerts.filter(a => !a.acknowledged_at);
  const done = alerts.filter(a => a.acknowledged_at);

  return (
    <PETLayout title="Milestone alerts" subtitle="Triggered automatically when a business reaches a customer or ARR milestone. Acknowledging an alert does not trigger external outreach."
      actions={<Button size="sm" variant="outline" onClick={syncAll} disabled={syncing}>{syncing ? "Refreshing…" : "Refresh from live data"}</Button>}>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Open ({open.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <AlertList items={open} onAck={ack} showAck />
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Acknowledged ({done.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <AlertList items={done} onAck={ack} />
        </CardContent>
      </Card>
    </PETLayout>
  );
}

function AlertList({ items, onAck, showAck }: { items: Alert[]; onAck: (id: string) => void; showAck?: boolean }) {
  if (items.length === 0) return <p className="p-4 text-center text-xs text-muted-foreground">None.</p>;
  return (
    <div className="divide-y divide-border/30">
      {items.map(a => (
        <div key={a.id} className="p-3 flex items-start gap-3 text-xs">
          <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 shrink-0">{a.alert_code}</Badge>
          <div className="min-w-0 flex-1">
            <p className="font-medium"><Link to={`/founder/portfolio-exit-targets/${a.target_id}`} className="hover:text-primary">{a.business_name}</Link> — {a.alert_message}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(a.triggered_at).toLocaleString()}{a.acknowledged_at ? ` · acknowledged ${new Date(a.acknowledged_at).toLocaleString()}` : ""}</p>
          </div>
          {showAck && <Button size="sm" variant="outline" onClick={() => onAck(a.id)}>Acknowledge</Button>}
        </div>
      ))}
    </div>
  );
}