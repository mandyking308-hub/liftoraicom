import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plug, ServerCog, ShieldAlert, XCircle } from "lucide-react";

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("provider-readiness-check", {
        body: {},
      });
      if (error) setErr(error.message);
      else setData(data);
      setLoading(false);
    })();
  }, []);

  const proof = data?.proof_provider;
  const scale = data?.scale_provider;
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