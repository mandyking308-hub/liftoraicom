import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const SECTIONS: { title: string; body: string[] }[] = [
  { title: "What Liftor is", body: [
    "Liftor is your private founder operating system. It is a place to design, dry-run, monitor and decide on businesses you run, without exposing anything externally until you say so.",
  ]},
  { title: "What Liftor is not", body: [
    "Not a public marketing tool. Not a sending platform that fires emails or social posts on its own. Not an M&A firm. Not a legal/tax/clinical decision engine.",
  ]},
  { title: "What to open first each morning", body: [
    "Start at /founder/start-here. Then Command Centre. Then check safety gates and what needs attention today.",
  ]},
  { title: "How to add a business", body: [
    "Use the Setup Business wizard at /founder/start-here/setup-business. It always saves as draft / not live.",
  ]},
  { title: "How to run the setup wizard", body: [
    "Six steps: shell → basics → evidence → dry-run readiness → confirm & save → next steps. Confirmation requires typing FOUNDER APPROVED.",
  ]},
  { title: "How to use Command Centre", body: [
    "Command Centre shows alerts, cost governor, attention items, lifecycle, agents and operating loops. Read first, click into anything that's amber/red.",
  ]},
  { title: "How to use the lifecycle sidebar", body: [
    "Each business has a lifecycle stage. The sidebar shows where it is and what's blocking it moving forward.",
  ]},
  { title: "How to check safety gates", body: [
    "/founder/runtime-mode shows current mode. /founder/approvals-ops shows what needs founder approval. External providers stay off until you switch them on.",
  ]},
  { title: "How to use Finance Hub", body: [
    "Finance lives under the Command Centre cluster — Revenue Autopilot, Quote-to-Cash, treasury, cashflow forecasts. All review-first.",
  ]},
  { title: "How to use Marketing Hub", body: [
    "Campaign Factory, social autopilot (drafts only), longform content, conversion assets. Nothing sends without founder approval.",
  ]},
  { title: "How to use Healthcare Overlay safely", body: [
    "Healthcare overlay is NOT LIVE / BLOCKED by default. Use it only for internal readiness review. Never flip it live without clinical + insurance sign-off.",
  ]},
  { title: "How to use the Data Room safely", body: [
    "Data Room is closed by default. No external access tokens are issued. Use it to review what *would* be shared in a future raise/sale.",
  ]},
  { title: "How to use Buyer Warm-Up", body: [
    "Buyer warm-up is quiet tracking — buyer universe, competitor map, customer segments, warm-up actions. Outbound contact is hard-blocked until you explicitly approve.",
  ]},
  { title: "How to ask the AI Co-Pilot questions", body: [
    "Open /founder/copilot. Ask plain questions: 'What should I do first?', 'Which business needs setup?', 'Is anything external live?'.",
  ]},
  { title: "What not to switch on without a founder decision", body: [
    "External email/SMS/social sending. Customer/investor/adviser/buyer portals. Healthcare go-live. Provider activations. Cron jobs. Public exposure of any founder route.",
  ]},
  { title: "First 10 clicks for tomorrow", body: [
    "1. /founder/start-here", "2. /founder/command-centre", "3. /founder/runtime-mode",
    "4. /founder/business-activation", "5. /founder/start-here/setup-business",
    "6. /founder/business-onboarding-factory", "7. /founder/starter-pack-materialiser",
    "8. /founder/monday-readiness", "9. /founder/data-room",
    "10. /founder/founder-led-buyer-market",
  ]},
  { title: "Daily 15-minute founder routine", body: [
    "Open Start Here → Command Centre attention panel → Approvals Ops → one business' lifecycle → one Co-Pilot question.",
  ]},
  { title: "Weekly review routine", body: [
    "Business Weekly Review per business. Portfolio priority scores. Funding shortlist. Buyer warm-up review.",
  ]},
  { title: "What to do if something looks wrong", body: [
    "Stop. Open /founder/runtime-mode (confirm Simulation). Open /founder/recovery (snapshot). Ask Co-Pilot 'what is blocked right now?'. Do not flip anything live.",
  ]},
];

export default function FounderUserGuide() {
  return (
    <FounderLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Mandy's Founder User Guide</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Plain-English operating guide. Founder-only. See also{" "}
            <Link className="underline" to="/founder/start-here">/founder/start-here</Link>{" "}
            and the doc <code>docs/liftor-founder-user-guide.md</code>.
          </p>
        </div>
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardHeader><CardTitle>{s.title}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {s.body.map((p, i) => <p key={i}>{p}</p>)}
            </CardContent>
          </Card>
        ))}
      </div>
    </FounderLayout>
  );
}