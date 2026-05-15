import FounderLayout from "@/components/founder/FounderLayout";
import SocialMediaBrainPanel from "@/components/founder/social/SocialMediaBrainPanel";
import SocialContentFactoryPanel from "@/components/founder/social/SocialContentFactoryPanel";
import SocialRepurposingEnginePanel from "@/components/founder/social/SocialRepurposingEnginePanel";
import SocialSchedulerExportPanel from "@/components/founder/social/SocialSchedulerExportPanel";
import SocialEngagementInboxPanel from "@/components/founder/social/SocialEngagementInboxPanel";
import SocialAnalyticsTrendPanel from "@/components/founder/social/SocialAnalyticsTrendPanel";

const SocialBrain = () => {
  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Social Media Brain</h1>
          <p className="text-sm text-muted-foreground mt-1">Per-business social readiness, agents and content operations. Internal drafts only — no external posts, DMs or provider mutation.</p>
        </div>
        <SocialMediaBrainPanel />
        <SocialContentFactoryPanel />
        <SocialRepurposingEnginePanel />
        <SocialSchedulerExportPanel />
        <SocialEngagementInboxPanel />
        <SocialAnalyticsTrendPanel />
      </div>
    </FounderLayout>
  );
};

export default SocialBrain;