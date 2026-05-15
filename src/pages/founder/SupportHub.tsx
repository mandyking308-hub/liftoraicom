import FounderLayout from "@/components/founder/FounderLayout";
import SupportKnowledgeAgentPanel from "@/components/founder/support/SupportKnowledgeAgentPanel";

export default function SupportHub() {
  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Support Hub</h1>
          <p className="text-sm text-muted-foreground">FAQs, help articles, support drafts, triage and escalation — internal only, no external send.</p>
        </div>
        <SupportKnowledgeAgentPanel />
      </div>
    </FounderLayout>
  );
}