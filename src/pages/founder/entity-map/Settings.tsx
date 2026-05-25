import { EMLayout, EMSection } from "./_shared";
import { REQUIRED_POLICIES_BY_ARCHETYPE } from "@/lib/entityMapEngine";
import { Badge } from "@/components/ui/badge";

export default function EMSettings() {
  return (
    <EMLayout title="Settings" subtitle="Required-policy matrix by archetype, and operating principles.">
      <EMSection title="Required policies by archetype">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {Object.entries(REQUIRED_POLICIES_BY_ARCHETYPE).map(([code, policies]) => (
            <div key={code} className="border border-border/50 rounded p-2">
              <p className="text-sm font-medium">{code}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {policies.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </EMSection>
      <EMSection title="Operating principles">
        <ul className="list-disc pl-5 text-xs space-y-1 text-muted-foreground">
          <li>Every business should map to at least one legal entity.</li>
          <li>Every revenue stream should have a routing rule. Default is adviser-review-required.</li>
          <li>Missing policy coverage surfaces warnings; sales/publishing modules must respect them.</li>
          <li>Tax/legal-sensitive items are pushed to the adviser queue, never returned as AI advice.</li>
          <li>No filings, no adviser emails, no entity/bank/shareholder changes from Liftor.</li>
        </ul>
      </EMSection>
    </EMLayout>
  );
}