import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Lock, RefreshCw, ShieldCheck } from "lucide-react";

type Truth = {
  ok: boolean;
  classification: string;
  smartlead: any;
  manual: any;
  crm: any;
  modules: { ready: number; partial: number; blocked: number; missing: number; total: number };
  external_gates: Record<string, string>;
  generated_at: string;
};

const tone = (s: string) => {
  if (["ready", "configured", "connected", "present"].includes(s)) return "text-green-400";
  if (["partial", "not_configured", "empty"].includes(s)) return "text-yellow-400";
  if (["locked", "blocked"].includes(s)) return "text-orange-400";
  return "text-muted-foreground";
};

const Row = ({ label, status, detail }: { label: string; status: string; detail?: string }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-right">
      <div className={`text-xs font-semibold ${tone(status)}`}>{status.replace(/_/g, " ")}</div>
      {detail && <div className="text-[10px] text-muted-foreground">{detail}</div>}
    </div>
  </div>
);

const CommandCentreTruthSyncPanel = () => {
  const { data, isLoading, refetch, isFetching } = useQuery<Truth>({
    queryKey: ["cc-truth-sync"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("command-centre-truth-sync", { body: {} });
      if (error) throw error;
      return data as Truth;
    },
    refetchInterval: 60_000,
  });

  const classification = data?.classification ?? "…";
  const classOk = classification === "READY_FOR_INTERNAL_USE";

  return (
    <Card className="bg-card border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            Command Centre — Truth Sync
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={classOk ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>
              {classification.replace(/_/g, " ")}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div className="text-xs text-muted-foreground">Loading reconciled truth…</div>}
        {data && (
          <>
            {/* Smartlead */}
            <section>
              <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-primary" /> Smartlead
              </div>
              <p className="text-xs text-muted-foreground italic mb-2">{data.smartlead.sentence}</p>
              <Row label="API key" status={data.smartlead.api_key.status} detail={data.smartlead.api_key.label} />
              <Row label="Mailbox" status={data.smartlead.mailbox.status} detail={data.smartlead.mailbox.label} />
              <Row label="Campaign" status={data.smartlead.campaign.status} detail={data.smartlead.campaign.label} />
              <Row label="Warmup" status={data.smartlead.warmup.status} detail={data.smartlead.warmup.label} />
              <Row label="Mapping" status={data.smartlead.mapping.status} detail={data.smartlead.mapping.label} />
              <Row label="Webhook" status={data.smartlead.webhook.status} detail={data.smartlead.webhook.label} />
              <Row label="Scale sending" status={data.smartlead.scale_sending.status} detail={data.smartlead.scale_sending.label} />
            </section>

            {/* Manual */}
            <section>
              <div className="text-xs font-semibold mb-1">Manuals</div>
              <p className="text-xs text-muted-foreground italic mb-2">{data.manual.sentence}</p>
              <Row label={`Technical Manual ${data.manual.technical_manual.version}`} status={data.manual.technical_manual.status} />
              <Row label={`User Manual ${data.manual.user_manual.version}`} status={data.manual.user_manual.status} />
              <Row label="Manual links" status={data.manual.manual_links.status} detail={data.manual.manual_links.label} />
            </section>

            {/* CRM */}
            <section>
              <div className="text-xs font-semibold mb-1">CRM Memory</div>
              <p className="text-xs text-muted-foreground italic mb-2">{data.crm.sentence}</p>
              <Row label="CRM spine" status={data.crm.spine.status} />
              <Row label="Contacts" status={data.crm.contacts.status} detail={`${data.crm.contacts.count} contacts`} />
              <Row label="Conversations" status={data.crm.conversations.status} detail={`${data.crm.conversations.count}`} />
              <Row label="Interaction ledger" status={data.crm.interaction_ledger.status} detail={data.crm.interaction_ledger.label} />
              <Row label="CRM memory" status={data.crm.crm_memory.status} detail={data.crm.crm_memory.label} />
              <Row label="AI context guard" status={data.crm.ai_context_guard.status} detail={data.crm.ai_context_guard.label} />
            </section>

            {/* Module registry */}
            <section>
              <div className="text-xs font-semibold mb-2">Module registry ({data.modules.total} total)</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded border border-green-500/30 bg-green-500/5">
                  <div className="text-lg font-bold text-green-400">{data.modules.ready}</div>
                  <div className="text-[10px] text-muted-foreground">Ready</div>
                </div>
                <div className="p-2 rounded border border-yellow-500/30 bg-yellow-500/5">
                  <div className="text-lg font-bold text-yellow-400">{data.modules.partial}</div>
                  <div className="text-[10px] text-muted-foreground">Partial</div>
                </div>
                <div className="p-2 rounded border border-orange-500/30 bg-orange-500/5">
                  <div className="text-lg font-bold text-orange-400">{data.modules.blocked}</div>
                  <div className="text-[10px] text-muted-foreground">Blocked</div>
                </div>
                <div className="p-2 rounded border border-destructive/30 bg-destructive/5">
                  <div className="text-lg font-bold text-destructive">{data.modules.missing}</div>
                  <div className="text-[10px] text-muted-foreground">Missing (no panel)</div>
                </div>
              </div>
            </section>

            {/* External gates */}
            <section>
              <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                <Lock size={12} className="text-orange-400" /> External Action Gates
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {Object.entries(data.external_gates).map(([k, v]) => (
                  <div key={k} className="text-[10px] flex items-center justify-between border border-border/40 rounded px-2 py-1">
                    <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                    <span className="text-orange-400 font-semibold">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <AlertTriangle size={10} /> All external lanes locked. Internal-only operating mode.
              </p>
            </section>

            <p className="text-[10px] text-muted-foreground text-right">
              Reconciled at {new Date(data.generated_at).toLocaleTimeString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CommandCentreTruthSyncPanel;