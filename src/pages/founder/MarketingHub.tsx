import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import MarketingContentFunnelPanel from "@/components/founder/marketing/MarketingContentFunnelPanel";
import CompetitorLearningPositioningPanel from "@/components/founder/strategy/CompetitorLearningPositioningPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// In-hub sub-navigation. All targets are existing founder-only routes —
// nothing is created here. Posting / publishing / external sharing stay
// off; the marketing surfaces remain draft / manual-export only.
const MARKETING_HUB_TABS: { label: string; to: string; description: string }[] = [
  { label: "Marketing Overview",    to: "/founder/marketing",             description: "Content funnel, briefs and competitor learning — drafts only." },
  { label: "Social",                to: "/founder/social",                description: "Social brain: planning, posts and assets (no publishing)." },
  { label: "Social Autopilot",      to: "/founder/social-autopilot",      description: "Planning, calendar and queue — publishing stays paused." },
  { label: "Campaign Factory",      to: "/founder/campaign-factory",      description: "Internal campaign briefs and assemblies." },
  { label: "Assets",                to: "/founder/assets",                description: "Creative assets hub — drafts and approved versions." },
  { label: "Global PR Radar",       to: "/founder/global-pr-radar",       description: "PR signals and watchlist — internal only." },
  { label: "Channel Strategy",      to: "/founder/channel-strategy",      description: "Channel plan, business mix and recommendations." },
  { label: "Analytics Attribution", to: "/founder/analytics-attribution", description: "Sources, campaigns, revenue and funnel attribution." },
];

export default function MarketingHub() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Marketing Hub</h1>
            <p className="text-sm text-muted-foreground">
              Blogs, newsletters, landing pages, lead magnets and campaign briefs — internal drafts only.
            </p>
          </div>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            Draft / manual-export only — no publishing
          </Badge>
        </div>

        <Card className="tech-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Marketing Hub · sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {MARKETING_HUB_TABS.map((t) => {
                const isActive = t.to === "/founder/marketing";
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={`block rounded-md border px-3 py-2 text-xs transition ${
                      isActive
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 hover:border-primary/40 hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug">{t.description}</p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <MarketingContentFunnelPanel />
        <CompetitorLearningPositioningPanel />
      </div>
    </FounderLayout>
  );
}