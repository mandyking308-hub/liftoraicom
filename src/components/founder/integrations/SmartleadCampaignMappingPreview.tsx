import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitMerge, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const CONFIRMATION = "MAP SMARTLEAD CAMPAIGN";

export default function SmartleadCampaignMappingPreview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [providerCampaignId, setProviderCampaignId] = useState("");
  const [liftorCampaignId, setLiftorCampaignId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [discovery, setDiscovery] = useState<any>(null);
  const [discovering, setDiscovering] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-campaign-mapping-preview",
      { body: {} },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
    const suggestion = res?.suggested_mappings?.[0];
    if (suggestion) {
      setProviderCampaignId((p) => p || String(suggestion.provider_campaign_id ?? ""));
      setLiftorCampaignId((p) => p || String(suggestion.liftor_campaign_id ?? ""));
    }
  };
  useEffect(() => { run(); }, []);

  const blocked = data?.blocked ?? true;
  const smartleadCampaigns: any[] = data?.smartlead_campaigns ?? [];
  const liftorCampaigns: any[] = data?.liftor_campaigns ?? [];

  const canApply = useMemo(
    () =>
      !!providerCampaignId &&
      !!liftorCampaignId &&
      confirmation === CONFIRMATION &&
      smartleadCampaigns.length > 0,
    [providerCampaignId, liftorCampaignId, confirmation, smartleadCampaigns.length],
  );

  const apply = async () => {
    setApplying(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-campaign-mapping-apply",
      {
        body: {
          provider_campaign_id: providerCampaignId,
          liftor_campaign_id: liftorCampaignId,
          confirmation,
        },
      },
    );
    setApplying(false);
    if (error) {
      setApplyResult({ ok: false, error: error.message });
      toast.error(`Mapping failed: ${error.message}`);
      return;
    }
    setApplyResult(res);
    if (res?.ok) {
      toast.success("Smartlead campaign mapped");
      setConfirmation("");
      run();
    } else {
      toast.error(`Mapping failed: ${res?.error ?? "unknown"}`);
    }
  };

  const runDiscovery = async () => {
    setDiscovering(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-campaign-discovery",
      { body: providerCampaignId ? { provider_campaign_id: providerCampaignId } : {} },
    );
    setDiscovering(false);
    setDiscovery(error ? { ok: false, error: error.message } : res);
  };

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Campaign Mapping</h3>
          <Badge variant="outline" className="text-[10px]">founder-gated</Badge>
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
              <div className="text-muted-foreground">Suggested matches</div>
              <div className="font-mono text-sm">{data.suggested_mappings?.length ?? 0}</div>
            </div>
          </div>

          {blocked && (
            <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-200">
              <div className="font-semibold mb-1">Mapping blocked</div>
              <div>Reason: {data.reason ?? "no_smartlead_campaigns_exist"}.</div>
              <div className="mt-1">{data.next_action}</div>
            </div>
          )}

          {smartleadCampaigns.length > 0 && (
            <div className="rounded border border-border/60 p-2 text-[11px] space-y-1">
              <div className="font-medium mb-1">Smartlead campaigns</div>
              {smartleadCampaigns.slice(0, 10).map((c: any) => (
                <div key={String(c.id)} className="font-mono flex items-center justify-between gap-2">
                  <span className="truncate">{c.name ?? "(unnamed)"}</span>
                  <span className="text-muted-foreground">{c.status ?? "?"}</span>
                  <span className="text-muted-foreground">{c.id}</span>
                </div>
              ))}
            </div>
          )}

          {(data.suggested_mappings?.length ?? 0) > 0 && (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] space-y-1">
              <div className="font-medium">Suggested name-matched mapping(s)</div>
              {data.suggested_mappings.slice(0, 5).map((m: any) => (
                <div key={m.provider_campaign_id} className="font-mono">
                  {m.provider_campaign_name} ↔ {m.liftor_campaign_name}
                </div>
              ))}
            </div>
          )}

          {(data.existing_mappings?.length ?? 0) > 0 && (
            <div className="rounded border border-border/60 p-2 text-[11px] space-y-1">
              <div className="font-medium">Existing mappings</div>
              {data.existing_mappings.map((m: any) => (
                <div key={m.id} className="font-mono">
                  {m.provider_campaign_name ?? m.provider_campaign_id} · {m.mapping_status} · active={String(m.is_active)}
                </div>
              ))}
            </div>
          )}

          <div className="rounded border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <div className="text-xs font-semibold">Apply mapping (founder-gated)</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Smartlead campaign ID</label>
                <Input
                  value={providerCampaignId}
                  onChange={(e) => setProviderCampaignId(e.target.value)}
                  placeholder="e.g. 123456"
                  className="font-mono text-xs"
                />
                <select
                  className="w-full mt-1 bg-background border border-border/60 rounded text-[11px] p-1"
                  value={providerCampaignId}
                  onChange={(e) => setProviderCampaignId(e.target.value)}
                >
                  <option value="">— pick from list —</option>
                  {smartleadCampaigns.map((c: any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Liftor campaign ID</label>
                <Input
                  value={liftorCampaignId}
                  onChange={(e) => setLiftorCampaignId(e.target.value)}
                  placeholder="uuid"
                  className="font-mono text-xs"
                />
                <select
                  className="w-full mt-1 bg-background border border-border/60 rounded text-[11px] p-1"
                  value={liftorCampaignId}
                  onChange={(e) => setLiftorCampaignId(e.target.value)}
                >
                  <option value="">— pick from list —</option>
                  {liftorCampaigns.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.campaign_name} ({c.business_name ?? "—"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">
                Type confirmation phrase: <code className="font-mono">{CONFIRMATION}</code>
              </label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={CONFIRMATION}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={apply}
                disabled={!canApply || applying || smartleadCampaigns.length === 0}
              >
                {applying ? "Applying…" : "Apply mapping"}
              </Button>
              <Button size="sm" variant="outline" onClick={runDiscovery} disabled={discovering}>
                {discovering ? "Discovering…" : "Run per-campaign discovery"}
              </Button>
            </div>
            {smartleadCampaigns.length === 0 && (
              <div className="text-[10px] text-amber-300">
                Apply disabled: no Smartlead campaign exists yet. Create a draft campaign in Smartlead first.
              </div>
            )}
            {applyResult && (
              <pre className="text-[10px] bg-muted/30 rounded p-2 overflow-x-auto">
                {JSON.stringify(applyResult, null, 2)}
              </pre>
            )}
          </div>

          {discovery && (
            <div className="rounded border border-border/60 p-2 text-[11px] space-y-1">
              <div className="font-medium">Per-campaign discovery</div>
              <pre className="text-[10px] bg-muted/30 rounded p-2 overflow-x-auto">
                {JSON.stringify(discovery, null, 2)}
              </pre>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Apply only writes to outbound_provider_campaign_mappings. No Smartlead writes, no leads pushed, no emails sent.
          </p>
        </>
      )}
    </Card>
  );
}
