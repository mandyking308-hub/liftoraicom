import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";

const STEPS: Array<{ n: number; label: string; to?: string; note?: string }> = [
  { n: 1, label: "Start here — Command Centre", to: "/founder/command-centre" },
  { n: 2, label: "Review Today's Founder Cockpit (top of this page)" },
  { n: 3, label: "Open First-Use Configuration (whole-Liftor checklist)", to: "/founder/first-use-configuration" },
  { n: 4, label: "Open Founder Action Board", to: "/founder/ai-cost/action-board" },
  { n: 5, label: "Clear the Human Approval Queue", to: "/founder/ai-cost/approvals" },
  { n: 6, label: "Check Live Alerts", to: "/founder/ai-cost/alerts" },
  { n: 7, label: "Check AI Gateway / Runtime Health", to: "/founder/ai-cost/runtime" },
  { n: 8, label: "Review AI spend (today + month)", to: "/founder/ai-cost/ledger" },
  { n: 9, label: "Ask Liftor Brain / Founder Copilot one internal question", to: "/founder/brain" },
  { n: 10, label: "Never approve an external action unless ready — sends/posts/contacts/spend are gated" },
];

export default function StartUsingLiftorNote() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <Card className="tech-card border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Start using Liftor
            <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              Live Operating Mode
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Plain-English daily flow. Liftor runs live — internal preparation, logging, dashboards, ROI and alerts run
            without approval. External actions (email, post, contact, spend, legal/financial wording) always wait for
            your decision.
          </p>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-2">
                <span className="text-[11px] font-mono text-muted-foreground w-5 mt-[2px]">{String(s.n).padStart(2, "0")}</span>
                {s.to ? (
                  <Link to={s.to} className="inline-flex items-center gap-1 hover:text-primary">
                    {s.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-foreground">{s.label}</span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}