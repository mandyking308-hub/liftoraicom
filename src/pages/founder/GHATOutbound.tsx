import { useCallback, useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Flame, Globe, Mailbox, RefreshCw, ShieldCheck } from "lucide-react";
import {
  evaluateMailboxReadiness,
  GHAT_DOMAINS,
  GHAT_ESTATE_KEY,
  GHAT_EXPECTED_MAILBOXES,
  GHAT_OWNER_LEGAL_ENTITY,
  GHAT_TARGET_MAILBOXES,
  type GsmDomainSignals,
  type GsmMailboxSignals,
} from "../../../supabase/functions/_shared/gsmSenderEstate";

const Metric = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-lg border border-border/60 p-4">
    <div className="text-2xl font-semibold tabular-nums">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
    {hint ? <div className="mt-1 text-xs text-muted-foreground/80">{hint}</div> : null}
  </div>
);

const Result = ({ title, value }: { title: string; value: Record<string, unknown> | null }) => {
  if (!value) return null;
  const keys = [
    "estate",
    "mode",
    "executed",
    "connection_state",
    "domains_seen",
    "mailboxes_seen",
    "estate_counts",
    "would_upsert_domains",
    "would_upsert_mailboxes",
    "domains_upserted",
    "mailboxes_upserted",
    "warming_started",
    "smartlead_accounts_seen",
    "ghat_registry_mailboxes",
    "already_connected",
    "missing_from_smartlead",
    "smartlead_accounts_created",
    "registry_rows_reconciled",
    "failed_count",
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
            <span className="text-muted-foreground">{key.split("_").join(" ")}:</span>
            <span className="break-all">{typeof raw === "object" ? JSON.stringify(raw) : String(raw)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function GHATOutboundPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<GsmDomainSignals[]>([]);
  const [mailboxes, setMailboxes] = useState<GsmMailboxSignals[]>([]);
  const [winnr, setWinnr] = useState<Record<string, unknown> | null>(null);
  const [smartlead, setSmartlead] = useState<Record<string, unknown> | null>(null);
  const [campaignCount, setCampaignCount] = useState<number>(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: d }, { data: m }] = await Promise.all([
      supabase.from("gsm_sending_domains").select("*").eq("estate_classification", GHAT_ESTATE_KEY).order("domain"),
      supabase.from("gsm_mailboxes").select("*").eq("estate_classification", GHAT_ESTATE_KEY).order("email"),
    ]);
    setDomains((d ?? []) as GsmDomainSignals[]);
    setMailboxes((m ?? []) as GsmMailboxSignals[]);
    setCampaignCount(0);
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
    toast({ title: label, description: String(result.message ?? result.mode ?? "Completed") });
    await load();
  };

  const confirmed = (message: string) => window.confirm(message);

  const domainById = new Map(domains.filter((d) => d.id).map((d) => [d.id as string, d]));
  const readiness = mailboxes.map((m) => ({
    mailbox: m,
    result: evaluateMailboxReadiness(m, m.sending_domain_id ? domainById.get(m.sending_domain_id) : null),
  }));
  const ok = (v: unknown) => ["ok", "success", "connected", "verified"].includes(String(v ?? "").toLowerCase());
  const warming = readiness.filter((r) => r.result.readiness_state === "warming").length;
  const campaignReady = readiness.filter((r) => r.result.campaign_ready).length;
  const smtpOk = mailboxes.filter((m) => ok(m.smtp_status)).length;
  const imapOk = mailboxes.filter((m) => ok(m.imap_status)).length;
  const smartleadConnected = mailboxes.filter((m) => m.smartlead_email_account_id).length;
  const warmupStarted = mailboxes.filter((m) => ["warming", "in_progress", "active", "running", "started"].includes(String(m.warmup_status ?? "").toLowerCase())).length;
  const byEmail = new Map(mailboxes.map((m) => [String(m.email).toLowerCase(), m]));

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">GHAT Outbound Estate</h1>
          <p className="text-muted-foreground">
            Dedicated sending estate for {GHAT_OWNER_LEGAL_ENTITY} on {GHAT_DOMAINS[0]}. This estate is reputationally
            and operationally separate from the shared commercial estate: it is never counted in GSM capacity and can
            never be allocated from the GSM Launch or Evergreen lanes. This page never sends a campaign email.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Sending domain" value={domains.length} hint={GHAT_DOMAINS[0]} />
          <Metric label="Mailboxes registered" value={`${mailboxes.length} / ${GHAT_TARGET_MAILBOXES}`} />
          <Metric label="Send / receive OK" value={`${smtpOk} / ${imapOk}`} />
          <Metric label="Connected to Smartlead" value={smartleadConnected} />
          <Metric label="Warm-up running" value={warmupStarted} hint="warming is not campaign-ready" />
          <Metric label="Warming state" value={warming} />
          <Metric label="Campaign ready" value={campaignReady} hint="requires send, receive, Smartlead and completed warm-up" />
          <Metric label="Live outreach campaigns" value={campaignCount} hint="GHAT sending remains closed" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Provider controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Winnr: {winnr ? String(winnr.connection_state ?? winnr.mode ?? "checked") : "not checked"}</Badge>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-winnr-sync", "Winnr test", { action: "test", estate: GHAT_ESTATE_KEY }, setWinnr)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Test
              </Button>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-winnr-sync", "Winnr preview", { action: "sync", apply: false, estate: GHAT_ESTATE_KEY }, setWinnr)}>
                Preview sync
              </Button>
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => confirmed("Apply the GHAT Winnr estate into Liftor? Only non-secret domain and mailbox metadata is written and no email is sent.") && call("gsm-winnr-sync", "GHAT registry sync", { action: "sync", apply: true, estate: GHAT_ESTATE_KEY, external_action_confirmation: "SYNC GSM WINNR REGISTRY" }, setWinnr)}
              >
                Apply sync
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null || mailboxes.length === 0}
                onClick={() => confirmed("Start Winnr warm-up for the GHAT mailboxes at 15/day with a slow ramp? This is warm-up traffic, not campaign sending.") && call("gsm-winnr-sync", "Start GHAT warm-up", { action: "warmup", estate: GHAT_ESTATE_KEY, external_action_confirmation: "START GSM WINNR WARMUP" }, setWinnr)}
              >
                <Flame className="mr-2 h-4 w-4" /> Start warm-up
              </Button>
            </div>
            <Result title="Winnr result" value={winnr} />

            <div className="border-t pt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={smartleadConnected === mailboxes.length && mailboxes.length > 0 ? "default" : "secondary"}>
                  Smartlead: {smartleadConnected}/{mailboxes.length} connected
                </Badge>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("ghat-smartlead-onboard", "Smartlead preview", { apply: false }, setSmartlead)}>
                  Preview connection
                </Button>
                <Button
                  size="sm"
                  disabled={busy !== null || mailboxes.length === 0}
                  onClick={() => confirmed("Connect the GHAT mailboxes to Smartlead as sending accounts? No campaign is created, no lead is pushed and no email is sent.") && call("ghat-smartlead-onboard", "Connect to Smartlead", { apply: true, external_action_confirmation: "CONNECT GHAT MAILBOXES TO SMARTLEAD" }, setSmartlead)}
                >
                  Connect mailboxes
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => call("gsm-smartlead-mailbox-sync", "Smartlead status refresh", { apply: false, estate: GHAT_ESTATE_KEY }, setSmartlead)}>
                  Refresh status
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Mailbox credentials are read server-side for the single provider handover and are never stored, shown or logged.
              </div>
              <Result title="Smartlead result" value={smartlead} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mailbox className="h-4 w-4" /> Expected identities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Identity</th>
                    <th>Address</th>
                    <th>Registered</th>
                    <th>Send</th>
                    <th>Receive</th>
                    <th>Smartlead</th>
                    <th>Warm-up</th>
                    <th>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {GHAT_EXPECTED_MAILBOXES.map((expected) => {
                    const email = `${expected.local_part}@${GHAT_DOMAINS[0]}`;
                    const m = byEmail.get(email);
                    const r = m ? readiness.find((x) => x.mailbox.id === m.id)?.result : null;
                    return (
                      <tr key={email} className="border-t border-border/50">
                        <td className="py-2 pr-3">{expected.label}</td>
                        <td className="pr-3 text-muted-foreground">{email}</td>
                        <td>{m ? "yes" : "no"}</td>
                        <td>{ok(m?.smtp_status) ? "ok" : String(m?.smtp_status ?? "-")}</td>
                        <td>{ok(m?.imap_status) ? "ok" : String(m?.imap_status ?? "-")}</td>
                        <td>{m?.smartlead_email_account_id ? "connected" : "-"}</td>
                        <td>{String(m?.warmup_status ?? "-")}</td>
                        <td>{r ? r.readiness_state : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Segregation guarantees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>GHAT mailboxes are excluded from the GSM shared commercial estate, its 50-mailbox target, and the Launch and Evergreen lanes.</p>
            <p>Warm-up traffic is not outreach. No mailbox becomes campaign-ready until send, receive, Smartlead connection, completed warm-up and health thresholds all pass.</p>
            <p>No outreach campaign, lead push or live send is configured for this estate.</p>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}
