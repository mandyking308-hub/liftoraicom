import FounderLayout from "@/components/founder/FounderLayout";
import BusinessOnboardingFactoryPanel from "@/components/founder/activation/BusinessOnboardingFactoryPanel";

export default function BusinessOnboardingFactoryPage() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Business Onboarding Factory</h1>
        <p className="text-sm text-muted-foreground">
          End-to-end internal readiness drill for any business: knowledge → profile →
          starter pack → materialised drafts → founder review. Nothing is sent.
          External go-live remains locked by design.
        </p>
        <BusinessOnboardingFactoryPanel />
      </div>
    </FounderLayout>
  );
}