import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STEPS: { n: number; title: string; to?: string; note: string }[] = [
  { n: 1, title: "Open Command Centre", to: "/founder/command-centre", note: "Confirm safety gates, alerts and what needs attention today." },
  { n: 2, title: "Check safety gates", to: "/founder/runtime-mode", note: "Confirm runtime mode is Simulation/Founder-only. No external sending." },
  { n: 3, title: "Add or select a business", to: "/founder/business-activation", note: "Pick an existing draft business or create a new shell." },
  { n: 4, title: "Run the first-run setup wizard", to: "/founder/start-here/setup-business", note: "Capture basics, evidence and run a dry-run readiness check." },
  { n: 5, title: "Review missing context", to: "/founder/business-onboarding-factory", note: "See knowledge gaps, risks and what would be created." },
  { n: 6, title: "Generate / confirm starter pack", to: "/founder/starter-pack-materialiser", note: "Materialise drafts internally. Nothing is sent." },
  { n: 7, title: "Check launch readiness", to: "/founder/monday-readiness", note: "15-point internal readiness check before anything goes live." },
  { n: 8, title: "Check operating loops", to: "/founder/command-centre", note: "Statutory, corporate-secretarial, FX, releases, insurance, expansion." },
  { n: 9, title: "Check evidence / data room", to: "/founder/data-room", note: "Data room stays closed by default. Founder-only review." },
  { n: 10, title: "Check buyer warm-up / 12-month sale review", to: "/founder/founder-led-buyer-market", note: "Quiet tracking only. No external outreach." },
];

const QUICK_LINKS: { label: string; to: string }[] = [
  { label: "Founder User Guide", to: "/founder/user-guide" },
  { label: "AI Co-Pilot", to: "/founder/copilot" },
  { label: "Business Onboarding Factory", to: "/founder/business-onboarding-factory" },
  { label: "Setup a Business (Wizard)", to: "/founder/start-here/setup-business" },
];

export default function StartHere() {
  return (
    <FounderLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Start Here</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Good morning. This is your guided 10-step start. Nothing here sends external
            messages, activates providers or exposes anything publicly. Everything is
            founder-only.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <Button key={l.to} asChild variant="outline" size="sm">
                <Link to={l.to}>{l.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <CardContent className="py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                  {s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.note}</div>
                </div>
                {s.to && (
                  <Button asChild size="sm" variant="secondary">
                    <Link to={s.to}>Open</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-amber-500/40">
          <CardHeader><CardTitle className="text-amber-500">Safety reminders</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <div>• Healthcare overlay remains NOT LIVE / BLOCKED.</div>
            <div>• Data room is closed by default — no external tokens issued.</div>
            <div>• Buyer warm-up is quiet tracking only — no outbound contact.</div>
            <div>• No emails, social posts, provider calls or cron jobs run from this screen.</div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}