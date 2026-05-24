import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import LiftorBuildPhaseCloseoutPanel from "@/components/founder/activation/LiftorBuildPhaseCloseoutPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

const HANDOVER_TEXT = `LIFTOR FINAL BUILD HANDOVER — 21A–22J CLOSEOUT

1. What Liftor is
Liftor is the internal AI operating system that runs the founder's day
and powers multiple businesses through a single Command Centre.

2. Current classification
LIFTOR_INTERNAL_OPERATING_SYSTEM_READY — external go-live LOCKED_BY_DESIGN.

3. Safety rules
No emails, DMs, posts, scheduled social, Apollo calls/credits, Smartlead
POST/leads/campaigns, Metricool/ManyChat/ad/payment mutations, portal
invites/accounts, surveys/reports, auto_send, cron, or external gate enables.
OpenAI server-side only via the Brain, internal only.

4. What has been built
- 21A–21K: Liftor Brain / Mandy Co-Pilot (foundation, provider, tool router,
  context builder, chat, inbound reply, full acceptance, final go-to-use).
- 22A: Business Onboarding Brain.
- 22B: Starter Pack Materialiser.
- 22C: Business Onboarding Factory.
- 22D: Business Internal Activation / operating runbooks / daily actions.
- 22E: Business Daily Operating Loop / internal agent runner.
- 22F: Business Weekly Review / Learning Loop.
- 22G: Controlled External Activation Readiness.
- 22H: Controlled Micro-Batch Preparation / Founder Approval Packet.
- 22I: Liftor Master Regression / no-lost-functionality / self-fix loop.
- 22J: Final handover / Athens pause / return-to-execution pack (this).

5. Command Centre structure
Daily View / Weekly View / All Modules with founder cards for Brain,
Business Factory, Activation, Daily/Weekly Loop, External Readiness,
Micro-Batch Preparation, Final Handover, Manual.

6. Brain / Mandy Co-Pilot
Operational internally. Provider constitution, tool router, context builder,
chat, inbound reply, full acceptance all PASS.

7. Business Onboarding Factory
Brain → Starter Pack → Factory → Internal Activation chain operational
with strict internal-only output.

8. Daily / Weekly Operating Loop
Daily operating runs and weekly review/learning loop available per business.

9. External Readiness / Micro-Batch Preparation
Readiness scoring and approval-packet preparation in place. Execution gates
hard-locked: external_activation_allowed=false, execution_allowed=false.

10. NeonCandy snapshot
Internal-only. Smartlead/Apollo/Metricool/ManyChat/payment all gated and
locked. No external action taken in the build phase.

11. Multi-business snapshot
External activation allowed count must remain 0. New businesses go through
the factory before any external steps.

12. What remains locked
All external sends, publishing/scheduling, Apollo, Smartlead POST/campaign
start, Metricool/ManyChat mutations, payments/subscriptions, portal invites,
surveys/reports, auto_send/cron, execution of prepared packets.

13. What not to revisit unless explicitly asked
Brain foundation, tool router, provider constitution, onboarding factory,
daily/weekly loops, readiness scoring, micro-batch preparation, RLS model.

14. Next execution phase after Athens
Phase 23 — execution, not more infrastructure. NeonCandy first.

15. First prompt to run on return
23A — NeonCandy Return-to-Execution Readiness.
`;

const FOUNDER_SUMMARY = `What we achieved
Liftor's internal brain and the multi-business operating factory are built
and verified. Everything Mandy needs to onboard and run businesses
internally is in place.

What it can do now
Onboard businesses, build starter packs, materialise drafts, activate
internally, run daily and weekly loops, score external readiness, and
prepare micro-batch approval packets — all without sending anything.

What it cannot do yet
Send emails or DMs, publish or schedule posts, spend Apollo credits,
start Smartlead campaigns, push leads, charge customers, invite portal
users, send surveys, or run cron / autopilot. All external gates are
locked by design.

What happens after Athens
Start with NeonCandy. Run 23A readiness, then 23B Smartlead setup
(no send), then 23C first micro-batch approval packet, then a single
tiny 23D controlled send, then 23E reply capture, then 23F commercial
handoff, then 23G second business.

What to avoid touching while away
Do not enable gates, do not change auto_send or cron, do not start
Smartlead campaigns, do not spend Apollo credits, do not approve or
execute packets. Viewing the Command Centre and reading manuals is safe.
`;

export default function BuildPhaseCloseout() {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("liftor_build_phase_closeout_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecords(data ?? []);
    })();
  }, []);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Build Phase Closeout</h1>
            <p className="text-muted-foreground">
              Final handover — Prompts 21A–22J
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> External LOCKED_BY_DESIGN
          </Badge>
        </div>

        <LiftorBuildPhaseCloseoutPanel />

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>New-chat handover</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono bg-muted/20 p-4 rounded-md border border-border/60">
{HANDOVER_TEXT}
            </pre>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Founder plain-English summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
{FOUNDER_SUMMARY}
            </pre>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Recent closeout records</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 border border-border/60 rounded-md text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{r.classification}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {r.closeout_status} · Next: {r.next_phase}
                    </div>
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