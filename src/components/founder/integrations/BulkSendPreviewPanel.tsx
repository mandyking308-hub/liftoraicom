import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, RefreshCcw, Rocket } from "lucide-react";

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={`text-[10px] ${
      ok
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
    }`}
  >
    {label}
  </Badge>
);

export default function BulkSendPreviewPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("bulk-send-preview", {
      body: { limit: 10 },
    });
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };

  useEffect(() => {
    run();
  }, []);

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Bulk Send Preview — Smartlead</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="rounded border border-rose-500/40 bg-rose-500/5 p-3 flex items-start gap-2">
        <Lock className="h-4 w-4 mt-0.5 text-rose-400" />
        <div>
          <div className="text-sm font-semibold text-rose-200">NO SEND POSSIBLE YET</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {data?.sending_accounts_present
              ? "Reason: Smartlead mailbox exists, but no Smartlead campaign, no mapping, no webhook, no lead push approval, and scale sending is disabled."
              : "Reason: Smartlead has no sending mailbox and no campaign yet."}
          </p>
        </div>
      </div>

      {data && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Pill ok={!!data.provider_ready} label={`provider_ready: ${data.provider_ready}`} />
            <Pill ok={!!data.scale_provider_configured} label={`scale_configured: ${data.scale_provider_configured}`} />
            <Pill ok={!!data.sending_accounts_present} label={`mailboxes: ${data.sending_accounts_present}`} />
            <Pill ok={!!data.smartlead_campaign_present} label={`campaign: ${data.smartlead_campaign_present}`} />
            <Pill ok={!!data.smartlead_campaign_mapped} label={`mapped: ${data.smartlead_campaign_mapped}`} />
            <Pill ok={!!data.lead_push_ready} label={`lead_push: ${data.lead_push_ready}`} />
            <Pill ok={!!data.webhook_ready} label={`webhook: ${data.webhook_ready}`} />
            <Pill ok={!!data.batch_preview_ready} label={`batch_preview: ${data.batch_preview_ready}`} />
            <Pill ok={false} label={`can_send_scale: ${data.can_send_scale}`} />
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Smartlead campaigns</div>
              <div className="font-mono text-sm">{data.counts?.smartlead_campaigns ?? 0}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Smartlead mailboxes</div>
              <div className="font-mono text-sm">{data.counts?.smartlead_email_accounts ?? 0}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Active mappings</div>
              <div className="font-mono text-sm">{data.counts?.active_mappings ?? 0}</div>
            </div>
          </div>
          {data.blockers?.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
              <div className="font-medium text-amber-300 mb-1">Blockers</div>
              <ul className="list-disc pl-4 text-amber-100 space-y-0.5">
                {data.blockers.map((b: string) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">{data.notes}</p>
        </>
      )}
    </Card>
  );
}