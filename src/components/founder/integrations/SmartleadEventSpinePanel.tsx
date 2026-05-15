import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Webhook, RefreshCcw, ShieldOff, ShieldCheck } from "lucide-react";

export default function SmartleadEventSpinePanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-event-mapping-preview",
      { body: { limit: 50 } },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };
  useEffect(() => { run(); }, []);

  const secretPresent: boolean = !!data?.webhook_secret_present;
  const counts: Record<string, number> = data?.counts_by_type ?? {};
  const previews: any[] = data?.previews ?? [];

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Event Spine</h3>
          <Badge variant="outline" className="text-[10px]">capture-only</Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${secretPresent ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}
          >
            {secretPresent ? "secret present" : "secret missing"}
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div
        className={`rounded border p-2 text-[11px] ${
          secretPresent
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
            : "border-amber-500/40 bg-amber-500/5 text-amber-200"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          {secretPresent ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
          Webhook receiver: {data?.capture_mode ?? "—"}
        </div>
        <div className="mt-1">
          {secretPresent
            ? "Receiver will accept Smartlead events that present the shared secret. Operational mutations are still disabled."
            : "SMARTLEAD_WEBHOOK_SECRET is not set — receiver returns mode=disabled. No events will be captured."}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Captured events</div>
          <div className="font-mono text-sm">{data?.event_count ?? 0}</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Operational writes</div>
          <div className="font-mono text-sm">disabled</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Apply available</div>
          <div className="font-mono text-sm">{data?.apply_available ? "yes" : "no"}</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="text-muted-foreground">Live Smartlead webhook created</div>
          <div className="font-mono text-sm">no</div>
        </div>
      </div>

      {Object.keys(counts).length > 0 && (
        <div className="rounded border border-border/60 p-2 text-[11px]">
          <div className="font-medium mb-1">Event type counts</div>
          <div className="flex flex-wrap gap-2 font-mono">
            {Object.entries(counts).map(([k, v]) => (
              <Badge key={k} variant="outline" className="text-[10px]">{k}: {v}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-border/60 p-2 text-[11px] space-y-1">
        <div className="font-medium">Recent events (would-map preview)</div>
        {previews.length === 0 && (
          <div className="text-muted-foreground">No events captured yet.</div>
        )}
        {previews.slice(0, 20).map((p) => (
          <div key={p.event_id} className="border border-border/40 rounded p-2 space-y-0.5">
            <div className="font-mono">
              {p.received_at} · <b>{p.provider_event_type}</b> · {p.email ?? "no-email"}
            </div>
            <div className="text-muted-foreground">would map to: {p.would_map_to}</div>
            <div className="text-muted-foreground">
              campaign: {p.matched_liftor_campaign_id ?? "—"} · contact: {p.matched_contact_id ?? "—"}
            </div>
            {p.mapping_blockers?.length > 0 && (
              <div className="text-amber-300">blockers: {p.mapping_blockers.join(", ")}</div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Capture-only spine. No operational mutation. No Smartlead webhook created by Liftor. No emails sent.
      </p>
    </Card>
  );
}