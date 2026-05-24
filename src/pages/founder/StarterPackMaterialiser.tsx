import FounderLayout from "@/components/founder/FounderLayout";
import StarterPackMaterialiserPanel from "@/components/founder/activation/StarterPackMaterialiserPanel";

export default function StarterPackMaterialiserPage() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Starter Pack Materialiser</h1>
        <p className="text-sm text-muted-foreground">
          Turn a saved business starter pack into internal draft records across outreach,
          social, support, customer success, proposals, demo, revenue and supplier modules.
          Nothing is sent. External actions remain locked.
        </p>
        <StarterPackMaterialiserPanel />
      </div>
    </FounderLayout>
  );
}