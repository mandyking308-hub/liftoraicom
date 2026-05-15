import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

type RunbookStep = {
  order: number;
  label: string;
  panel?: string;
  action?: string;
};

type Runbook = {
  id: string;
  business_id: string | null;
  runbook_key: string;
  runbook_name: string;
  runbook_type: string;
  status: string;
  steps: RunbookStep[];
  safety_notes: string[];
  required_approvals: string[];
  expected_outputs: Record<string, any>;
  metadata: Record<string, any>;
  completion?: { total_steps: number; completed_steps: number; state: string };
  blockers?: string[];
  next_action?: string | null;
};

export default function BusinessOperatingRunbookPanel() {
  const businessesQ = useQuery({
    queryKey: ["runbook-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const [businessId, setBusinessId] = useState<string | "all">("all");

  const statusQ = useQuery({
    queryKey: ["business-runbook-status", businessId],
    queryFn: async () => {
      const body = businessId === "all" ? {} : { business_id: businessId };
      const { data, error } = await supabase.functions.invoke("business-runbook-status", { body });
      if (error) throw error;
      return data as { runbooks: Runbook[]; context: any; safety: any };
    },
  });

  const runbooks = statusQ.data?.runbooks ?? [];
  const ctx = statusQ.data?.context;

  const sorted = useMemo(
    () => [...runbooks].sort((a, b) => (a.metadata?.order ?? 99) - (b.metadata?.order ?? 99)),
    [runbooks]
  );

  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList size={16} className="text-primary" />
            Business Operating Runbook
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={businessId} onValueChange={(v) => setBusinessId(v as any)}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {(businessesQ.data ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {ctx && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px]">Pending approvals: {ctx.pending_approvals}</Badge>
            <Badge variant="secondary" className="text-[10px]">Approved waiting: {ctx.approved_waiting}</Badge>
            <Badge variant="outline" className="text-[10px]">Enabled gates: {ctx.enabled_gates?.length ?? 0}</Badge>
            <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/40">No external sends</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {statusQ.isLoading && <p className="text-xs text-muted-foreground">Loading runbooks…</p>}
        {statusQ.error && <p className="text-xs text-destructive">{(statusQ.error as any).message}</p>}
        {!statusQ.isLoading && sorted.length === 0 && (
          <p className="text-xs text-muted-foreground">No active runbooks for this selection.</p>
        )}
        {sorted.map((rb) => (
          <div key={rb.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  {rb.completion?.state === "blocked" ? (
                    <AlertTriangle size={13} className="text-yellow-400" />
                  ) : (
                    <CheckCircle2 size={13} className="text-green-400" />
                  )}
                  {rb.runbook_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {rb.runbook_type} · {rb.metadata?.duration_min ?? "?"} min · key: <code>{rb.runbook_key}</code>
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`text-[10px] ${rb.completion?.state === "blocked" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}
              >
                {rb.completion?.state ?? "ready"}
              </Badge>
            </div>

            <ol className="space-y-1.5">
              {rb.steps.map((s) => (
                <li key={s.order} className="flex items-start gap-2 text-xs">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] flex-shrink-0">
                    {s.order}
                  </span>
                  <div className="flex-1">
                    <p>{s.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {s.action && <Badge variant="outline" className="text-[9px]">{s.action}</Badge>}
                      {s.panel && (
                        <Link to={s.panel} className="text-[10px] text-primary inline-flex items-center gap-1 hover:underline">
                          Open <ArrowRight size={10} />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {(rb.safety_notes?.length ?? 0) > 0 && (
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                <ShieldCheck size={11} className="text-primary mt-0.5" />
                <div className="space-y-0.5">
                  {rb.safety_notes.map((n, i) => <p key={i}>· {n}</p>)}
                </div>
              </div>
            )}

            {(rb.required_approvals?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {rb.required_approvals.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] border-primary/40 text-primary">
                    approval: {a}
                  </Badge>
                ))}
              </div>
            )}

            {(rb.blockers?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {rb.blockers!.map((b, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-400">
                    blocker: {b}
                  </Badge>
                ))}
              </div>
            )}

            {rb.next_action && (
              <p className="text-[10px] text-primary/80">→ next: {rb.next_action}</p>
            )}
          </div>
        ))}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => statusQ.refetch()} className="h-7 text-xs">
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}