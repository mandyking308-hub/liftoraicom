import { useCallback, useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Globe, Mailbox, RefreshCw, ShieldAlert } from "lucide-react";
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

export default function GSMOutboundPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<GsmDomainSignals[]>([]);
  const [mailboxes, setMailboxes] = useState<GsmMailboxSignals[]>([]);
  const [allocations, setAllocations] = useState<GsmAllocationRecord[]>([]);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [lastSync, setLastSync] = useState<SyncRun | null>(null);
  const [winnr, setWinnr] = useState<Record<string, unknown> | null>(null);
  const [smartlead, setSmartlead] = useState<Record<string, unknown> | null>(null);
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
    const payload = (data ?? {}) as Record<string, unknown>;
    set(payload);
    if (payload.blocker) {
      toast({ title: `${label}: blocked`, description: String(payload.blocker) });
    } else {
      toast({ title: `${label} complete`, description: String(payload.message ?? "Done.") });
    }
    await load();
  };

  /** Every registry-mutating provider action needs an explicit typed confirmation. */
  const confirmed = (label: string, phrase: string) => {
    const typed = window.prompt(`${label}\n\nThis writes to the GSM registry. Type exactly:\n${phrase}`);
    if (typed !== phrase) {
      toast({ title: "Cancelled", description: "Confirmation phrase did not match. Nothing was changed." });
      return false;
    }
    return true;
  };

  const snapshot = buildEstateSnapshot(mailboxes, domains, allocations);
  const readiness = evaluateSenderInfrastructureReadiness({ mailboxes, domains, allocations });
  const winnrConnected = winnr?.winnr_token_configured === true && winnr?.connection_state === "connected";
  const smartleadConnected = smartlead?.connection_state === "connected";
  const winnrAccount = (winnr?.account ?? null) as Record<string, unknown> | null;
  const winnrNextAction = winnr?.next_action ? String(winnr.next_action) : null;

  const blocker =
    snapshot.mailbox_count === 0
      ? winnrNextAction ??
        "No GSM mailboxes are registered yet. Run Check Winnr to see the live provider state and the exact next step."
      : readiness.blockers.join(", ") || null;


  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">GSM Outbound Infrastructure</h1>
          <p className="text-muted-foreground">
            One shared portfolio sending estate owned by {GSM_OWNER_LEGAL_ENTITY}. Apollo is data only, Liftor is the
            system of record, Smartlead runs the campaigns, Winnr will supply the domains and mailboxes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Target estate" value={`${snapshot.mailbox_count} / ${snapshot.target_total_mailboxes}`} hint={`up to ${snapshot.target_max_domains} domains`} />
          <Metric label="Sending domains" value={snapshot.domain_count} />
          <Metric label="Campaign ready" value={snapshot.campaign_ready_count} />
          <Metric label="Configured daily capacity" value={snapshot.configured_daily_capacity} />
          <Metric label="Launch Lane" value={`${snapshot.launch_allocated} / ${snapshot.launch_target}`} hint="lent to the business launching now" />
          <Metric label="Evergreen Lane" value={`${snapshot.evergreen_allocated} / ${snapshot.evergreen_target}`} hint={`${GSM_EVERGREEN_DEFAULT_PER_BUSINESS} per graduated business`} />
          <Metric label="Mail send / receive OK" value={`${snapshot.smtp_ok_count} / ${snapshot.imap_ok_count}`} />
          <Metric label="Warming" value={snapshot.warming_count} />
          <Metric label="Quarantined" value={snapshot.quarantined_count} />
          <Metric label="Retired" value={snapshot.retired_count} />
          <Metric label="Sender readiness" value={readiness.sender_infrastructure_ready ? "ready" : "not ready"} />
          <Metric label="Last provider sync" value={lastSync ? new Date(lastSync.started_at).toLocaleString() : "never"} hint={lastSync ? `${lastSync.provider} · ${lastSync.status}` : undefined} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Providers</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-winnr-sync", "Winnr check", setWinnr)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Check Winnr
              </Button>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-smartlead-mailbox-sync", "Smartlead check", setSmartlead)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Check Smartlead
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={winnrConnected ? "default" : "secondary"}>Winnr: {winnr ? String(winnr.connection_state ?? "unknown") : "not checked"}</Badge>
              <span className="text-muted-foreground">
                {winnr && winnr.winnr_token_configured === false
                  ? "No Winnr access token is configured on the server."
                  : "Domain and mailbox infrastructure provider."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={smartleadConnected ? "default" : "secondary"}>Smartlead: {smartlead ? String(smartlead.connection_state ?? "unknown") : "not checked"}</Badge>
              <span className="text-muted-foreground">Campaign execution and sender rotation. Reads only from this page.</span>
            </div>
            {winnr && winnr.winnr_token_configured === false ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <strong>Next setup action:</strong> {String(winnr.next_action ?? "Create the GSM Winnr account and add its access token as a server secret.")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Blockers and exclusions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{blocker ? <span className="text-destructive">{blocker}</span> : "No blockers."}</div>
            <div className="text-muted-foreground">
              hello@neoncandy.online is legacy Neon Candy infrastructure. It is classified external and can never join the
              GSM estate or be allocated to a portfolio campaign.
            </div>
            <div className="text-muted-foreground">
              A mailbox already carrying a live conversation keeps its sender. Reallocating Launch capacity never rewrites
              an in-flight thread.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mailbox className="h-4 w-4" /> Capacity lanes</CardTitle></CardHeader>
          <CardContent>
            {pools.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lanes configured.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {pools.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                    <span>{p.pool_name}</span>
                    <span className="text-muted-foreground">
                      target {p.target_capacity} · allocated{" "}
                      {allocations.filter((a) => a.pool_id === p.id).length} · {p.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mailboxes</CardTitle></CardHeader>
          <CardContent>
            {mailboxes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No GSM mailboxes registered. This is the true current state, not an error.
              </p>
            ) : (
              <div className="space-y-1 text-sm">
                {mailboxes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                    <span>{m.email}</span>
                    <Badge variant="secondary">
                      {evaluateMailboxReadiness(
                        m,
                        domains.find((d) => d.id === m.sending_domain_id) ?? null,
                      ).readiness_state}
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
