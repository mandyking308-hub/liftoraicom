import FounderLayout from "@/components/founder/FounderLayout";
import MarketingContentFunnelPanel from "@/components/founder/marketing/MarketingContentFunnelPanel";

export default function MarketingHub() {
  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Marketing Hub</h1>
          <p className="text-sm text-muted-foreground">Blogs, newsletters, landing pages, lead magnets and campaign briefs — internal drafts only.</p>
        </div>
        <MarketingContentFunnelPanel />
      </div>
    </FounderLayout>
  );
}