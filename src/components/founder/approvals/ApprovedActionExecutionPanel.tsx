import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Play, ShieldAlert, Lock, RefreshCw, CheckCircle2, AlertOctagon } from "lucide-react";

const CONFIRMATION = "EXECUTE APPROVED INTERNAL ACTIONS";

const BLOCKED_TYPES = new Set([
  "send_email",
  "apollo_reveal",
  "smartlead_lead_push",
  "smartlead_campaign_start",
  "compliance_bulk_approval",
  "live_invoice_send",
  "payment_mutation",
]);

function isExternal(approvalType: string) {
  const t = (approvalType || "").toLowerCase();
  return (
    t.includes("send_email") ||
    t.includes("apollo") ||
    t.includes("smartlead") ||
    t.includes("payment") ||
    t.includes("invoice_send") ||
    t.includes("campaign_start")
  );
}

export function ApprovedActionExecutionPanel() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState("");

  const approvedQ = useQuery({
    queryKey: ["approved-action-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_approval_items")
        .select("id,business_id,approval_type,title,summary,priority_level,status,execution_enabled,recommended_action,created_at,metadata")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const resultsQ = useQuery({
    queryKey: ["execution-result-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execution_result_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const auditQ = useQuery({
    queryKey: ["execution-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_action_audit_log")
        .select("id,action_type,action_status,blocked_reason,target_table,target_id,created_at,metadata")
        .eq("agent_key", "approved_action_executor")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const executeMut = useMutation({
    mutationFn: async ({ ids, dryRun }: { ids: string[]; dryRun: boolean }) => {
      if (!dryRun && confirmation !== CONFIRMATION) {
        throw new Error(`Type "${CONFIRMATION}" to confirm execution.`);
      }
      const calls = ids.length === 0
        ? [supabase.functions.invoke("approved-action-executor", { body: { dry_run: dryRun, confirmation } })]
        : ids.map((id) =>
            supabase.functions.invoke("approved-action-executor", {
              body: { approved_action_id: id, dry_run: dryRun, confirmation },
            })
          );
      const results = await Promise.all(calls);
      for (const r of results) if (r.error) throw r.error;
      return results.map((r) => r.data);
    },
    onSuccess: (data, vars) => {
      toast.success(vars.dryRun ? "Dry run completed" : "Internal actions executed");
      qc.invalidateQueries({ queryKey: ["approved-action-queue"] });
      qc.invalidateQueries({ queryKey: ["execution-result-log"] });
      qc.invalidateQueries({ queryKey: ["execution-audit"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Execution failed"),
  });

  const items = approvedQ.data ?? [];
  const internal = items.filter((i: any) => !isExternal(i.approval_type));
  const external = items.filter((i: any) => isExternal(i.approval_type));

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Approved Action Execution Engine
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Executes approved internal actions only. External sends remain founder-gated.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Lock className="h-3 w-3 mr-1" /> No autonomous external action
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                approvedQ.refetch();
                resultsQ.refetch();
                auditQ.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <Stat label="Approved waiting" value={items.length} />
            <Stat label="Executable internal" value={internal.filter((i: any) => i.execution_enabled).length} />
            <Stat label="Blocked external" value={external.length} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={`Type "${CONFIRMATION}" to enable execute`}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="max-w-md text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeMut.mutate({ ids: Array.from(selected), dryRun: true })}
              disabled={executeMut.isPending}
            >
              Dry run
            </Button>
            <Button
              size="sm"
              onClick={() => executeMut.mutate({ ids: Array.from(selected), dryRun: false })}
              disabled={executeMut.isPending || confirmation !== CONFIRMATION}
            >
              Execute selected ({selected.size || "all"})
            </Button>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Internal actions ready
            </h4>
            <div className="space-y-2">
              {internal.length === 0 && (
                <p className="text-xs text-muted-foreground">No approved internal actions.</p>
              )}
              {internal.map((i: any) => {
                const ready = i.execution_enabled === true;
                return (
                  <div key={i.id} className="flex items-start gap-3 p-3 rounded border border-border/40">
                    <Checkbox
                      checked={selected.has(i.id)}
                      onCheckedChange={() => toggle(i.id)}
                      disabled={!ready}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{i.title}</span>
                        <Badge variant="outline" className="text-[10px]">{i.approval_type}</Badge>
                        {ready ? (
                          <Badge className="bg-emerald-500/15 text-emerald-300 text-[10px]">execution_enabled</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">execution_enabled=false</Badge>
                        )}
                      </div>
                      {i.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.summary}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
              <ShieldAlert className="h-3 w-3" /> Blocked external actions
            </h4>
            <div className="space-y-2">
              {external.length === 0 && (
                <p className="text-xs text-muted-foreground">No external actions queued.</p>
              )}
              {external.map((i: any) => (
                <div key={i.id} className="p-3 rounded border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{i.title}</span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                      {i.approval_type}
                    </Badge>
                    <Badge className="bg-amber-500/15 text-amber-300 text-[10px]">external — gated separately</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Execution results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(resultsQ.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No execution results yet.</p>
            )}
            {(resultsQ.data ?? []).map((r: any) => (
              <div key={r.id} className="text-xs p-2 rounded border border-border/40 flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={
                    r.execution_status === "executed"
                      ? "border-emerald-500/40 text-emerald-300"
                      : r.execution_status === "blocked"
                        ? "border-amber-500/40 text-amber-300"
                        : "border-destructive/40 text-destructive"
                  }
                >
                  {r.execution_status}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium">{r.action_type}</div>
                  <div className="text-muted-foreground">
                    {r.result_summary ?? r.blocked_reason ?? "—"}
                    {r.target_table && <> · → {r.target_table}</>}
                  </div>
                </div>
                <span className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-primary" /> Execution audit log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {(auditQ.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No audit entries yet.</p>
            )}
            {(auditQ.data ?? []).map((a: any) => (
              <div key={a.id} className="text-xs flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{a.action_status}</Badge>
                <span className="font-medium">{a.action_type}</span>
                <span className="text-muted-foreground truncate">
                  {a.blocked_reason || a.metadata?.result_summary || ""}
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

export default ApprovedActionExecutionPanel;