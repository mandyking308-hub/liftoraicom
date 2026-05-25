import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

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

  return (
    <CSLayout
      title="Voice Console"
      subtitle="Internal voice/web-call console. Drafting, transcripts and recommendations run live. Live outbound dialing is locked unless a provider is connected and the founder approves the call."
    >
      <CSSection title="Provider state">
        {(data?.providers ?? []).length === 0 ? (
          <CSEmptyState title="No voice/web-call provider connected"
            hint="Add a Retell/Vapi/Twilio/ElevenLabs/custom provider in Settings. Internal preparation continues without it."
            action={<Link to="/founder/customer-sales/settings" className="text-xs text-primary underline">Open Settings</Link>} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {(data?.providers ?? []).map((p: any) => (
              <div key={p.id} className="rounded-md border border-border/60 bg-background/40 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize">{p.provider_type}</span>
                  <Badge variant="outline" className="text-[10px]">{p.provider_status}</Badge>
                </div>
                <p className="text-muted-foreground">Inbound: {p.inbound_enabled ? "on" : "off"} · Outbound: {p.outbound_enabled ? "on" : "off"} · Web call: {p.web_call_enabled ? "on" : "off"}</p>
                <p className="text-muted-foreground">Phone: {p.phone_number ?? "—"}</p>
                <p className="text-yellow-300/90">Outbound approval required: {p.require_founder_approval_for_outbound ? "yes" : "no"}</p>
              </div>
            ))}
          </div>
        )}
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