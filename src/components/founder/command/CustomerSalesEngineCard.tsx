import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, Lock } from "lucide-react";

export default function CustomerSalesEngineCard() {
  const { data } = useQuery({
    queryKey: ["cc-customer-sales-card"],
    refetchInterval: 90_000,
    queryFn: async () => {
      const sb: any = supabase;
      const head = { count: "exact" as const, head: true };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [providers, callsToday, followUp, closesPending, hot, productsActive, escalated, consentIssues, missingTranscript, readyToBuy] = await Promise.all([
        sb.from("customer_sales_provider_settings").select("provider_type,provider_status").eq("active", true),
        sb.from("customer_sales_call_logs").select("id", head).gte("started_at", today.toISOString()).is("test_label", null),
        sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "follow_up_needed"),
        sb.from("customer_sales_close_actions").select("id", head).eq("action_status", "approval_required"),
        sb.from("customer_sales_conversations").select("id", head).gte("close_probability", 0.7),
        sb.from("customer_sales_products").select("id", head).eq("active", true),
        sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "escalated"),
        sb.from("customer_sales_call_logs").select("id", head).eq("consent_recorded", false).not("transcript_text", "is", null),
        sb.from("customer_sales_call_logs").select("id", head).is("transcript_text", null),
        sb.from("customer_sales_conversations").select("id", head).eq("call_outcome", "ready_to_buy"),
      ].map(p => p.catch(() => ({ count: 0, data: [] }))));
      return {
        providers: (providers.data ?? []) as any[],
        callsToday: callsToday.count ?? 0,
        followUp: followUp.count ?? 0,
        closesPending: closesPending.count ?? 0,
        hot: hot.count ?? 0,
        productsActive: productsActive.count ?? 0,
        escalated: escalated.count ?? 0,
        consentIssues: consentIssues.count ?? 0,
        missingTranscript: missingTranscript.count ?? 0,
        readyToBuy: readyToBuy.count ?? 0,
      };
    },
  });

  const live = (data?.providers ?? []).some((p: any) => p.provider_status === "live");
  const providerLabel = (data?.providers ?? []).length === 0 ? "no provider connected" : live ? "provider live" : "configured, not live";
  const nextAction =
    (data?.providers ?? []).length === 0 ? "Connect a voice/chat provider in Settings"
    : (data?.productsActive ?? 0) === 0 ? "Add your first product so Liftor can match offers"
    : (data?.escalated ?? 0) > 0 ? `Resolve ${data?.escalated} escalated conversation(s)`
    : (data?.consentIssues ?? 0) > 0 ? `Fix ${data?.consentIssues} call(s) with missing consent`
    : (data?.closesPending ?? 0) > 0 ? `Review ${data?.closesPending} close action(s) waiting approval`
    : (data?.readyToBuy ?? 0) > 0 ? `Convert ${data?.readyToBuy} ready-to-buy customer(s)`
    : (data?.followUp ?? 0) > 0 ? `Work the ${data?.followUp} follow-up item(s)`
    : (data?.hot ?? 0) > 0 ? `Engage ${data?.hot} hot buying signal(s)`
    : "Add a playbook and an objection or two";

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone size={14} className="text-primary" />
          Customer Sales Engine
          <Badge variant="outline" className="text-[10px]">{providerLabel}</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> External actions gated
          </Badge>
          <Link to="/founder/customer-sales" className="ml-auto text-[11px] text-primary inline-flex items-center gap-1">
            Open <ArrowRight size={11} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          <Stat label="Calls today" value={data?.callsToday} to="/founder/customer-sales/call-logs" />
          <Stat label="Follow-ups" value={data?.followUp} to="/founder/customer-sales/follow-up" />
          <Stat label="Close actions awaiting approval" value={data?.closesPending} to="/founder/customer-sales/close-engine" />
          <Stat label="Hot buying signals" value={data?.hot} to="/founder/customer-sales/conversations" />
          <Stat label="Ready to buy" value={data?.readyToBuy} to="/founder/customer-sales/conversations" />
          <Stat label="Escalation needed" value={data?.escalated} to="/founder/customer-sales/conversations" />
          <Stat label="Consent issues" value={data?.consentIssues} to="/founder/customer-sales/call-logs" />
          <Stat label="Missing transcript" value={data?.missingTranscript} to="/founder/customer-sales/call-logs" />
          <Stat label="Products missing knowledge" value={data?.productsActive === 0 ? 1 : 0} to="/founder/customer-sales/product-knowledge" />
        </div>
        <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 text-xs">
          <span className="font-semibold text-primary">Next action: </span>{nextAction}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, to }: { label: string; value?: number; to: string }) {
  return (
    <Link to={to} className="rounded-md border border-border/60 bg-background/40 p-2 hover:border-primary/60 transition block">
      <p className="text-lg font-bold leading-none">{value ?? 0}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </Link>
  );
}