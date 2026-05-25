import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, Lock } from "lucide-react";
import { SUPPORTED_VOICE_PROVIDERS } from "@/lib/providers/voiceProviderAdapter";

export default function VoiceProviderStatusCard() {
  const { data } = useQuery({
    queryKey: ["cc-voice-provider-status"],
    refetchInterval: 90_000,
    queryFn: async () => {
      const sb: any = supabase;
      const head = { count: "exact" as const, head: true };
      const today = new Date(); today.setHours(0,0,0,0);
      const [providers, callsToday, failedCalls, approvalRequired] = await Promise.all([
        sb.from("customer_sales_provider_settings").select("*"),
        sb.from("customer_sales_call_logs").select("id", head).gte("started_at", today.toISOString()),
        sb.from("customer_sales_call_logs").select("id", head).gte("started_at", today.toISOString()).in("outcome", ["failed","busy","no_answer","escalated_no_provider"]),
        sb.from("customer_sales_close_actions").select("id", head).eq("action_status", "approval_required"),
      ].map(p => p.catch(() => ({ count: 0, data: [] }))));
      return {
        providers: (providers.data ?? []) as any[],
        callsToday: callsToday.count ?? 0,
        failedCalls: failedCalls.count ?? 0,
        approvalRequired: approvalRequired.count ?? 0,
      };
    },
  });

  const byType: Record<string, any> = {};
  (data?.providers ?? []).forEach((p: any) => { byType[p.provider_type] = p; });
  const liveCount = (data?.providers ?? []).filter((p: any) => p.provider_status === "live").length;
  const summaryNext = liveCount === 0
    ? "Add a provider slot in Settings, then add credentials server-side"
    : (data?.approvalRequired ?? 0) > 0
      ? `Review ${data?.approvalRequired} approval-required call(s)`
      : "Provider live — outbound still founder-approved per call";

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone size={14} className="text-primary" />
          Voice Sales Provider Status
          <Badge variant="outline" className="text-[10px]">{liveCount}/{SUPPORTED_VOICE_PROVIDERS.length} live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Outbound founder-approved
          </Badge>
          <Link to="/founder/customer-sales/voice-console" className="ml-auto text-[11px] text-primary inline-flex items-center gap-1">
            Open <ArrowRight size={11} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {SUPPORTED_VOICE_PROVIDERS.map((cat) => {
            const p = byType[cat.type];
            const s = p?.provider_status ?? "not_connected";
            const tone = s === "live" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : s === "configured" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
              : s === "error" ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
              : "bg-background/40 text-muted-foreground border-border/60";
            return (
              <Link key={cat.type} to="/founder/customer-sales/settings"
                className="rounded-md border border-border/60 bg-background/40 p-2 hover:border-primary/60 transition block">
                <p className="text-[11px] font-medium truncate">{cat.label}</p>
                <Badge variant="outline" className={`text-[9px] mt-1 ${tone}`}>{s.replace(/_/g, " ")}</Badge>
                <p className="text-[9px] text-muted-foreground mt-1">in {p?.inbound_enabled ? "✓" : "—"} · out {p?.outbound_enabled ? "✓" : "—"}</p>
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Calls today" value={data?.callsToday} />
          <Stat label="Failed calls" value={data?.failedCalls} />
          <Stat label="Approval-required" value={data?.approvalRequired} />
        </div>
        <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 text-xs">
          <span className="font-semibold text-primary">Next setup action: </span>{summaryNext}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <p className="text-lg font-bold leading-none">{value ?? 0}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
