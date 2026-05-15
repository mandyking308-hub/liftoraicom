import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShieldAlert, Lock, Unlock, RefreshCw, Play } from "lucide-react";

type GateReport = {
  gate_key: string;
  gate_label: string;
  action_type: string;
  provider_type: string | null;
  enabled: boolean;
  risk_level: string;
  max_batch_size: number;
  confirmation_phrase: string;
  secret_present: boolean;
  approved_waiting: number;
  ready: boolean;
  blockers: string[];
};

export function ControlledExternalActionGatesPanel() {
  const qc = useQueryClient();
  const [phraseByGate, setPhraseByGate] = useState<Record<string, string>>({});

  const readinessQ = useQuery({
    queryKey: ["external-action-readiness"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("external-action-readiness", { body: {} });
      if (error) throw error;
      return data as { gates: GateReport[]; totals: any; safety: any };
    },
  });

  const auditQ = useQuery({
    queryKey: ["external-action-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_action_audit_log")
        .select("id,action_type,action_status,blocked_reason,created_at,metadata")
        .eq("agent_key", "external_action_executor")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleGateMut = useMutation({
    mutationFn: async ({ gate_key, enabled }: { gate_key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("external_action_gates")
        .update({ enabled })
        .eq("gate_key", gate_key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gate updated");
      qc.invalidateQueries({ queryKey: ["external-action-readiness"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update gate"),
  });

  const dryRunMut = useMutation({
    mutationFn: async (g: GateReport) => {
      const { data, error } = await supabase.functions.invoke("external-action-executor", {
        body: { action_type: g.action_type, dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Dry run completed"),
    onError: (e: any) => toast.error(e.message ?? "Dry run failed"),
  });

  const executeMut = useMutation({
    mutationFn: async (g: GateReport) => {
      const phrase = phraseByGate[g.gate_key] ?? "";
      if (phrase !== g.confirmation_phrase) throw new Error("Confirmation phrase mismatch");
      const { data, error } = await supabase.functions.invoke("external-action-executor", {
        body: { action_type: g.action_type, dry_run: false, confirmation: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.message(data?.executed ? `Executed ${data.executed}` : `Blocked ${data?.blocked ?? 0}`);
      qc.invalidateQueries({ queryKey: ["external-action-audit"] });
      qc.invalidateQueries({ queryKey: ["external-action-readiness"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Execute failed"),
  });

  const gates = readinessQ.data?.gates ?? [];
  const totals = readinessQ.data?.totals;

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Controlled External Action Gates
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Email, Apollo, Smartlead, compliance, invoice and proposal send paths. All disabled by default.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Lock className="h-3 w-3 mr-1" /> Founder-gated
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => readinessQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Gates" value={totals.gates} />
              <Stat label="Enabled" value={totals.enabled} />
              <Stat label="Ready" value={totals.ready} />
              <Stat label="Approved waiting" value={totals.approved_waiting} />
            </div>
          )}

          <div className="space-y-2">
            {gates.map((g) => {
              const phrase = phraseByGate[g.gate_key] ?? "";
              const canExecute = g.enabled && phrase === g.confirmation_phrase;
              return (
                <div key={g.gate_key} className="rounded border border-border/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {g.enabled ? (
                        <Unlock className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{g.gate_label}</span>
                      <Badge variant="outline" className="text-[10px]">{g.action_type}</Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          g.risk_level === "critical"
                            ? "border-destructive/50 text-destructive"
                            : "border-amber-500/40 text-amber-300"
                        }`}
                      >
                        {g.risk_level}
                      </Badge>
                      {g.provider_type && (
                        <Badge variant="secondary" className="text-[10px]">{g.provider_type}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">enabled</span>
                      <Switch
                        checked={g.enabled}
                        onCheckedChange={(v) =>
                          toggleGateMut.mutate({ gate_key: g.gate_key, enabled: v })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>Approved waiting: <span className="text-foreground">{g.approved_waiting}</span></div>
                    <div>Max batch: <span className="text-foreground">{g.max_batch_size}</span></div>
                    <div>Secret present: <span className="text-foreground">{g.secret_present ? "yes" : "no"}</span></div>
                  </div>
                  {g.blockers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {g.blockers.map((b) => (
                        <Badge key={b} variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder={`Type "${g.confirmation_phrase}"`}
                      value={phrase}
                      onChange={(e) =>
                        setPhraseByGate((p) => ({ ...p, [g.gate_key]: e.target.value }))
                      }
                      className="max-w-md text-xs"
                      disabled={!g.enabled}
                    />
                    <Button size="sm" variant="outline" onClick={() => dryRunMut.mutate(g)}>
                      <Play className="h-3 w-3 mr-1" /> Dry run
                    </Button>
                    <Button
                      size="sm"
                      disabled={!canExecute || executeMut.isPending}
                      onClick={() => executeMut.mutate(g)}
                    >
                      Execute
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="text-sm">External action audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {(auditQ.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No external action attempts yet.</p>
            )}
            {(auditQ.data ?? []).map((a: any) => (
              <div key={a.id} className="text-xs flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{a.action_status}</Badge>
                <span className="font-medium">{a.action_type}</span>
                <span className="text-muted-foreground truncate">
                  {a.blocked_reason || a.metadata?.gate_key || ""}
                </span>
                <span className="text-muted-foreground ml-auto">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-2 rounded border border-border/40">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default ControlledExternalActionGatesPanel;