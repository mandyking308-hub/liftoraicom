import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Mail, RefreshCcw, Rocket, ShieldCheck } from "lucide-react";

type Tone = "ok" | "warn" | "blocked" | "muted";
const tone: Record<Tone, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  blocked: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  muted: "border-border/60 bg-muted/30 text-muted-foreground",
};

const Pill = ({ t, children }: { t: Tone; children: React.ReactNode }) => (
  <Badge variant="outline" className={`text-[10px] ${tone[t]}`}>{children}</Badge>
);

export default function OutboundChannelLanesPanel() {
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("smartlead-test-connection", { body: {} });
    setTest(data ?? null);
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const apiOk = !!test?.credentials_present;
  const mailboxes = test?.email_account_count ?? null;
  const mailboxOk = test?.sending_accounts_present ?? (mailboxes != null ? mailboxes > 0 : null);
  const warmup = test?.warmup_account_count ?? 0;
  const campaignCount = test?.campaign_count ?? null;
  const campaignOk = campaignCount != null ? campaignCount > 0 : null;
  const mailboxEmail =
    test?.email_accounts?.[0]?.from_email ??
    test?.first_email_account?.from_email ??
    (mailboxOk ? "connected mailbox confirmed" : null);

  return (
    <Card className="p-5 space-y-4 border-2 border-border/60 scroll-mt-24" id="outbound-channel-lanes">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Outbound Channel Lanes</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* LANE A — Native IONOS */}
        <div className="rounded-md border border-border/60 p-4 space-y-2 bg-background/40">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            <h4 className="text-sm font-semibold">Lane A — Native Liftor / IONOS</h4>
            <Pill t="warn">SAFE_BLOCKED</Pill>
            <Pill t="muted">scale role: no</Pill>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Purpose: proof / low-volume / existing customer / proposal / invoice /
            supplier / founder-approved email.
          </p>
          <div className="grid sm:grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded border border-border/60 p-2">Provider: <span className="font-mono">IONOS</span></div>
            <div className="rounded border border-border/60 p-2">auto_send_enabled: <span className="font-mono">false</span></div>
            <div className="rounded border border-border/60 p-2">cron: <span className="font-mono">disabled</span></div>
            <div className="rounded border border-border/60 p-2">worker: <span className="font-mono">fail-closed</span></div>
          </div>
          <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-200 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5" />
            <span>
              Next action: none unless founder explicitly returns to the native
              IONOS send path. Pooja Manual Send Apply and the 7 review_required
              Step 4 rows remain parked on this lane.
            </span>
          </div>
        </div>

        {/* LANE B — Smartlead Scale */}
        <div className="rounded-md border border-primary/40 p-4 space-y-2 bg-primary/5">
          <div className="flex items-center gap-2 flex-wrap">
            <Mail className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Lane B — Smartlead Scale</h4>
            <Pill t={apiOk ? "ok" : "blocked"}>API: {apiOk ? "connected" : "missing"}</Pill>
            <Pill t={mailboxOk ? "ok" : mailboxOk === false ? "blocked" : "muted"}>
              mailbox: {mailboxOk == null ? "…" : mailboxOk ? "connected" : "missing"}
            </Pill>
            <Pill t="blocked">scale sending: disabled</Pill>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Purpose: cold outreach at scale via Smartlead.
          </p>
          <div className="grid sm:grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              Mailbox: <span className="font-mono">{mailboxEmail ?? "…"}</span>
            </div>
            <div className="rounded border border-border/60 p-2">
              Warmup: <span className="font-mono">{warmup > 0 ? `enabled (${warmup})` : "not enabled / 0"}</span>
            </div>
            <div className="rounded border border-border/60 p-2">
              Campaign: <span className="font-mono">{campaignOk ? `present (${campaignCount})` : "missing"}</span>
            </div>
            <div className="rounded border border-border/60 p-2">Mapping: <span className="font-mono">missing</span></div>
            <div className="rounded border border-border/60 p-2">Lead push: <span className="font-mono">not ready</span></div>
            <div className="rounded border border-border/60 p-2">Webhook: <span className="font-mono">not configured</span></div>
          </div>
          <div className="rounded border border-primary/40 bg-background/40 p-2 text-[11px]">
            <span className="font-medium text-primary">Next action:</span>{" "}
            Create draft Smartlead campaign “NeonCandy - Early Access Collaboration Test”,
            then re-run readiness.
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        SAFE_BLOCKED applies to the native Liftor / IONOS queue lane only.
        Smartlead scale is separately blocked by campaign / mapping / webhook /
        lead-push / scale-enable readiness — not by SAFE_BLOCKED.
      </p>
    </Card>
  );
}
