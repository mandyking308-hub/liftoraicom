import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ShieldAlert, Lock } from "lucide-react";

export default function SmartleadLeadPushPreview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applyData, setApplyData] = useState<any>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [mappingId, setMappingId] = useState("");

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-lead-push-preview",
      { body: { limit: 25, campaign_mapping_id: mappingId || undefined } },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };

  const tryApply = async () => {
    setApplyLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-lead-push-apply",
      {
        body: {
          dry_run: true,
          confirmation_phrase: confirmation,
          campaign_mapping_id: mappingId || data?.campaign_mapping_id,
          max_batch_size: 5,
        },
      },
    );
    setApplyLoading(false);
    setApplyData(error ? { ok: false, error: error.message } : res);
  };

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Lead Push Preview</h3>
          <Badge variant="outline" className="text-[10px]">dry-run</Badge>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            value={mappingId}
            onChange={(e) => setMappingId(e.target.value)}
            placeholder="campaign_mapping_id (optional)"
            className="h-8 text-[11px] w-[260px]"
          />
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run dry-run preview"}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        No leads pushed. No Smartlead POST calls. No emails sent.
      </p>

      {data && data.lead_push_ready === false && (
        <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-200 flex items-start gap-2">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5" />
          <div>
            <div className="font-semibold">Lead push not ready</div>
            <div>Blocker: {data.blocker ?? "unknown"}.</div>
            <div className="mt-1">{data.notes}</div>
          </div>
        </div>
      )}

      {data && data.lead_push_ready && (
        <>
          <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Eligible</div>
              <div className="font-mono text-sm">{data.eligible_count}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Excluded</div>
              <div className="font-mono text-sm">{data.excluded_count}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Mapping</div>
              <div className="font-mono text-[10px] truncate">
                {data.provider_campaign_name ?? data.provider_campaign_id ?? "—"}
              </div>
            </div>
          </div>
          {data.excluded_reasons && Object.keys(data.excluded_reasons).length > 0 && (
            <div className="rounded border border-border/60 p-2 text-[11px]">
              <div className="font-medium mb-1">Exclusion reasons</div>
              {Object.entries(data.excluded_reasons).map(([k, v]) => (
                <div key={k} className="flex justify-between font-mono">
                  <span>{k}</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
          {data.preview?.[0] && (
            <div>
              <div className="text-[11px] font-medium mb-1">Exact Smartlead payload preview (first lead)</div>
              <pre className="rounded border border-border/60 bg-background/40 p-2 text-[10px] overflow-auto max-h-64">
                {JSON.stringify(data.preview[0], null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      <div className="rounded border border-destructive/40 bg-destructive/5 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold">
          <Lock className="h-3.5 w-3.5" />
          Apply (DISABLED)
          <Badge variant="destructive" className="text-[10px]">feature flag off</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Apply is gated by SMARTLEAD_LEAD_PUSH_ENABLED + confirmation phrase
          <code className="ml-1">PUSH SMARTLEAD LEADS</code> + active mapping. Until flag is on,
          calling this returns blocked with zero provider calls.
        </p>
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type: PUSH SMARTLEAD LEADS"
            className="h-8 text-[11px] w-[260px]"
          />
          <Button size="sm" variant="outline" onClick={tryApply} disabled={applyLoading}>
            {applyLoading ? "Calling…" : "Test apply (will be blocked)"}
          </Button>
        </div>
        {applyData && (
          <pre className="rounded border border-border/60 bg-background/40 p-2 text-[10px] overflow-auto max-h-48">
            {JSON.stringify(applyData, null, 2)}
          </pre>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        No leads pushed. No Smartlead POST calls. No emails sent.
      </p>
    </Card>
  );
}
