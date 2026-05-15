import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  Lock,
  RefreshCcw,
  XCircle,
} from "lucide-react";

type StepStatus = "complete" | "blocked" | "unknown" | "not_ready" | "disabled";

type Step = {
  n: number;
  title: string;
  status: StepStatus;
  current?: string;
  reason?: string;
  action?: string;
};

const statusMeta: Record<StepStatus, { label: string; cls: string; Icon: any }> = {
  complete: {
    label: "complete",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    Icon: CheckCircle2,
  },
  blocked: {
    label: "blocked / missing",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    Icon: XCircle,
  },
  unknown: {
    label: "unknown",
    cls: "border-border/60 bg-muted/30 text-muted-foreground",
    Icon: CircleDashed,
  },
  not_ready: {
    label: "not ready",
    cls: "border-border/60 bg-muted/30 text-muted-foreground",
    Icon: CircleDashed,
  },
  disabled: {
    label: "no",
    cls: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    Icon: Lock,
  },
};

function StepRow({ step }: { step: Step }) {
  const meta = statusMeta[step.status];
  const Icon = meta.Icon;
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
            {String(step.n).padStart(2, "0")}
          </span>
          <span className="text-sm font-medium text-foreground">{step.title}</span>
        </div>
        <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>
          <Icon className="mr-1 h-3 w-3" />
          {meta.label}
        </Badge>
      </div>
      {step.current && (
        <div className="text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/70">Current:</span>{" "}
          <span className="font-mono text-foreground/80">{step.current}</span>
        </div>
      )}
      {step.reason && (
        <div className="text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/70">Reason:</span> {step.reason}
        </div>
      )}
      {step.action && (
        <div className="text-[11px] text-amber-200/90">
          <span className="text-amber-300">Founder action:</span> {step.action}
        </div>
      )}
    </div>
  );
}

