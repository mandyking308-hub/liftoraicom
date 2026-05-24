import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Lock, Rocket, ChevronRight } from "lucide-react";

type Phase = {
  id: string;
  title: string;
  description: string;
  primary?: boolean;
  link?: { to: string; label: string };
};

const PHASES: Phase[] = [
  {
    id: "23A",
    title: "23A — NeonCandy Return-to-Execution Readiness",
    description:
      "Refresh Truth Sync, run Final Hardening, confirm Brain/provider, manuals, external gates locked, Smartlead state, Native IONOS parked, business loop state.",
    primary: true,
    link: { to: "/founder/external-activation-readiness", label: "Open readiness" },
  },
  {
    id: "23B",
    title: "23B — NeonCandy Smartlead Setup / No Send",
    description: "Campaign/warmup/mapping/webhook/sequence readiness. No lead push. No send.",
  },
  {
    id: "23C",
    title: "23C — First Micro-Batch Approval Packet",
    description: "Prepare candidates, compliance/footer/unsubscribe evidence, founder review packet. No send.",
    link: { to: "/founder/micro-batch-preparation", label: "Open micro-batch" },
  },
  {
    id: "23D",
    title: "23D — First Controlled Execution",
    description: "Future only. One channel only. Tiny batch. Explicit confirmation phrase. Live monitoring and stop conditions.",
  },
  {
    id: "23E",
    title: "23E — Reply Capture / AI Draft / Founder Approval",
    description: "Capture replies. Brain drafts internal responses. Founder reviews. No auto-send.",
  },
  {
    id: "23F",
    title: "23F — Commercial Handoff / Proposal / Revenue Path",
    description: "Warm replies → proposal/demo/deal drafts. Founder approval before any customer-facing action.",
  },
  {
    id: "23G",
    title: "23G — Add Second Business Through Factory",
    description: "Upload manual/knowledge → run onboarding factory → activate internally → daily/weekly loop.",
    link: { to: "/founder/business-onboarding-factory", label: "Open factory" },
  },
];

export default function Phase23LaunchPathPanel() {
  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Return From Athens — Phase 23 launch path
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Infrastructure complete. Next is execution, not more build. Start with 23A.
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> External LOCKED_BY_DESIGN
            </Badge>
            <Badge variant="secondary" className="text-xs">
              EXECUTION_NOT_INFRASTRUCTURE
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {PHASES.map((p) => (
            <li
              key={p.id}
              className={`p-3 rounded-md border ${
                p.primary
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.title}</span>
                    {p.primary && (
                      <Badge className="text-xs">First action</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.description}
                  </p>
                </div>
                {p.link && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={p.link.to}>
                      {p.link.label}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}