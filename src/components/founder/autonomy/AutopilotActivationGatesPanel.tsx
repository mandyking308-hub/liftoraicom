import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, Unlock, AlertTriangle, Gauge, Play } from "lucide-react";
import { toast } from "sonner";

type Gate = {
  id: string;
  gate_key: string;
  gate_label: string;
  action_type: string;
  current_state: string;
  enabled: boolean;
  external_action: boolean;
  required_readiness_score: number;
  requires_successful_test_runs: number;
  requires_founder_final_approval: boolean;
  metadata: any;
};

export default function AutopilotActivationGatesPanel() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, any>>({});
  const [phrase, setPhrase] = useState<Record<string, string>>({});
  const [highRiskPhrase, setHighRiskPhrase] = useState<Record<string, string>>({});
  const [approvalIds, setApprovalIds] = useState<Record<string, string>>({});

  const { data: gates, refetch } = useQuery({
    queryKey: ["autopilot_activation_gates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_activation_gates")
        .select("*").order("external_action", { ascending: true }).order("gate_label");
      if (error) throw error;
      return (data ?? []) as Gate[];
    },
  });

  const summary = useMemo(() => {
    const list = gates || [];
    return {
      total: list.length,
      enabled: list.filter(g => g.enabled).length,
      external: list.filter(g => g.external_action).length,
      locked: list.filter(g => g.current_state === "locked").length,
    };
  }, [gates]);

  async function checkEligibility(g: Gate) {
    setBusyId(g.id);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-eligibility-check", {
        body: { gate_id: g.id },
      });
      if (error) throw error;
      const r = (data?.results || [])[0];
      setEligibility(prev => ({ ...prev, [g.id]: r }));
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusyId(null); }
  }

  async function requestActivation(g: Gate) {
    setBusyId(g.id);
    try {
      const p = phrase[g.id] || "";
      const { data, error } = await supabase.functions.invoke("autopilot-activation-request", {
        body: { gate_id: g.id, confirmation_phrase: p },
      });
      if (error) throw error;
      if (data?.approval_id) {
        setApprovalIds(prev => ({ ...prev, [g.id]: data.approval_id }));
        toast.success("Activation requested. Approval item created.");
      } else {
        toast.error(data?.error || "Request failed");
      }
      await refetch();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusyId(null); }
  }

  async function finalActivate(g: Gate) {
    setBusyId(g.id);
    try {
      const approval_id = approvalIds[g.id];
      if (!approval_id) { toast.error("No approval id captured. Approve the founder item first."); return; }
      const { data, error } = await supabase.functions.invoke("autopilot-final-activate", {
        body: {
          gate_id: g.id,
          approval_id,
          confirmation_phrase: phrase[g.id] || "",
          high_risk_confirmation_phrase: highRiskPhrase[g.id] || "",
        },
      });
      if (error) throw error;
      if (data?.ok) toast.success(`Gate ${g.gate_key} activated.`);
      else toast.error(`Blocked: ${(data?.blockers || []).join(", ")}`);
      await refetch();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusyId(null); }
  }

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck size={16} className="text-primary" />
          Autopilot Activation Gates
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{summary.enabled}/{summary.total} active</span>
          <Badge variant="outline">{summary.external} external locked</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Operational guidance only. No external sends, provider mutations or credit spend can be enabled here without explicit founder confirmation phrases. External gates remain locked by default.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(gates || []).map((g) => {
            const elig = eligibility[g.id];
            return (
              <div key={g.id} className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {g.enabled ? <Unlock size={14} className="text-primary" /> : <Lock size={14} className="text-muted-foreground" />}
                      {g.gate_label}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{g.action_type}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={g.enabled ? "default" : "secondary"}>{g.current_state}</Badge>
                    {g.external_action && <Badge variant="destructive" className="text-[10px]">EXTERNAL</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Gauge size={12} /> readiness ≥ {g.required_readiness_score}</span>
                  <span>{g.requires_successful_test_runs} test runs</span>
                </div>
                {elig && (
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={elig.eligible ? "default" : "outline"}>{elig.eligible ? "eligible" : "blocked"}</Badge>
                      <span className="text-muted-foreground">readiness {elig.readiness} · runs {elig.recent_test_runs}</span>
                    </div>
                    {(elig.blockers || []).length > 0 && (
                      <ul className="list-disc list-inside text-[11px] text-muted-foreground">
                        {elig.blockers.map((b: string) => <li key={b} className="flex items-start gap-1"><AlertTriangle size={10} className="mt-1" />{b}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Input
                    placeholder="REQUEST AUTOPILOT ACTIVATION or ACTIVATE RESTRICTED AUTOPILOT"
                    value={phrase[g.id] || ""}
                    onChange={(e) => setPhrase(prev => ({ ...prev, [g.id]: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  {g.external_action && (
                    <Input
                      placeholder="ACTIVATE HIGH RISK EXTERNAL AUTOPILOT (required for external gates)"
                      value={highRiskPhrase[g.id] || ""}
                      onChange={(e) => setHighRiskPhrase(prev => ({ ...prev, [g.id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busyId === g.id} onClick={() => checkEligibility(g)}>
                      <Play size={12} className="mr-1" /> Check eligibility
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busyId === g.id} onClick={() => requestActivation(g)}>
                      Request activation
                    </Button>
                    <Button size="sm" disabled={busyId === g.id || !approvalIds[g.id]} onClick={() => finalActivate(g)}>
                      Final activate
                    </Button>
                  </div>
                  {approvalIds[g.id] && (
                    <div className="text-[10px] text-muted-foreground">Approval id: {approvalIds[g.id]}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}