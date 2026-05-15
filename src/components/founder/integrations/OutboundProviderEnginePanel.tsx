import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Plug, Rocket, ServerCog, ShieldAlert, Webhook, XCircle } from "lucide-react";

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={
      ok
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
    }
  >
    {ok ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
    {label}
  </Badge>
);

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3 text-[11px]">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-mono text-foreground/90 text-right break-all">{v ?? "—"}</span>
  </div>
);

export default function OutboundProviderEnginePanel() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("provider-readiness-check", {
      body: {},
    });
    if (error) setErr(error.message);
    else setData(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const runSmartleadTest = async () => {
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("smartlead-test-connection", {
      body: {},
    });
    setTesting(false);
    if (error) {
      setTestResult({ ok: false, error: error.message });
      toast({ title: "Smartlead test failed", description: error.message, variant: "destructive" });
      return;
    }
    setTestResult(data);
    toast({
      title: data?.ok ? "Smartlead connection OK" : "Smartlead test result",
      description: data?.ok
        ? `Read-only campaigns list returned${data?.campaign_count != null ? ` (${data.campaign_count} campaigns)` : ""}.`
        : data?.reason ?? data?.error ?? "See result panel.",
    });
    refresh();
  };

  const proof = data?.proof_provider;
  const scale = data?.scale_provider;
  const smartlead = data?.smartlead_provider ?? scale;
  const webhook = data?.smartlead_webhook_blueprint;
  const r = data?.readiness ?? {};

  return (
    <Card
      id="outbound-provider-engine"
      data-testid="outbound-provider-engine"
      className="p-5 space-y-4 border-2 border-border/60 scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <ServerCog className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Outbound Provider Engine</h3>
        <Badge variant="outline" className="text-[10px]">read-only</Badge>
      </div>
      <p className="text-xs text-muted-foreground max-w-2xl">
        Provider-agnostic sending foundation. IONOS is proof / low-volume only. The scale
        provider for bulk outreach is not configured yet. No provider calls are made by this
        panel.
      </p>

      {loading && <p className="text-xs text-muted-foreground">Loading provider readiness…</p>}
      {err && <p className="text-xs text-destructive">Error: {err}</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            <Pill ok={!!r.proof_provider_configured} label={`Proof: ${r.proof_provider_configured ? "configured" : "not configured"}`} />
            <Pill ok={!!r.scale_provider_configured} label={`Scale: ${r.scale_provider_configured ? "configured" : "not configured"}`} />
            <Pill ok={!!r.can_send_proof} label={`can_send_proof: ${r.can_send_proof ? "yes" : "no"}`} />
            <Pill ok={!!r.can_send_scale} label={`can_send_scale: ${r.can_send_scale ? "yes" : "no"}`} />
            <Badge variant="outline" className="text-[10px] border-border/60">
              mode: {data.provider_mode_summary}
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-md border border-border/60 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Plug className="h-3.5 w-3.5 text-emerald-400" />
                Proof provider — IONOS
              </div>
              {proof ? (
                <>
                  <KV k="provider" v={proof.provider_name} />
                  <KV k="type" v={proof.provider_type} />
                  <KV k="status" v={proof.status} />
                  <KV k="from_email" v={proof.from_email} />
                  <KV k="from_name" v={proof.from_name} />
                  <KV k="sending_domain" v={proof.sending_domain} />
                  <KV k="reply_to" v={proof.reply_to} />
                  <KV k="daily_cap" v={proof.daily_send_cap} />
                  <KV k="hourly_cap" v={proof.hourly_send_cap} />
                  <KV k="health" v={proof.provider_health} />
                  <KV k="credentials_present" v={String(proof.credentials_present)} />
                  <KV k="webhook_configured" v={String(proof.webhook_configured)} />
                  <KV k="last_test_at" v={proof.last_test_at ?? "never"} />
                  <KV k="last_error" v={proof.last_error ?? "none"} />
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">Not seeded.</p>
              )}
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                Scale provider — bulk outbound
              </div>
              {scale ? (
                <>
                  <KV k="provider" v={scale.provider_name} />
                  <KV k="type" v={scale.provider_type} />
                  <KV k="status" v={scale.status} />
                  <KV k="sending_domain" v={scale.sending_domain ?? "not configured"} />
                  <KV k="from_email" v={scale.from_email ?? "not configured"} />
                  <KV k="daily_cap" v={scale.daily_send_cap ?? "not set"} />
                  <KV k="health" v={scale.provider_health} />
                  <KV k="credentials_present" v={String(scale.credentials_present)} />
                  <KV k="webhook_configured" v={String(scale.webhook_configured)} />
                  <KV k="last_test_at" v={scale.last_test_at ?? "never"} />
                  <p className="pt-2 text-[11px] text-amber-200">
                    Next setup action: choose & connect bulk provider, verify domain, store
                    credentials, configure webhook for bounce/reply tracking.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">Not seeded.</p>
              )}
            </div>
          </div>

          {smartlead && smartlead.provider_type === "smartlead" && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                  Smartlead — scale candidate (cold outreach orchestration)
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runSmartleadTest}
                  disabled={testing}
                  data-testid="smartlead-test-connection-btn"
                >
                  {testing ? "Testing…" : "Test Smartlead Connection"}
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4">
                <KV k="provider_name" v="Smartlead" />
                <KV k="base_url" v="https://server.smartlead.ai/api/v1" />
                <KV k="auth_method" v="api_key query param (secret-backed)" />
                <KV k="secret_name" v="SMARTLEAD_API_KEY" />
                <KV k="status" v={smartlead.status} />
                <KV k="health" v={smartlead.provider_health} />
                <KV k="credentials_present" v={String(smartlead.credentials_present)} />
                <KV
                  k="connection_test_result"
                  v={
                    testResult?.tested
                      ? testResult.ok
                        ? "ok"
                        : "error"
                      : (data?.smartlead_summary?.connection_test_result ?? "not_run")
                  }
                />
                <KV
                  k="campaign_count"
                  v={testResult?.campaign_count ?? "run test to fetch"}
                />
                <KV
                  k="active_campaign_count"
                  v={testResult?.active_campaign_count ?? "—"}
                />
                <KV
                  k="drafted_campaign_count"
                  v={testResult?.drafted_campaign_count ?? "—"}
                />
                <KV
                  k="email_account_count"
                  v={testResult?.email_account_count ?? "run test to fetch"}
                />
                <KV
                  k="sending_accounts_present"
                  v={
                    testResult?.sending_accounts_present == null
                      ? "—"
                      : String(testResult.sending_accounts_present)
                  }
                />
                <KV
                  k="warmup_account_count"
                  v={testResult?.warmup_account_count ?? "—"}
                />
                <KV k="webhook_configured" v={String(smartlead.webhook_configured)} />
                <KV k="warmup_status" v={smartlead.warmup_status ?? "not_configured"} />
                <KV k="scale_sending_enabled" v="no" />
                <KV k="last_test_at" v={smartlead.last_test_at ?? "never"} />
                <KV k="last_error" v={smartlead.last_error ?? "none"} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Test runs read-only Smartlead endpoints only:
                <span className="font-mono"> /campaigns/?include_tags=true</span>,
                <span className="font-mono"> /email-accounts/?offset=0&limit=100</span>,
                <span className="font-mono"> /webhooks</span>,
                <span className="font-mono"> /analytics/overview</span>. No campaign
                creation, no leads pushed, no email-account creation, no webhook creation,
                no sends. SMARTLEAD_API_KEY stays server-side.
              </p>
              {testResult?.blockers?.length > 0 && (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
                  <div className="font-medium text-amber-300 mb-1">Blockers</div>
                  <ul className="list-disc pl-4 text-amber-100 space-y-0.5">
                    {testResult.blockers.map((b: string) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Next setup action:{" "}
                {!smartlead.credentials_present
                  ? "add SMARTLEAD_API_KEY secret, then run Test Smartlead Connection."
                  : !smartlead.last_test_at
                    ? "run Test Smartlead Connection."
                    : (testResult?.email_account_count ?? 0) === 0
                      ? "add at least one Smartlead sending account (manually in Smartlead) and re-test."
                      : !smartlead.webhook_configured
                        ? "configure Smartlead webhook (blueprint stage — not built yet)."
                        : "build campaign mapping + lead push preview (next phase)."}
              </p>
              {testResult && (
                <div className="rounded border border-border/60 bg-background/40 p-2 text-[11px]">
                  <div className="font-medium mb-1">Last test result (raw)</div>
                  <KV k="ok" v={String(testResult.ok)} />
                  <KV k="tested" v={String(testResult.tested ?? false)} />
                  <KV
                    k="http campaigns"
                    v={testResult.http_status?.campaigns ?? "—"}
                  />
                  <KV
                    k="http email-accounts"
                    v={testResult.http_status?.email_accounts ?? "—"}
                  />
                  <KV
                    k="http webhooks"
                    v={testResult.http_status?.webhooks ?? "—"}
                  />
                  <KV
                    k="http analytics"
                    v={testResult.http_status?.analytics_overview ?? "—"}
                  />
                  <KV k="reason" v={testResult.reason ?? "—"} />
                  <KV k="error" v={testResult.error ?? "none"} />
                </div>
              )}
            </div>
          )}

          {webhook && (
            <div className="rounded-md border border-border/60 p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Webhook className="h-3.5 w-3.5 text-primary" />
                Smartlead webhook blueprint
                <Badge variant="outline" className="text-[10px]">read-only</Badge>
                <Badge
                  variant="outline"
                  className={
                    webhook.configured
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px]"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px]"
                  }
                >
                  {webhook.configured ? "configured" : "not configured"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{webhook.note}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {webhook.events.map((e: string) => (
                  <Badge key={e} variant="outline" className="text-[10px] font-mono">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border border-border/60 p-3 space-y-1">
            <div className="text-xs font-semibold">Capability matrix</div>
            <div className="grid sm:grid-cols-2 gap-1">
              <KV k="provider_credentials_present" v={String(r.provider_credentials_present)} />
              <KV k="provider_health_ok" v={String(r.provider_health_ok)} />
              <KV k="webhook_configured" v={String(r.webhook_configured)} />
              <KV k="sending_domain_ready" v={String(r.sending_domain_ready)} />
              <KV k="unsubscribe_footer_supported" v={String(r.unsubscribe_footer_supported)} />
              <KV k="tracking_supported" v={String(r.tracking_supported)} />
              <KV k="bounce_handling_supported" v={String(r.bounce_handling_supported)} />
              <KV k="reply_handling_supported" v={String(r.reply_handling_supported)} />
            </div>
          </div>

          {data.blockers?.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <div className="text-[11px] font-medium text-amber-300">Open items</div>
              <ul className="list-disc pl-5 text-[11px] text-amber-100 space-y-0.5">
                {data.blockers.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}