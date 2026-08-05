import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import MarketingContentFunnelPanel from "@/components/founder/marketing/MarketingContentFunnelPanel";
import CompetitorLearningPositioningPanel from "@/components/founder/strategy/CompetitorLearningPositioningPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { fetchReleasesAwaitingCommsReview, type AwaitingCommsReview } from "@/lib/lifecycleHandoffs";
import { Megaphone } from "lucide-react";

// In-hub sub-navigation. All targets are existing founder-only routes —
// nothing is created here. Posting / publishing / external sharing stay
// off; the marketing surfaces remain draft / manual-export only.
const MARKETING_HUB_TABS: { label: string; to: string; description: string }[] = [
  { label: "Marketing Overview",    to: "/founder/marketing",             description: "Content funnel, briefs and competitor learning — drafts only." },
  { label: "Social",                to: "/founder/social",                description: "Social brain: planning, posts and assets (no publishing)." },
  { label: "Social Autopilot",      to: "/founder/social-autopilot",      description: "Planning, calendar and queue — publishing stays paused." },
  { label: "Social Relationships",  to: "/founder/social-relationships",  description: "Networking, conversations and relationship building — founder-gated." },
  { label: "Campaign Factory",      to: "/founder/campaign-factory",      description: "Internal campaign briefs and assemblies." },
  { label: "Assets",                to: "/founder/assets",                description: "Creative assets hub — drafts and approved versions." },
  { label: "Global PR Radar",       to: "/founder/global-pr-radar",       description: "PR signals and watchlist — internal only." },
  { label: "Channel Strategy",      to: "/founder/channel-strategy",      description: "Channel plan, business mix and recommendations." },
  { label: "Analytics Attribution", to: "/founder/analytics-attribution", description: "Sources, campaigns, revenue and funnel attribution." },
];

export default function MarketingHub() {
  const [pendingComms, setPendingComms] = useState<AwaitingCommsReview[]>([]);
  useEffect(() => { fetchReleasesAwaitingCommsReview().then(setPendingComms).catch(() => setPendingComms([])); }, []);

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

        {/* Release Workflow → Marketing handoff: read-only list of release
            customer-comms drafts that have been flagged for founder review.
            No sending. Link goes back to Release Workflow. */}
        <Card className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Release comms awaiting founder review ({pendingComms.length})
              <Badge variant="outline" className="ml-2 text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
                Internal review only — no send
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingComms.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No release comms drafts are awaiting review. New ones appear here when an engineer flags a
                Release Workflow item with "Comms ready for review".
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingComms.map((r) => (
                  <li key={r.id} className="border border-border/50 rounded p-2 text-xs space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.release_title}</span>
                      <Badge variant="outline" className="text-[10px]">{r.release_type}</Badge>
                      <span className="text-muted-foreground ml-auto">
                        {new Date(r.updated_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {r.customer_comms_draft}
                    </p>
                    <Link to="/founder/release-workflow" className="text-primary hover:underline">
                      Open in Release Workflow →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <MarketingContentFunnelPanel />
        <CompetitorLearningPositioningPanel />
      </div>
    </FounderLayout>
  );
}