import FounderLayout from "@/components/founder/FounderLayout";
import SocialMediaBrainPanel from "@/components/founder/social/SocialMediaBrainPanel";

const SocialBrain = () => {
  return (
    <FounderLayout title="Social Media Brain" description="Per-business social readiness, agents and content operations. Internal drafts only — no external posts, DMs or provider mutation.">
      <div className="space-y-6">
        <SocialMediaBrainPanel />
      </div>
    </FounderLayout>
  );
};

export default SocialBrain;