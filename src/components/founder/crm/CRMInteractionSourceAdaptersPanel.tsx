import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug, ShieldAlert, Play } from "lucide-react";

type Adapter = {
  adapter_key: string;
  source_system: string;
  source_channel: string;
  source_table: string | null;
  enabled_for_preview: boolean;
  enabled_for_capture: boolean;
  feature_flag_name: string | null;
  supported_interaction_types: string[];
  notes: string | null;
};

type AdapterPreview = {
  adapter_key: string;
  sample_count: number;
  captured_count: number;
  uncaptured_count: number;
  capture_blocked_reason?: string | null;
  feature_flag_present?: boolean;
  sample?: any[];
};

export default function CRMInteractionSourceAdaptersPanel() {
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [previews, setPreviews] = useState<Record<string, AdapterPreview>>({});
  const [flagPresent, setFlagPresent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_interaction_source_adapters" as any)
      .select("adapter_key, source_system, source_channel, source_table, enabled_for_preview, enabled_for_capture, feature_flag_name, supported_interaction_types, notes")
      .order("adapter_key");
    setAdapters((data as any[]) ?? []);
    setLoading(false);
  };

  const runPreviewAll = async () => {
    setRunning(true);
    const { data } = await supabase.functions.invoke("crm-interaction-source-preview", { body: { limit: 5 } });
    if ((data as any)?.adapters) {
      const map: Record<string, AdapterPreview> = {};
      for (const a of (data as any).adapters) map[a.adapter_key] = a;
      setPreviews(map);
      setFlagPresent(!!(data as any).feature_flag_present);
    }
    setRunning(false);
  };

  const runPreviewOne = async (key: string) => {
    setRunning(true);
    const { data } = await supabase.functions.invoke("crm-interaction-source-preview", { body: { adapter_key: key, limit: 10 } });
    if ((data as any)?.adapters?.[0]) {
      setPreviews((prev) => ({ ...prev, [key]: (data as any).adapters[0] }));
      setFlagPresent(!!(data as any).feature_flag_present);
    }
    setRunning(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">CRM Interaction Source Adapters</h3>
          <Badge variant="outline" className="text-[10px]">preview · capture disabled</Badge>
          {flagPresent === false && (
            <Badge variant="destructive" className="text-[10px]">
              <ShieldAlert className="h-3 w-3 mr-1" /> CRM_INTERACTION_CAPTURE_ENABLED missing
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          <Button size="sm" onClick={runPreviewAll} disabled={running || !adapters.length}>
            <Play className="h-3 w-3 mr-1" /> Preview all
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Each adapter previews how source rows would map into the canonical ledger (interaction type + dedupe key).
        Capture-apply requires <code>CRM_INTERACTION_CAPTURE_ENABLED=true</code> + confirmation phrase
        <code> CAPTURE CRM INTERACTIONS</code>. No emails, no Apollo, no Smartlead POSTs.
      </p>

      <div className="rounded-md border border-border/60 p-2 text-[11px] space-y-1">
        <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
          CRM Interaction Capture Coverage
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-3 gap-y-0.5">
          <li>Smartlead / provider events: <Badge variant="outline" className="text-[10px]">preview ready</Badge></li>
          <li>Native email events: <Badge variant="outline" className="text-[10px]">preview ready</Badge></li>
          <li>Conversations / communications / inbound: <Badge variant="outline" className="text-[10px]">preview ready</Badge></li>
          <li>AI actions / drafts: <Badge variant="outline" className="text-[10px]">preview ready</Badge></li>
          <li>Proposals / demos / deals / finance: <Badge variant="outline" className="text-[10px]">preview ready</Badge></li>
          <li>Compliance / system / supplier / notes: <Badge variant="outline" className="text-[10px]">preview ready</Badge></li>
          <li>Capture apply: <Badge variant="destructive" className="text-[10px]">disabled</Badge></li>
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {adapters.map((a) => {
          const p = previews[a.adapter_key];
          return (
            <div key={a.adapter_key} className="rounded-md border border-border/60 p-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{a.adapter_key}</div>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => runPreviewOne(a.adapter_key)} disabled={running}>preview</Button>
              </div>
              <div className="text-muted-foreground">
                {a.source_system} · {a.source_channel} {a.source_table ? `· ${a.source_table}` : ""}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant={a.enabled_for_preview ? "default" : "secondary"} className="text-[10px]">
                  preview {a.enabled_for_preview ? "on" : "off"}
                </Badge>
                <Badge variant={a.enabled_for_capture ? "default" : "secondary"} className="text-[10px]">
                  capture {a.enabled_for_capture ? "on" : "off"}
                </Badge>
                {a.feature_flag_name && (
                  <Badge variant="outline" className="text-[10px]">flag: {a.feature_flag_name}</Badge>
                )}
                {p && (
                  <>
                    <Badge variant="outline" className="text-[10px]">sample: {p.sample_count}</Badge>
                    <Badge variant="outline" className="text-[10px]">captured: {p.captured_count}</Badge>
                    <Badge variant="outline" className="text-[10px]">uncaptured: {p.uncaptured_count}</Badge>
                    {p.capture_blocked_reason && (
                      <Badge variant="destructive" className="text-[10px]">{p.capture_blocked_reason}</Badge>
                    )}
                  </>
                )}
              </div>
              {a.notes && <div className="text-[10px] text-muted-foreground">{a.notes}</div>}
              {p?.sample?.length ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  e.g. {p.sample[0]?.proposed_interaction_type} · dedupe {String(p.sample[0]?.dedupe_key).slice(0, 60)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}