import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function SmartleadCampaignDiscoveryPanel() {
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-campaign-discovery",
      { body: campaignId ? { provider_campaign_id: campaignId } : {} },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Per-Campaign Discovery</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">Smartlead campaign ID (blank = use active mapping)</label>
          <Input
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="optional"
            className="font-mono text-xs"
          />
        </div>
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? "Running…" : "Run discovery"}
        </Button>
      </div>
      {data && (
        <>
          <div className="grid sm:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Sequences</div>
              <div className="font-mono text-sm">{data.sequence_count ?? "—"}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Connected accounts</div>
              <div className="font-mono text-sm">{data.connected_account_count ?? "—"}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Analytics</div>
              <div className="font-mono text-sm">{data.analytics_available ? "yes" : "no"}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Campaign status</div>
              <div className="font-mono text-sm">{data.campaign_summary?.status ?? "—"}</div>
            </div>
          </div>
          <pre className="text-[10px] bg-muted/30 rounded p-2 overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
      <p className="text-[10px] text-muted-foreground">
        Read-only GETs only. No POST, no leads pushed, no emails sent.
      </p>
    </Card>
  );
}