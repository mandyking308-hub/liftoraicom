import { useCallback, useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Activity, Flame, Globe, Mailbox, RefreshCw, ShieldAlert } from "lucide-react";
import {
  buildEstateSnapshot,
  evaluateMailboxReadiness,
  evaluateSenderInfrastructureReadiness,
  GSM_EVERGREEN_DEFAULT_PER_BUSINESS,
  GSM_OWNER_LEGAL_ENTITY,
  type GsmAllocationRecord,
  type GsmDomainSignals,
  type GsmMailboxSignals,
} from "../../../supabase/functions/_shared/gsmSenderEstate";

interface PoolRow {
  id: string;
  pool_key: string;
  pool_name: string;
  pool_type: string;
  target_capacity: number;
  state: string;
}

interface SyncRun {
  provider: string;
  run_mode: string;
  status: string;
  error_code: string | null;
  started_at: string;
}

const Metric = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-lg border border-border/60 p-4">
    <div className="text-2xl font-semibold tabular-nums">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
    {hint ? <div className="mt-1 text-xs text-muted-foreground/80">{hint}</div> : null}
  </div>
);

const ResultSummary = ({ title, value }: { title: string; value: Record<string, unknown> | null }) => {
  if (!value) return null;
  const keys = [
    "connection_state",
    "mode",
    "domains_seen",
    "mailboxes_seen",
    "would_upsert_domains",
    "would_upsert_mailboxes",
    "domains_upserted",
    "mailboxes_upserted",
    "accounts_seen",
    "gsm_candidates",
    "matched_existing_gsm_count",
    "updated_gsm_mailboxes",
    "unmatched_count",
    "excluded_non_gsm",
    "warming_started",
    "selected_total",
    "inserted_count",
    "webhook_secret_configured",
    "provider_webhook_configured",
    "provider_events_observed",
    "verified_event_return",
    "blocker",
    "error_code",
    "message",
  ];
  const rows = keys.filter((k) => value[k] !== undefined).map((k) => [k, value[k]] as const);
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
      <div className="mb-2 font-medium">{title}</div>
      <div className="grid gap-1 md:grid-cols-2">
        {rows.map(([key, raw]) => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground">{key.replaceAll("_", " ")}:</span>
            <span className="break-all">{typeof raw === "object" ? JSON.stringify(raw) : String(raw)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function GSMOutboundPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<GsmDomainSignals[]>([]);
  const [mailboxes, setMailboxes] = useState<GsmMailboxSignals[]>([]);
  const [allocations, setAllocations] = useState<GsmAllocationRecord[]>([]);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [lastSync, setLastSync] = useState<SyncRun | null>(null);
  const [winnr, setWinnr] = useState<Record<string, unknown> | null>(null);
  const [smartlead, setSmartlead] = useState<Record<string, unknown> | null>(null);
  const [webhook, setWebhook] = useState<Record<string, unknown> | null>(null);
  const [poolResult, setPoolResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: d }, { data: m }, { data: a }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("gsm_sending_domains").select("*").order("domain"),
      supabase.from("gsm_mailboxes").select("*").order("email").limit(500),
      supabase.from("gsm_mailbox_allocations").select("*").eq("allocation_status", "active"),
      supabase.from("gsm_sender_pools").select("id, pool_key, pool_name, pool_type, target_capacity, state").order("pool_type"),
      supabase.from("gsm_provider_sync_runs").select("provider, run_mode, status, error_code, started_at").order("started_at", { ascending: false }).limit(1),
    ]);
    setDomains((d ?? []) as GsmDomainSignals[]);
    setMailboxes((m ?? []) as GsmMailboxSignals[]);
    setAllocations(((a ?? []) as unknown[]).map((row) => row as GsmAllocationRecord));
    setPools((p ?? []) as PoolRow[]);
    setLastSync(((s ?? [])[0] as SyncRun) ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const call = async (
    fn: string,
    label: string,
    body: Record<string, unknown>,
    set: (v: Record<string, unknown>) => void,
  ) => {
    setBusy(label);
    const { data, error } = await supabase.functions.invoke(fn, { body });
    setBusy(null);
    if (error) {
      toast({ title: `${label} failed`, description: error.message, variant: "destructive" });
      return;
    }
    const result = (data ?? {}) as Record<string, unknown>;
    set(result);
    toast({ title: label, description: String(result.message ?? result.connection_state ?? "Completed") });
    await load();
  };

  const confirmed = (message: string) => window.confirm(message);

  const snapshot = buildEstateSnapshot(mailboxes, domains, allocations);
  const readiness = evaluateSenderInfrastructureReadiness({ mailboxes, domains, allocations });
  const winnrConnected = winnr?.winnr_token_configured === true && winnr?.connection_state === "connected";
  const smartleadConnected = smartlead?.connection_state === "connected";
  const webhookReady = webhook?.ready_for_event_return === true;

  const blocker =
    snapshot.mailbox_count === 0
      ? "The Winnr mailbox estate has been purchased, but it has not yet been securely synced into Liftor. Configure WINNR_API_TOKEN server-side, then run Winnr Preview Sync and Apply Sync."
      : readiness.blockers.join(", ") || null;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">GSM Outbound Infrastructure</h1>
          <p className="text-muted-foreground">
            One shared portfolio sending estate owned by {GSM_OWNER_LEGAL_ENTITY}. The Winnr estate is purchased; Liftor
            is the system of record and Smartlead remains the delivery engine. This page never sends a campaign email.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Observed estate" value={`${snapshot.mailbox_count} / ${snapshot.target_total_mailboxes}`} hint="actual count comes from provider sync; 50 is the operating target" />
          <Metric label="Sending domains" value={snapshot.domain_count} />
          <Metric label="Campaign ready" value={snapshot.campaign_ready_count} />
          <Metric label="Configured daily capacity" value={snapshot.configured_daily_capacity} />
          <Metric label="Launch Lane" value={`${snapshot.launch_allocated} / ${snapshot.launch_target}`} hint="target 30; only campaign-ready mailboxes can enter" />
          <Metric label="Evergreen Lane" value={`${snapshot.evergreen_allocated} / ${snapshot.evergreen_target}`} hint={`${GSM_EVERGREEN_DEFAULT_PER_BUSINESS} per graduated business`} />
          <Metric label="Mail send / receive OK" value={`${snapshot.smtp_ok_count} / ${snapshot.imap_ok_count}`} />
          <Metric label="Warming" value={snapshot.warming_count} />
          <Metric label="Quarantined" value={snapshot.quarantined_count} />
          <Metric label="Retired" value={snapshot.retired_count} />
          <Metric label="Sender readiness" value={readiness.sender_infrastructure_ready ? "ready" : "not ready"} />
          <Metric label="Last provider sync" value={lastSync ? new Date(lastSync.started_at).toLocaleString() : "never"} hint={lastSync ? `${lastSync.provider} · ${lastSync.status}` : undefined} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Provider controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={winnrConnected ? "default" : "secondary"}>Winnr: {winnr ? String(winnr.connection_state ?? "unknown") : "not checked"}</Badge>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-winnr-sync", "Winnr test", { action: "test" }, setWinnr)}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-winnr-sync", "Winnr preview", { action: "sync", apply: false }, setWinnr)}>
                  Preview sync
                </Button>
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => confirmed("Apply the purchased Winnr estate into Liftor? This writes only non-secret domain/mailbox metadata and sends no email.") && call("gsm-winnr-sync", "Winnr registry sync", { action: "sync", apply: true, external_action_confirmation: "SYNC GSM WINNR REGISTRY" }, setWinnr)}
                >
                  Apply sync
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null || snapshot.mailbox_count === 0}
                  onClick={() => confirmed("Start Winnr warm-up for every synced, active GSM mailbox at 15/day with a slow ramp? This is warm-up traffic, not campaign sending.") && call("gsm-winnr-sync", "Start Winnr warm-up", { action: "warmup", external_action_confirmation: "START GSM WINNR WARMUP" }, setWinnr)}
                >
                  <Flame className="mr-2 h-4 w-4" /> Start warm-up
                </Button>
              </div>
              {winnr && winnr.winnr_token_configured === false ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <strong>Secure setup action:</strong> {String(winnr.next_action ?? "Add WINNR_API_TOKEN as a server-side secret. Do not paste it into chat or browser code.")}
                </div>
              ) : null}
              <ResultSummary title="Winnr result" value={winnr} />
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={smartleadConnected ? "default" : "secondary"}>Smartlead mailboxes: {smartlead ? String(smartlead.connection_state ?? "unknown") : "not checked"}</Badge>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-smartlead-mailbox-sync", "Smartlead preview", { apply: false }, setSmartlead)}>
                  Preview sync
                </Button>
                <Button
                  size="sm"
                  disabled={busy !== null || snapshot.mailbox_count === 0}
                  onClick={() => confirmed("Apply Smartlead account status to matching GSM registry rows? This does not create campaigns or send email.") && call("gsm-smartlead-mailbox-sync", "Smartlead registry sync", { apply: true, external_action_confirmation: "SYNC GSM SMARTLEAD REGISTRY" }, setSmartlead)}
                >
                  Apply sync
                </Button>
              </div>
              <ResultSummary title="Smartlead mailbox result" value={smartlead} />
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={webhookReady ? "default" : "secondary"}>Webhook: {webhookReady ? "event-return verified" : "not verified"}</Badge>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("smartlead-webhook-status", "Webhook status", {}, setWebhook)}>
                  <Activity className="mr-2 h-4 w-4" /> Check webhook
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                The webhook secret is checked server-side and never displayed. Provider configuration is not marked green until real evidence exists.
              </div>
              <ResultSummary title="Webhook result" value={webhook} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Mailbox className="h-4 w-4" /> Capacity lanes</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-pool-allocate", "Pool allocation preview", { pool_key: "all", apply: false }, setPoolResult)}>
                Preview fill
              </Button>
              <Button
                size="sm"
                disabled={busy !== null || snapshot.campaign_ready_count === 0}
                onClick={() => confirmed("Allocate campaign-ready GSM mailboxes into Launch and Evergreen lanes? Sticky/in-flight senders will be preserved and no email will be sent.") && call("gsm-pool-allocate", "Fill sender pools", { pool_key: "all", apply: true, external_action_confirmation: "ALLOCATE GSM SENDER POOLS" }, setPoolResult)}
              >
                Fill ready capacity
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pools.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lanes configured.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {pools.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                    <span>{p.pool_name}</span>
                    <span className="text-muted-foreground">
                      target {p.target_capacity} · allocated {allocations.filter((a) => a.pool_id === p.id).length} · {p.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <ResultSummary title="Pool allocation result" value={poolResult} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Blockers and exclusions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{blocker ? <span className="text-destructive">{blocker}</span> : "No sender-infrastructure blockers."}</div>
            <div className="text-muted-foreground">
              hello@neoncandy.online is legacy Neon Candy infrastructure. It is external_non_gsm and can never join the GSM estate or be allocated to an education campaign.
            </div>
            <div className="text-muted-foreground">
              Warm-up, provider sync and pool allocation do not approve or activate Billy, Aurelia, Kindnesss or Kingsbridge campaigns. Founder campaign approval remains a separate gate.
            </div>
            <div className="text-muted-foreground">
              A mailbox already carrying a live conversation keeps its sender. Reallocating Launch capacity never rewrites an in-flight thread.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mailboxes</CardTitle></CardHeader>
          <CardContent>
            {mailboxes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The provider estate is purchased, but no GSM mailbox metadata has been synced into Liftor yet. This remains fail-closed until the secure Winnr sync is applied.
              </p>
            ) : (
              <div className="space-y-1 text-sm">
                {mailboxes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                    <span>{m.email}</span>
                    <Badge variant="secondary">
                      {evaluateMailboxReadiness(m, domains.find((d) => d.id === m.sending_domain_id) ?? null).readiness_state}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}
