import FounderLayout from "@/components/founder/FounderLayout";
import { SupportKnowledgeDashboard } from "@/components/founder/support/SupportKnowledgePanels";

export default function SupportKnowledgeAgent() {
  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Support Knowledge Agent</h1>
          <p className="text-sm text-muted-foreground">Per-business support knowledge base, FAQs, triage, reply drafts and escalations — internal only.</p>
        </div>
        <SupportKnowledgeDashboard />
      </div>
    </FounderLayout>
  );
}