export default function SmartleadScaleSetupChecklist() {
  const [readiness, setReadiness] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const loadReadiness = async () => {
    const { data } = await supabase.functions.invoke("provider-readiness-check", { body: {} });
    setReadiness(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReadiness();
    // Auto-run readiness test once on mount so the checklist reflects live
    // Smartlead state (mailbox count, campaign count, warmup) instead of
    // showing "unknown" until the founder clicks Re-run.
    rerunTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rerunTest = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("smartlead-test-connection", {
      body: {},
    });
    setTesting(false);
    if (error) {
      toast({
        title: "Smartlead readiness test failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setTest(data);
    toast({
      title: data?.ok ? "Readiness test complete" : "Readiness test result",
      description: data?.ok
        ? `Connected · ${data.email_account_count ?? 0} mailboxes · ${data.campaign_count ?? 0} campaigns`
        : data?.reason ?? data?.error ?? "See checklist.",
    });
    loadReadiness();
  };

  const sl = readiness?.smartlead_provider;
  const credentialsPresent = !!(test?.credentials_present ?? sl?.credentials_present);
  const emailAccountCount: number | null =
    test?.email_account_count ?? null;
  const campaignCount: number | null = test?.campaign_count ?? null;
  const sendingAccountsPresent =
    test?.sending_accounts_present ?? (emailAccountCount != null ? emailAccountCount > 0 : null);
  const warmupAccountCount: number | null = test?.warmup_account_count ?? null;
  const webhooks404 = test?.http_status?.webhooks === 404;
  const analytics404 = test?.http_status?.analytics_overview === 404;

  const mailboxStatus: StepStatus =
    sendingAccountsPresent === true
      ? "complete"
      : sendingAccountsPresent === false
        ? "blocked"
        : "unknown";

  const campaignStatus: StepStatus =
    campaignCount == null ? "unknown" : campaignCount > 0 ? "complete" : "blocked";

  const warmupStatus: StepStatus =
    sendingAccountsPresent === true
      ? warmupAccountCount === 0
        ? "blocked"
        : warmupAccountCount && warmupAccountCount > 0
          ? "complete"
          : "unknown"
      : "unknown";

  const sequenceStatus: StepStatus =
    campaignStatus === "complete" ? "unknown" : "not_ready";

  const leadPushStatus: StepStatus =
    campaignStatus === "complete" ? "unknown" : "not_ready";

  const webhookStatus: StepStatus =
    campaignStatus === "complete" ? "unknown" : "not_ready";

  const analyticsStatus: StepStatus =
    campaignStatus === "complete" ? "unknown" : "not_ready";

  const steps: Step[] = [
    {
      n: 1,
      title: "API key connected",
      status: credentialsPresent ? "complete" : "blocked",
      current: credentialsPresent
        ? "SMARTLEAD_API_KEY present (server-side)"
        : "SMARTLEAD_API_KEY missing",
      action: credentialsPresent
        ? undefined
        : "Add SMARTLEAD_API_KEY in secrets, then rerun the readiness test.",
    },
    {
      n: 2,
      title: "Sending mailbox connected",
      status: mailboxStatus,
      current:
        emailAccountCount == null
          ? "Run readiness test to fetch"
          : `email_account_count = ${emailAccountCount}`,
      action:
        mailboxStatus === "complete"
          ? undefined
          : "Connect at least one sending email account inside Smartlead (Smartlead → Email Accounts → Add).",
    },
    {
      n: 3,
      title: "Warmup configured",
      status: warmupStatus,
      reason:
        warmupStatus === "complete"
          ? `Warmup detected on ${warmupAccountCount} mailbox(es).`
          : warmupStatus === "blocked"
            ? "warmup_account_count = 0 — enable warmup in Smartlead per mailbox."
            : sendingAccountsPresent === true
              ? "Mailbox exists — verify warmup is enabled in Smartlead per mailbox."
              : "Unknown until at least one email account exists.",
      action:
        sendingAccountsPresent === true
          ? "Enable / confirm warmup in Smartlead for each connected mailbox."
          : undefined,
    },
    {
      n: 4,
      title: "Campaign created",
      status: campaignStatus,
      current:
        campaignCount == null
          ? "Run readiness test to fetch"
          : `campaign_count = ${campaignCount}`,
      action:
        campaignStatus === "complete"
          ? undefined
          : "Create a draft campaign in Smartlead, or later allow Liftor to create one in a controlled setup task.",
    },
    {
      n: 5,
      title: "Campaign sequence mapped",
      status: sequenceStatus,
      reason:
        campaignStatus === "complete"
          ? "Campaign exists — sequence mapping not yet implemented."
          : "No Smartlead campaign exists yet.",
    },
    {
      n: 6,
      title: "Lead push preview ready",
      status: leadPushStatus,
      reason:
        campaignStatus === "complete"
          ? "Campaign exists — lead push preview not yet implemented."
          : "No campaign exists yet.",
    },
    {
      n: 7,
      title: "Webhook configured",
      status: webhookStatus,
      reason:
        campaignStatus === "complete"
          ? "Campaign exists — retry webhook discovery on the per-campaign path."
          : webhooks404
            ? "No campaign/webhook path confirmed yet. Global /webhooks returned 404 on this tenant; retry webhook discovery once a campaign exists (non-blocking until then)."
            : "No campaign/webhook path confirmed yet.",
    },
    {
      n: 8,
      title: "Analytics available",
      status: analyticsStatus,
      reason: analytics404
        ? "Global /analytics/overview returned 404 on this tenant — non-blocking until a campaign exists; use campaign-level analytics once a campaign exists."
        : "No campaign exists yet — use campaign-level analytics once one is created.",
    },
    {
      n: 9,
      title: "Scale sending enabled",
      status: "disabled",
      reason:
        "Disabled until mailbox, campaign, lead push preview, webhook and batch preview are complete.",
    },
  ];

  const headlineBlocked =
    !credentialsPresent ||
    mailboxStatus !== "complete" ||
    campaignStatus !== "complete";

  return (
    <Card
      id="smartlead-scale-setup-checklist"
      data-testid="smartlead-scale-setup-checklist"
      className="p-5 space-y-4 border-2 border-border/60 scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Scale Setup Checklist</h3>
          <Badge variant="outline" className="text-[10px]">
            read-only
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={rerunTest}
          disabled={testing || loading}
          data-testid="smartlead-rerun-readiness-btn"
        >
          <RefreshCcw className={`h-3 w-3 mr-1 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Re-running…" : "Re-run Smartlead Readiness Test"}
        </Button>
      </div>

      <div
        className={`rounded-md border p-3 ${
          headlineBlocked
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-emerald-500/40 bg-emerald-500/5"
        }`}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={`h-4 w-4 mt-0.5 ${
              headlineBlocked ? "text-amber-400" : "text-emerald-400"
            }`}
          />
          <div>
            <div
              className={`text-sm font-semibold ${
                headlineBlocked ? "text-amber-200" : "text-emerald-200"
              }`}
            >
              {headlineBlocked
                ? "SMARTLEAD CONNECTED BUT NOT READY TO SEND"
                : "SMARTLEAD CONNECTED — CORE PREREQUISITES MET"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {headlineBlocked
                ? "Reason: No sending mailbox and no campaign exist in Smartlead yet."
                : "Mailbox and campaign exist. Continue with sequence mapping, lead push preview and webhook setup."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((s) => (
          <StepRow key={s.n} step={s} />
        ))}
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="text-xs font-semibold text-primary mb-1">Next founder action</div>
        <p className="text-[11px] text-foreground/90">
          {!credentialsPresent
            ? "Add SMARTLEAD_API_KEY in secrets, then rerun the readiness test."
            : mailboxStatus !== "complete"
              ? "Connect one sending mailbox in Smartlead, then rerun the readiness test."
              : campaignStatus !== "complete"
                ? "Create a draft campaign in Smartlead, then rerun the readiness test."
                : "Proceed to Smartlead Adapter v2: campaign sequence mapping + lead push preview (no sends)."}
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">
          This task does not create the mailbox, campaign, leads or webhooks from Liftor and
          does not send any email. Read-only Smartlead endpoints only.
        </p>
      </div>
    </Card>
  );
}