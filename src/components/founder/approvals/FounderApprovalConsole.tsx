import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, RefreshCw, CheckCircle2, XCircle, Pencil, AlertOctagon, Inbox } from "lucide-react";

type Item = {
  id: string;
  approval_type: string;
  source_system?: string;
  agent_key?: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  title: string;
  summary?: string;
  recommended_action?: string;
  draft_subject?: string | null;
  draft_body?: string | null;
  priority_level: string;
  risk_flags: string[];
  compliance_flags: string[];
  status: string;
  execution_enabled: boolean;
  send_allowed: boolean;
  origin: string;
  created_at?: string;
};

type Resp = {
  ok: boolean;
  apply_enabled: boolean;
  apply_disabled_reason: string;
  send_enabled: boolean;
  auto_execute_enabled: boolean;
  total_pending: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_agent: Record<string, number>;
  items: Item[];
};

const priorityClass: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  normal: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground",
};

export default function FounderApprovalConsole() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["founder-approval-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("founder-approval-preview", { body: {} });
      if (error) throw error;
      return data as Resp;
    },
  });

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck size={18} className="text-primary" /> Founder Approval Console (preview)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <Lock size={10} className="mr-1" /> No-Auto-Execute
          </Badge>
          <Badge variant="outline" className={`text-[10px] uppercase ${data?.apply_enabled ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
            decision-record {data?.apply_enabled ? "enabled" : "disabled"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading approval queue…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
                <p className="text-2xl font-semibold">{data.total_pending}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Types</p>
                <p className="text-sm">{Object.keys(data.by_type).length}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Agents</p>
                <p className="text-sm">{Object.keys(data.by_agent).length}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Urgent / High</p>
                <p className="text-sm">{(data.by_priority?.urgent ?? 0) + (data.by_priority?.high ?? 0)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {Object.entries(data.by_type).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px]">{k} · {v}</Badge>
              ))}
              {Object.keys(data.by_type).length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Inbox size={12} /> No pending approvals.</p>
              )}
            </div>

            <div className="space-y-2">
              {data.items.slice(0, 12).map((it) => (
                <div key={it.id} className="rounded-md border border-border/50 p-2.5 bg-card/40 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] uppercase ${priorityClass[it.priority_level] ?? priorityClass.normal}`}>{it.priority_level}</Badge>
                        <Badge variant="outline" className="text-[10px]">{it.approval_type}</Badge>
                        {it.agent_key && <Badge variant="outline" className="text-[10px]">{it.agent_key}</Badge>}
                      </div>
                      <p className="text-sm font-medium truncate mt-1">{it.title}</p>
                      {it.summary && <p className="text-xs text-muted-foreground line-clamp-2">{it.summary}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" disabled title="Approve disabled — feature flag FOUNDER_APPROVAL_RECORDING_ENABLED required">
                        <CheckCircle2 size={12} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <Pencil size={12} className="mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <XCircle size={12} className="mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <AlertOctagon size={12} className="mr-1" /> Escalate
                      </Button>
                    </div>
                  </div>
                  {it.draft_subject && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Subject: </span>{it.draft_subject}
                    </div>
                  )}
                  {it.draft_body && (
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground bg-background/40 p-2 rounded border border-border/40 max-h-32 overflow-y-auto">{it.draft_body}</pre>
                  )}
                  {(it.risk_flags?.length > 0 || it.compliance_flags?.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {(it.risk_flags ?? []).map((f) => (
                        <Badge key={`r-${f}`} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">risk · {f}</Badge>
                      ))}
                      {(it.compliance_flags ?? []).map((f) => (
                        <Badge key={`c-${f}`} variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30">comp · {f}</Badge>
                      ))}
                    </div>
                  )}
                  {it.recommended_action && (
                    <p className="text-[11px] text-muted-foreground"><span className="text-primary/80">Recommended:</span> {it.recommended_action}</p>
                  )}
                </div>
              ))}
              {data.items.length > 12 && (
                <p className="text-[11px] text-muted-foreground">+ {data.items.length - 12} more pending…</p>
              )}
            </div>

            <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground">
              All controls are presentation-only until <code>FOUNDER_APPROVAL_RECORDING_ENABLED=true</code> and confirmation phrase <code>RECORD FOUNDER DECISION</code> are supplied. Even when enabled, downstream sends, provider POSTs, and proposal/deal/invoice creation remain gated by separate flags.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}