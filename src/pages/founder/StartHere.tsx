import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PRIMARY: { label: string; to: string; description: string }[] = [
  { label: "Wire in existing business", to: "/founder/business-setup-tunnel?mode=existing", description: "NeonCandy or any business already partly inside Liftor." },
  { label: "Create new business", to: "/founder/business-setup-tunnel?mode=new", description: "Start a fresh draft, e.g. a new marketing business." },
  { label: "Continue setup already in progress", to: "/founder/business-setup-tunnel?mode=continue", description: "Pick up where you left off." },
  { label: "Open daily operating mode", to: "/founder/daily-operator", description: "Today's priorities, blockers and tasks per business." },
  { label: "Ask Liftor what to do next", to: "/founder/copilot", description: "Plain-English questions to your founder co-pilot." },
];

const STEPS: { n: number; title: string; to?: string; note: string }[] = [
  { n: 1, title: "Open Command Centre", to: "/founder/command-centre", note: "Confirm safety gates, alerts and today's attention." },
  { n: 2, title: "Check safety gates", to: "/founder/runtime-mode", note: "Confirm Simulation / founder-only. No external sending." },
  { n: 3, title: "Add or select a business", to: "/founder/business-setup-tunnel?mode=existing", note: "Pick existing (e.g. NeonCandy) or create new draft." },
  { n: 4, title: "Run the setup tunnel", to: "/founder/business-setup-tunnel", note: "12 guided steps. Saves as draft." },
  { n: 5, title: "Review missing context", to: "/founder/business-onboarding-factory", note: "Knowledge gaps, risks, what would be created." },
  { n: 6, title: "Generate / confirm starter pack", to: "/founder/starter-pack-materialiser", note: "Materialise drafts internally." },
  { n: 7, title: "Check launch readiness", to: "/founder/monday-readiness", note: "15-point internal readiness." },
  { n: 8, title: "Check operating loops", to: "/founder/release-workflow", note: "Statutory, corp-sec, FX, releases, insurance, expansion." },
  { n: 9, title: "Check evidence / data room", to: "/founder/data-room", note: "Data room stays closed by default." },
  { n: 10, title: "Daily operator + sale review", to: "/founder/daily-operator", note: "Run the daily loop; buyer warm-up stays quiet." },
];

export default function StartHere() {
  return (
    <FounderLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Start Here</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Start here. Liftor will guide you through setting up or wiring in a business step by step. Everything stays founder-only — no external sending, no provider activation, no public exposure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRIMARY.map((p) => (
            <Card key={p.to} className="border-primary/40">
              <CardContent className="py-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                </div>
                <Button asChild size="sm"><Link to={p.to}>Open</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Guided 10-step morning path</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-start gap-3 border-b border-border/40 pb-2 last:border-b-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">{s.n}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.note}</div>
                </div>
                {s.to && <Button asChild size="sm" variant="ghost"><Link to={s.to}>Open</Link></Button>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-500/40">
          <CardHeader><CardTitle className="text-amber-500">Safety reminders</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <div>• Healthcare overlay remains NOT LIVE / BLOCKED.</div>
            <div>• Data room stays closed by default.</div>
            <div>• Buyer warm-up is quiet tracking only.</div>
            <div>• No emails, social posts, provider calls or cron run from this screen.</div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}