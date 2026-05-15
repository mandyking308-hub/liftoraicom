import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartPulse, ShieldCheck, Play, Wrench, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

function sevVariant(s: string) {
  if (s === "critical" || s === "high") return "destructive";
  if (s === "low") return "outline";
  return "secondary";
}

export default function SelfHealingMonitoringPanel() {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [last, setLast] = useState<any>(null);

  const { data: rules } = useQuery({
    queryKey: ["self_healing_rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("self_healing_rules").select("*").order("rule_key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: findings, refetch } = useQuery({
    queryKey: ["self_healing_findings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("self_healing_findings")
        .select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const open = (findings ?? []).filter((f: any) => f.repair_status === "open");
  const escalated = (findings ?? []).filter((f: any) => f.repair_status === "awaiting_founder_approval");
  const repaired = (findings ?? []).filter((f: any) => f.repair_status === "repaired_internal");

  async function runScan(persist: boolean) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-healing-scan", { body: { persist } });
      if (error) throw error;
      setLast(data);
      if (persist) await refetch();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusy(false); }
  }

  async function repair(findingId: string, safe: boolean) {
    if (safe && confirm !== "APPLY SAFE REPAIR") {
      toast.error('Type APPLY SAFE REPAIR to confirm.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-healing-repair", {
        body: { finding_id: findingId, confirmation: confirm },
      });
      if (error) throw error;
      toast.success(data?.applied ? "Internal repair applied" : "Escalated for founder approval");
      await refetch();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusy(false); }
  }

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HeartPulse size={16} className="text-primary" />
          Self-Healing Monitoring
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> No external action
          </Badge>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => runScan(false)}>
            <Play size={12} className="mr-1" /> Preview scan
          </Button>
          <Button size="sm" disabled={busy} onClick={() => runScan(true)}>Scan &amp; persist</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Rules enabled" value={(rules ?? []).filter((r: any) => r.enabled).length} />
          <Stat label="Open" value={open.length} />
          <Stat label="Escalated" value={escalated.length} />
          <Stat label="Repaired" value={repaired.length} />
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder='Type "APPLY SAFE REPAIR" to enable safe repairs'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="text-xs"
          />
        </div>

        <div>
          <div className="text-xs font-medium mb-2 text-muted-foreground">Findings</div>
          <div className="space-y-2 max-h-80 overflow-auto">
            {(findings ?? []).map((f: any) => (
              <div key={f.id} className="border border-border/40 rounded-md p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{f.finding_title}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant={sevVariant(f.severity)} className="text-[10px]">{f.severity}</Badge>
                    <Badge variant="outline" className="text-[10px]">{f.repair_status}</Badge>
                    {f.repair_safe ? (
                      <Badge variant="secondary" className="text-[10px]">safe repair</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">approval required</Badge>
                    )}
                  </div>
                </div>
                {f.finding_summary && <div className="text-xs text-muted-foreground">{f.finding_summary}</div>}
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">
                    {f.rule_key} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                  </div>
                  {f.repair_status === "open" && (
                    <div className="flex gap-1">
                      {f.repair_safe ? (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => repair(f.id, true)}>
                          <Wrench size={12} className="mr-1" /> Apply safe repair
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => repair(f.id, false)}>
                          <AlertTriangle size={12} className="mr-1" /> Escalate to founder
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(findings ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground italic">No findings yet — run a scan.</div>
            )}
          </div>
        </div>

        {last && (
          <div className="text-[11px] bg-muted/30 rounded-md p-2 max-h-40 overflow-auto font-mono">
            <pre>{JSON.stringify(last, null, 2)}</pre>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground">
          Repairs never send emails, never call external providers, never delete data. Risky repairs are escalated for founder approval.
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/40 rounded-md px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}