import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Lock, RefreshCw, Send } from "lucide-react";

type ChecklistItem = {
  checklist_key: string;
  checklist_label: string;
  status: string;
  blocker_reason: string | null;
  operator_override?: boolean;
};

type BusinessReport = {
  business_id: string | null;
  ready_for_lead_push: boolean;
  ready_for_send: boolean;
  checklist: ChecklistItem[];
  blockers: string[];
  gates: Record<string, { enabled: boolean; phrase?: string }>;
};

export function SmartleadControlledActivationPanel() {
  const q = useQuery({
    queryKey: ["smartlead-controlled-activation"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("smartlead-controlled-activation", { body: {} });
      if (error) throw error;
      return data as {
        webhook: any;
        auto_send_anywhere: boolean;
        businesses: BusinessReport[];
        safety: any;
      };
    },
  });

  const data = q.data;

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Smartlead Controlled Activation
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Campaign mapping, webhook, lead push and paused-send readiness. No POSTs are performed here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Lock className="h-3 w-3 mr-1" /> No autonomous send
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => q.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook secret panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <SecretRow
              label="SMARTLEAD_WEBHOOK_SECRET"
              ok={!!data?.webhook?.smartlead_webhook_secret_present}
              hideValue
            />
            <SecretRow label="Webhook receiver deployed" ok={!!data?.webhook?.receiver_deployed} />
            <SecretRow label="Capture mode ready" ok={!!data?.webhook?.capture_mode_ready} />
            <SecretRow label="Latest test event captured" ok={!!data?.webhook?.latest_test_event_captured} />
          </div>

          {data?.auto_send_anywhere && (
            <div className="text-xs p-2 rounded border border-amber-500/40 text-amber-300 bg-amber-500/5">
              ⚠ auto_send_allowed=true on at least one business — Smartlead campaigns must remain paused until founder explicitly sends.
            </div>
          )}

          {/* Per-business checklist */}
          <div className="space-y-3">
            {(data?.businesses ?? []).map((b) => (
              <div key={b.business_id ?? "global"} className="rounded border border-border/40 p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium">
                    Business: <span className="text-muted-foreground">{b.business_id ?? "(global)"}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={b.ready_for_lead_push ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}
                    >
                      lead push {b.ready_for_lead_push ? "ready" : "blocked"}
                    </Badge>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                      send: never auto
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {b.checklist.map((c) => (
                    <div
                      key={c.checklist_key}
                      className="flex items-start gap-2 text-xs p-2 rounded border border-border/40"
                    >
                      {c.status === "passed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{c.checklist_label}</div>
                        {c.blocker_reason && (
                          <div className="text-muted-foreground">{c.blocker_reason}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <GatePill name="lead push" g={b.gates.lead_push} />
                  <GatePill name="campaign start" g={b.gates.campaign_start} />
                  <GatePill name="webhook create" g={b.gates.webhook_create} />
                </div>

                {b.blockers.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Next founder action: clear{" "}
                    <span className="text-foreground">{b.blockers[0]}</span>
                    {b.blockers.length > 1 && ` (+${b.blockers.length - 1} more)`}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground">
            Safety: smartlead_post_called=0 · emails_sent=0 · apollo_calls=0 (read-only check)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecretRow({ label, ok, hideValue }: { label: string; ok: boolean; hideValue?: boolean }) {
  return (
    <div className="p-2 rounded border border-border/40">
      <div className="text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <Badge
          variant="outline"
          className={ok ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}
        >
          {ok ? "yes" : "no"}
        </Badge>
        {hideValue && <span className="text-[10px] text-muted-foreground">value hidden</span>}
      </div>
    </div>
  );
}

function GatePill({ name, g }: { name: string; g?: { enabled: boolean; phrase?: string } }) {
  if (!g) return null;
  return (
    <Badge
      variant="outline"
      className={g.enabled ? "border-emerald-500/40 text-emerald-300" : "border-muted-foreground/30 text-muted-foreground"}
    >
      {name}: {g.enabled ? "enabled" : "disabled"}
    </Badge>
  );
}

export default SmartleadControlledActivationPanel;