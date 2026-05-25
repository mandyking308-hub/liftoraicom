import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { SUPPORTED_VOICE_PROVIDERS } from "@/lib/providers/voiceProviderAdapter";
import { Lock } from "lucide-react";

export default function VoiceConsole() {
  const { data } = useQuery({
    queryKey: ["cs-voice-console"],
    queryFn: async () => {
      const sb: any = supabase;
      const [providers, recent] = await Promise.all([
        sb.from("customer_sales_provider_settings").select("*").eq("active", true),
        sb.from("customer_sales_call_logs").select("*").order("started_at", { ascending: false }).limit(10),
      ].map(p => p.catch(() => ({ data: [] }))));
      return { providers: (providers.data ?? []) as any[], recent: (recent.data ?? []) as any[] };
    },
  });

  const live = (data?.providers ?? []).some(p => p.provider_status === "live");
  const byType: Record<string, any> = {};
  (data?.providers ?? []).forEach((p: any) => { byType[p.provider_type] = p; });

  return (
    <CSLayout
      title="Voice Console"
      subtitle="Internal voice/web-call console. Drafting, transcripts and recommendations run live. Live outbound dialing is locked unless a provider is connected and the founder approves the call."
    >
      <CSSection title="Provider state" description="One row per supported provider. Adapter layer is in place; no external calls are made from this page.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SUPPORTED_VOICE_PROVIDERS.map((cat) => {
            const p = byType[cat.type];
            const status = p?.provider_status ?? "not_connected";
            return (
              <div key={cat.type} className="rounded-md border border-border/60 bg-background/40 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{cat.label}</span>
                  <Badge variant="outline" className="text-[10px]">{status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-muted-foreground">Inbound: {p?.inbound_enabled ? "on" : "off"} · Outbound: {p?.outbound_enabled ? "on" : "off"} · Web call: {p?.web_call_enabled ? "on" : "off"}</p>
                <p className="text-muted-foreground">Batch: {p?.batch_calls_enabled ? "on" : "off"} · Recording: {p?.recording_enabled ? "on" : "off"} · Transcription: {p?.transcription_enabled ? "on" : "off"}</p>
                <p className="text-muted-foreground">Phone: {p?.phone_number ?? "—"}</p>
                <p className="text-yellow-300/90 flex items-center gap-1"><Lock size={10} /> Outbound approval required: {p?.require_founder_approval_for_outbound !== false ? "yes" : "no"}</p>
                {!p && <Link to="/founder/customer-sales/settings" className="text-primary underline text-[11px]">Configure in Settings →</Link>}
              </div>
            );
          })}
        </div>
      </CSSection>

      <CSSection title="Recent calls">
        {(data?.recent ?? []).length === 0 ? (
          <CSEmptyState title="No calls yet" hint={live ? "Calls will appear here once your provider sends webhooks." : "No provider connected yet."} />
        ) : (
          <ul className="text-xs space-y-1">
            {(data?.recent ?? []).map((c: any) => (
              <li key={c.id} className="rounded border border-border/40 bg-background/40 p-2">
                <span className="font-mono">{new Date(c.started_at ?? c.created_at).toLocaleString()}</span>
                {" · "}{c.call_direction ?? "—"} · {c.from_number ?? "—"} → {c.to_number ?? "—"} · {c.outcome ?? "pending"}
              </li>
            ))}
          </ul>
        )}
      </CSSection>
    </CSLayout>
  );
}