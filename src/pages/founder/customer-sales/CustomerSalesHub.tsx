import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CSLayout, CSSection } from "./_shared";
import { Phone, BookOpen, ListChecks, MessageSquare, Target, Tag, Shield, Bell, Settings as Cog, ArrowRight, Activity } from "lucide-react";

function Tile({ to, icon: Icon, label, value, hint }: any) {
  return (
    <Link to={to} className="group block rounded-lg border border-border/60 bg-background/40 p-3 hover:border-primary/60 transition">
      <div className="flex items-start justify-between"><Icon size={14} className="text-primary" /><ArrowRight size={12} className="opacity-60 group-hover:opacity-100" /></div>
      <p className="mt-1.5 text-2xl font-bold leading-none">{value ?? 0}</p>
      <p className="text-[11px] mt-1">{label}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </Link>
  );
}

export default function CustomerSalesHub() {
  const { data } = useQuery({
    queryKey: ["customer-sales-hub"],
    queryFn: async () => {
      const sb: any = supabase;
      const head = { count: "exact" as const, head: true };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [products, offers, playbooks, convsLive, convsFollowUp, closesPending, callsToday, hotSignals, providers, objections] = await Promise.all([
        sb.from("customer_sales_products").select("id", head).eq("active", true),
        sb.from("customer_sales_offers").select("id", head).eq("active", true),
        sb.from("customer_sales_playbooks").select("id", head).eq("active", true),
        sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "live"),
        sb.from("customer_sales_conversations").select("id", head).eq("conversation_status", "follow_up_needed"),
        sb.from("customer_sales_close_actions").select("id", head).eq("action_status", "approval_required"),
        sb.from("customer_sales_call_logs").select("id", head).gte("started_at", today.toISOString()),
        sb.from("customer_sales_conversations").select("id", head).gte("close_probability", 0.7),
        sb.from("customer_sales_provider_settings").select("provider_type,provider_status,active").eq("active", true),
        sb.from("customer_sales_objection_library").select("id", head).eq("active", true),
      ].map(p => p.catch(() => ({ count: 0, data: [] }))));
      return {
        products: products.count ?? 0, offers: offers.count ?? 0, playbooks: playbooks.count ?? 0,
        convsLive: convsLive.count ?? 0, convsFollowUp: convsFollowUp.count ?? 0,
        closesPending: closesPending.count ?? 0, callsToday: callsToday.count ?? 0,
        hotSignals: hotSignals.count ?? 0, objections: objections.count ?? 0,
        providers: (providers.data ?? []) as any[],
      };
    },
  });

  const providerLive = (data?.providers ?? []).some(p => p.provider_status === "live");

  return (
    <CSLayout
      title="Customer Voice + Sales Close Engine"
      subtitle="Hold conversations, qualify, handle objections, prepare closes and hand off to payment/contract/booking. Internal preparation runs live; outbound calls, payments and contract sends remain approval-gated until a provider is connected and founder rules permit."
    >
      <CSSection title="Today at a glance" description="Click any tile to act. Numbers are live.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Tile to="/founder/customer-sales/voice-console" icon={Phone} label="Calls today" value={data?.callsToday} hint={providerLive ? "provider live" : "no provider connected"} />
          <Tile to="/founder/customer-sales/conversations" icon={MessageSquare} label="Live conversations" value={data?.convsLive} />
          <Tile to="/founder/customer-sales/follow-up" icon={Bell} label="Need follow-up" value={data?.convsFollowUp} />
          <Tile to="/founder/customer-sales/close-engine" icon={Target} label="Close actions waiting approval" value={data?.closesPending} hint="external send locked" />
          <Tile to="/founder/customer-sales/conversations" icon={Activity} label="Hot buying signals" value={data?.hotSignals} hint=">= 70% close probability" />
          <Tile to="/founder/customer-sales/product-knowledge" icon={BookOpen} label="Products" value={data?.products} hint={data?.products ? "" : "add at least one"} />
          <Tile to="/founder/customer-sales/offers" icon={Tag} label="Active offers" value={data?.offers} />
          <Tile to="/founder/customer-sales/playbooks" icon={ListChecks} label="Playbooks" value={data?.playbooks} />
          <Tile to="/founder/customer-sales/objections" icon={Shield} label="Objection library" value={data?.objections} />
          <Tile to="/founder/customer-sales/settings" icon={Cog} label="Providers" value={(data?.providers ?? []).length} hint={providerLive ? "live" : "not connected"} />
          <Tile to="/founder/sales-targets" icon={Target} label="Sales Target Cockpit" value="→" hint="reverse-engineered activity plan" />
          <Tile to="/founder/customer-upgrades" icon={Activity} label="Upgrade + Upsell Engine" value="→" hint="upgrades, cross-sells, renewals" />
        </div>
      </CSSection>

      <CSSection title="Provider status" description="Voice/phone/chat providers. No external traffic is sent until a provider is live and founder rules permit.">
        {(data?.providers ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No provider connected yet. Go to Settings to add Retell, Vapi, Twilio, ElevenLabs or a custom provider. Liftor will continue preparing offers, scripts and conversation drafts in the meantime.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(data?.providers ?? []).map((p, i) => (
              <Badge key={i} variant="outline" className="text-[11px]">{p.provider_type} — {p.provider_status}</Badge>
            ))}
          </div>
        )}
      </CSSection>

      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-3 text-[11px] text-yellow-100">
          External actions (outbound calls, payment links, contract sends, customer/prospect messages, invoice sends) remain locked unless the relevant provider is connected and the founder approves the action. Internal preparation, drafting, CRM updates, product matching, script generation and quote preparation operate live.
        </CardContent>
      </Card>
    </CSLayout>
  );
}