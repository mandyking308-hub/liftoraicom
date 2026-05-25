import { IMLayout, IMSection } from "./_shared";
import { Link } from "react-router-dom";

export default function IMSettings() {
  return (
    <IMLayout title="Settings" subtitle="Governance and integration policy notes.">
      <IMSection title="Governance policy">
        <ul className="text-xs space-y-2 list-disc list-inside text-muted-foreground">
          <li>Liftor never activates a provider automatically. Connecting credentials is a founder-gated action via Access &amp; Secrets.</li>
          <li>Paid APIs are flagged on the catalogue and tracked on the Risks tab. Monitor usage in Vendors and Capacity.</li>
          <li>Webhooks must be configured manually; this module only tracks status.</li>
          <li>Required-before-live integrations block external go-live until connected and approved.</li>
        </ul>
      </IMSection>
      <IMSection title="Linked modules">
        <ul className="text-xs space-y-1">
          <li><Link to="/founder/access-governance" className="text-primary hover:underline">Access &amp; Secrets</Link> — store provider credentials</li>
          <li><Link to="/founder/vendors" className="text-primary hover:underline">Vendors / SaaS</Link> — cost and supplier risk</li>
          <li><Link to="/founder/business-archetypes" className="text-primary hover:underline">Business Archetypes</Link> — drives requirement recommendations</li>
          <li><Link to="/founder/business-templates" className="text-primary hover:underline">Template Factory</Link> — sets recommended integrations per template</li>
          <li><Link to="/founder/command-centre" className="text-primary hover:underline">Command Centre</Link> — approval queue for provider activation</li>
        </ul>
      </IMSection>
    </IMLayout>
  );
}