import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AgentCollaborationBoard() {
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<any>(null);

  const { data: rules } = useQuery({
    queryKey: ["agent_handover_rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_handover_rules").select("*").limit(50);
      if (error) throw error; return data ?? [];
    },
  });

  const { data: handovers, refetch: refetchH } = useQuery({
    queryKey: ["agent_handover_log_recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_handover_log").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error; return data ?? [];
    },
  });

  async function runHealth() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-collaboration-health", { body: { create_finding: false } });
      if (error) throw error;
      setHealth(data);
      refetchH();
      toast.success(`Collaboration health: ${data?.health_score ?? "?"}/100`);
    } catch (e: any) { toast.error(e?.message ?? "error"); }
    finally { setBusy(false); }
  }

  const pending = (handovers || []).filter((h: any) => ["pending", "open"].includes(h.status));
  const failed = (handovers || []).filter((h: any) => /fail|error|stuck/i.test(h.status || ""));

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitBranch size={16} className="text-primary" /> Agent Collaboration / Handover Board
          {health?.health_score != null && (
            <Badge variant="secondary" className="ml-2">{health.health_score}/100</Badge>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={runHealth} disabled={busy} className="h-7 text-xs">
          <RefreshCw size={12} className="mr-1" /> Run health check
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="rounded border border-border/60 bg-background/40 p-2">
            <div className="text-muted-foreground">Rules</div>
            <div className="text-base font-semibold">{rules?.length ?? 0}</div>
          </div>
          <div className="rounded border border-border/60 bg-background/40 p-2">
            <div className="text-muted-foreground">Recent handovers</div>
            <div className="text-base font-semibold">{handovers?.length ?? 0}</div>
          </div>
          <div className="rounded border border-border/60 bg-background/40 p-2">
            <div className="text-muted-foreground">Pending</div>
            <div className="text-base font-semibold">{pending.length}</div>
          </div>
          <div className="rounded border border-border/60 bg-background/40 p-2">
            <div className="text-muted-foreground">Failed / stuck</div>
            <div className={`text-base font-semibold ${failed.length ? "text-destructive" : ""}`}>{failed.length}</div>
          </div>
        </div>

        {(health?.issues?.length ?? 0) > 0 && (
          <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-2">
            <div className="text-[11px] font-semibold text-yellow-200 mb-1 flex items-center gap-1">
              <AlertTriangle size={11} /> {health.issues.length} collaboration issues
            </div>
            <ul className="text-[11px] text-yellow-100 list-disc pl-4 space-y-0.5">
              {health.issues.slice(0, 8).map((i: any, idx: number) => (
                <li key={idx}><span className="font-mono">{i.type}</span> · {i.severity} · {i.contact_id ? `contact ${String(i.contact_id).slice(0, 8)}` : i.handover_id ? `handover ${String(i.handover_id).slice(0, 8)}` : ""}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded border border-border/60 bg-background/40 p-2">
          <div className="text-[11px] font-semibold mb-1.5">Recent handovers</div>
          <div className="space-y-1">
            {(handovers || []).slice(0, 12).map((h: any) => (
              <div key={h.id} className="text-[11px] grid grid-cols-12 gap-2 py-1 border-t border-border/40">
                <div className="col-span-3 truncate">{h.from_agent_key} → <span className="text-primary">{h.to_agent_key}</span></div>
                <div className="col-span-2 truncate">{h.trigger_event ?? "—"}</div>
                <div className="col-span-2 text-muted-foreground truncate">contact {String(h.contact_id || "").slice(0, 8) || "—"}</div>
                <div className="col-span-2 truncate">task {h.task_id ? String(h.task_id).slice(0, 8) : <span className="text-yellow-400">missing</span>}</div>
                <div className="col-span-2 text-right">
                  <Badge variant="outline" className="text-[10px]">{h.status}</Badge>
                  {h.founder_review_required && <Badge variant="outline" className="ml-1 text-[10px]">review</Badge>}
                </div>
                <div className="col-span-1 text-right text-muted-foreground">{h.priority_level ?? ""}</div>
              </div>
            ))}
            {(handovers || []).length === 0 && (
              <p className="text-[11px] text-muted-foreground">No handovers yet.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}