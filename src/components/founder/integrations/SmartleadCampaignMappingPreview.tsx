import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitMerge, RefreshCcw } from "lucide-react";

export default function SmartleadCampaignMappingPreview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-campaign-mapping-preview",
      { body: {} },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };
  useEffect(() => {
    run();
  }, []);

  const blocked = data?.blocked ?? true;

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Campaign Mapping Preview</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      {!data && <p className="text-xs text-muted-foreground">Loading…</p>}
      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Smartlead campaigns</div>
              <div className="font-mono text-sm">{data.smartlead_campaign_count ?? 0}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Liftor campaigns</div>
              <div className="font-mono text-sm">{data.liftor_campaign_count ?? 0}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Suggested mappings</div>
              <div className="font-mono text-sm">{data.suggested_mappings?.length ?? 0}</div>
            </div>
          </div>
          {blocked && (
            <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-200">
              <div className="font-semibold mb-1">Mapping blocked</div>
              <div>Reason: {data.reason ?? "no_smartlead_campaigns_exist"}.</div>
              <div className="mt-1">Next action: {data.next_action}</div>
            </div>
          )}
          {!blocked && (data.suggested_mappings?.length ?? 0) > 0 && (
            <div className="rounded border border-border/60 p-2 text-[11px] space-y-1">
              <div className="font-medium">Suggested name-matched mappings (not persisted)</div>
              {data.suggested_mappings.slice(0, 10).map((m: any) => (
                <div key={m.provider_campaign_id} className="font-mono">
                  {m.provider_campaign_name} ↔ {m.liftor_campaign_name}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Read-only. No Smartlead writes, no campaign creation, no mapping rows persisted.
          </p>
        </>
      )}
    </Card>
  );
}