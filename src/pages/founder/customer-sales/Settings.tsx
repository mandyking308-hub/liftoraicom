import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Badge } from "@/components/ui/badge";

export default function CustomerSalesSettings() {
  const { data } = useQuery({
    queryKey: ["cs-settings"],
    queryFn: async () => {
      const sb: any = supabase;
      const [providers, knowledge] = await Promise.all([
        sb.from("customer_sales_provider_settings").select("*"),
        sb.from("customer_sales_knowledge_sources").select("*").order("created_at", { ascending: false }).limit(20),
      ].map(p => p.catch(() => ({ data: [] }))));
      return { providers: (providers.data ?? []) as any[], knowledge: (knowledge.data ?? []) as any[] };
    },
  });
  return (
    <CSLayout title="Settings" subtitle="Connect voice/phone/chat providers and manage knowledge sources. No external traffic is sent until a provider is live and the founder approves it.">
      <CSSection title="Providers" description="Retell, Vapi, Twilio, ElevenLabs, or a custom provider. Each requires its own API secret before going live.">
        {(data?.providers ?? []).length === 0 ? (
          <CSEmptyState title="No providers connected" hint="Liftor will continue preparing scripts, qualification and close actions internally until a provider is added." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {(data?.providers ?? []).map((p: any) => (
              <div key={p.id} className="rounded-md border border-border/60 bg-background/40 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize">{p.provider_type}</span>
                  <Badge variant="outline" className="text-[10px]">{p.provider_status}</Badge>
                </div>
                <p className="text-muted-foreground">Secret configured: {p.api_secret_configured ? "yes" : "no"} · Inbound: {p.inbound_enabled ? "on" : "off"} · Outbound: {p.outbound_enabled ? "on" : "off"}</p>
                <p className="text-yellow-300/90">Approval: outbound {p.require_founder_approval_for_outbound ? "✓" : "✗"} · payment {p.require_founder_approval_for_payment ? "✓" : "✗"} · contract {p.require_founder_approval_for_contract ? "✓" : "✗"}</p>
              </div>
            ))}
          </div>
        )}
      </CSSection>

      <CSSection title="Knowledge sources" description="Founder-verified sources Liftor is allowed to quote from.">
        {(data?.knowledge ?? []).length === 0 ? (
          <CSEmptyState title="No knowledge sources added" hint="Add product sheets, FAQs, pricing sheets, case studies or founder notes so Liftor stays accurate." />
        ) : (
          <ul className="text-xs space-y-1">
            {(data?.knowledge ?? []).map((k: any) => (
              <li key={k.id} className="rounded border border-border/40 bg-background/40 p-2 flex items-center justify-between gap-2">
                <span>{k.title} <span className="text-muted-foreground">— {k.source_type}</span></span>
                <Badge variant="outline" className="text-[10px]">{k.verified_by_founder ? "verified" : "unverified"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CSSection>
    </CSLayout>
  );
}