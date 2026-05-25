import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SUPPORTED_VOICE_PROVIDERS, VoiceProviderType } from "@/lib/providers/voiceProviderAdapter";
import { Lock, Phone, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function CustomerSalesSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["cs-settings"],
    queryFn: async () => {
      const sb: any = supabase;
      const [providers, knowledge, closeProviders] = await Promise.all([
        sb.from("customer_sales_provider_settings").select("*"),
        sb.from("customer_sales_knowledge_sources").select("*").order("created_at", { ascending: false }).limit(20),
        sb.from("customer_sales_close_provider_settings").select("*").order("provider_label"),
      ].map(p => p.catch(() => ({ data: [] }))));
      return {
        providers: (providers.data ?? []) as any[],
        knowledge: (knowledge.data ?? []) as any[],
        closeProviders: (closeProviders.data ?? []) as any[],
      };
    },
  });

  const provisionMutation = useMutation({
    mutationFn: async (type: VoiceProviderType) => {
      const sb: any = supabase;
      const { error } = await sb.from("customer_sales_provider_settings").insert({
        provider_type: type,
        provider_status: "not_connected",
        active: true,
        inbound_enabled: false,
        outbound_enabled: false,
        web_call_enabled: false,
        batch_calls_enabled: false,
        recording_enabled: false,
        transcription_enabled: false,
        consent_notice_required: true,
        api_secret_configured: false,
        next_setup_action: "Add API credentials and select a phone number",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Provider slot created"); qc.invalidateQueries({ queryKey: ["cs-settings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add provider"),
  });

  const byType: Record<string, any> = {};
  (data?.providers ?? []).forEach(p => { byType[p.provider_type] = p; });

  return (
    <CSLayout
      title="Settings"
      subtitle="Connect voice/phone/chat providers, set consent language, and manage knowledge sources. Secrets are stored server-side. No external traffic is sent until a provider is live and the founder approves the action."
    >
      <CSSection title="Voice provider catalogue" description="Liftor supports five providers. Adding a slot does not store any secret or attempt a call.">
        <div className="grid lg:grid-cols-2 gap-3">
          {SUPPORTED_VOICE_PROVIDERS.map((p) => {
            const row = byType[p.type];
            return <ProviderCard key={p.type} catalogue={p} row={row} onProvision={() => provisionMutation.mutate(p.type)} />;
          })}
        </div>
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

      <CSSection title="Close-engine providers" description="Placeholders for Stripe, invoicing, DocuSign / Dropbox Sign, calendar booking and email follow-up. No secrets stored here yet. External sends remain approval-gated until activation.">
        {(data?.closeProviders ?? []).length === 0 ? (
          <CSEmptyState title="No close providers seeded" />
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {(data?.closeProviders ?? []).map((p: any) => (
              <li key={p.id} className="rounded border border-border/40 bg-background/40 p-2 text-[11px] space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{p.provider_label}</span>
                  <Badge variant="outline" className={`text-[10px] ${p.configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                    {p.configured ? "configured" : "not configured"}
                  </Badge>
                </div>
                <div className="text-muted-foreground">{p.provider_category} · pre-approved rule: {p.pre_approved_rule_allowed ? "allowed" : "no"}</div>
                {p.next_setup_action && <div className="text-primary/80"><span className="font-semibold">Next:</span> {p.next_setup_action}</div>}
              </li>
            ))}
          </ul>
        )}
      </CSSection>
    </CSLayout>
  );
}

function ProviderCard({ catalogue, row, onProvision }: { catalogue: { type: VoiceProviderType; label: string; description: string }; row: any; onProvision: () => void }) {
  const [testing, setTesting] = useState(false);
  const status = row?.provider_status ?? "not_connected";
  const statusTone =
    status === "live" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : status === "configured" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
    : status === "error" ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
    : status === "paused" ? "bg-muted text-muted-foreground border-border/60"
    : "bg-background/40 text-muted-foreground border-border/60";

  const nextAction = !row ? "Create provider slot"
    : !row.api_secret_configured ? "Add API credentials (server-side only)"
    : !row.phone_number ? "Assign a phone number"
    : !row.consent_notice_text && row.consent_notice_required ? "Write consent/recording notice"
    : status === "not_connected" ? "Mark as configured once a provider test passes"
    : status === "configured" ? "Run a provider test, then move to live"
    : status === "live" ? "Founder approval still required for every outbound action"
    : row.next_setup_action ?? "Review provider state";

  const runTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-voice-provider-test", {
        body: { provider: catalogue.type, test_label: "LIVE_INTERNAL_TEST" },
      });
      if (error) throw error;
      toast.success(`Provider test logged (${data?.note ? "stub" : "ok"}) — no external call made`);
    } catch (e: any) {
      toast.error(e?.message ?? "Provider test failed");
    } finally { setTesting(false); }
  };

  return (
    <Card className="tech-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Phone size={14} className="text-primary" /> {catalogue.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{catalogue.description}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] ${statusTone}`}>{status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <Flag label="API key configured" on={!!row?.api_secret_configured} />
        <Flag label="Inbound" on={!!row?.inbound_enabled} />
        <Flag label="Outbound" on={!!row?.outbound_enabled} />
        <Flag label="Web call" on={!!row?.web_call_enabled} />
        <Flag label="Batch calls" on={!!row?.batch_calls_enabled} />
        <Flag label="Recording" on={!!row?.recording_enabled} />
        <Flag label="Transcription" on={!!row?.transcription_enabled} />
        <Flag label="Consent notice required" on={row?.consent_notice_required !== false} />
      </div>

      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <div>Phone: <span className="font-mono">{row?.phone_number ?? "—"}</span></div>
        <div>Webhook URL: <span className="font-mono break-all">{row?.webhook_url ?? "—"}</span></div>
        <div>Default voice: {row?.default_voice_name ?? row?.default_voice_id ?? "—"} · Default agent: {row?.default_agent_name ?? row?.default_agent_id ?? "—"}</div>
        <div>Last test: {row?.last_test_at ? new Date(row.last_test_at).toLocaleString() : "—"} {row?.last_test_result ? `· ${row.last_test_result}` : ""}</div>
        {row?.last_error && <div className="text-rose-400">Last error: {row.last_error}</div>}
      </div>

      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-[11px] flex gap-2">
        <Lock size={12} className="text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-200">External actions remain gated</p>
          <p className="text-muted-foreground">Secrets are stored server-side only. Liftor never dials, sends payments or contracts without explicit founder approval.</p>
        </div>
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px]">
        <span className="font-semibold text-primary">Next setup action: </span>{nextAction}
      </div>

      <div className="flex flex-wrap gap-2">
        {!row && <Button size="sm" variant="outline" onClick={onProvision}>Create provider slot</Button>}
        {row && <Button size="sm" variant="outline" onClick={runTest} disabled={testing}>{testing ? "Testing…" : "Run provider test"}</Button>}
      </div>
    </Card>
  );
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {on ? <CheckCircle2 size={11} className="text-emerald-400" /> : <AlertTriangle size={11} className="text-muted-foreground" />}
      <span className={on ? "" : "text-muted-foreground"}>{label}</span>
    </span>
  );
}
