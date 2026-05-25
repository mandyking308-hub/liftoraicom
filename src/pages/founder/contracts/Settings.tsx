import { useEffect, useState } from "react";
import { CTRLayout, CTRSection, CTREmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ContractsSettings() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("contract_provider_settings")
      .select("id,provider_type,provider_status,api_secret_configured,default_template_id,webhook_url,active,updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <CTRLayout title="Settings" subtitle="Signature providers and safety protocols. No provider API call is made until founder explicitly enables a configuration.">
      <CTRSection title="Signature providers" description="DocuSign, Dropbox Sign, PandaDoc or manual. Configuration is stored only — no contracts are sent yet.">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <CTREmpty title="No providers configured" hint="Connect a signature provider here when ready. Manual sign-and-upload is supported by default." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.provider_type}</Badge>
                    <Badge variant="outline" className={r.provider_status === "live" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : r.provider_status === "error" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}>{r.provider_status}</Badge>
                    {r.active && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">active</Badge>}
                    {r.api_secret_configured ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">api secret set</Badge> : <Badge variant="outline" className="bg-muted text-muted-foreground">no api secret</Badge>}
                  </div>
                  {r.default_template_id && <p className="text-muted-foreground">template: {r.default_template_id}</p>}
                  {r.webhook_url && <p className="text-muted-foreground">webhook: {r.webhook_url}</p>}
                </div>
              ))}
            </div>
          )}
      </CTRSection>
      <CTRSection title="Safety protocols" description="Hard-coded into the Contract Lifecycle Engine.">
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          <li>No contract is sent, signed, renewed or terminated without founder approval.</li>
          <li>Legal wording changes require legal review before approval.</li>
          <li>High-risk clauses are escalated to legal review automatically.</li>
          <li>Provider API calls are disabled until the provider is set to live.</li>
        </ul>
      </CTRSection>
      <CTRSection title="Integrations" description="Wired so contracts flow with the rest of Liftor.">
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          <li>Quote-to-Cash — attaches contracts to closed deals and tracks signed revenue.</li>
          <li>Customer Sales — links signed agreements to the originating opportunity.</li>
          <li>Vendor / Supplier Management — tracks vendor contracts and obligations.</li>
          <li>Compliance — flags regulated terms (DPA, NDA) for review.</li>
          <li>Approval Queue — all send, sign, renew and terminate actions routed here.</li>
          <li>Command Centre — surfaces renewals, expirations and overdue obligations.</li>
          <li>Manuals — contract playbooks live in the Founder Manual.</li>
        </ul>
      </CTRSection>
    </CTRLayout>
  );
}