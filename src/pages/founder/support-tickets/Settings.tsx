import { STLayout, STSection } from "./_shared";

export default function SupportSettings() {
  return (
    <STLayout title="Settings" subtitle="Support Ticketing + SLA Engine safety configuration.">
      <STSection title="Safety protocol" description="Hard rules enforced by the engine.">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>Internal triage and draft replies run live.</li>
          <li>Customer-facing replies require founder approval (or explicit pre-approved rule).</li>
          <li>Refunds, credits, account changes and external notifications are approval-gated.</li>
          <li>The Support Agent never sends a customer reply on its own.</li>
          <li>Vulnerable, angry, legal, refund, payment and complaint cases are escalated automatically.</li>
        </ul>
      </STSection>
      <STSection title="Automation hooks" description="What the engine does automatically (internal only).">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>Create ticket from customer interaction, transcript, or message.</li>
          <li>Classify severity and sentiment.</li>
          <li>Assign SLA deadline from the matching policy.</li>
          <li>Draft reply internally from verified knowledge.</li>
          <li>Create an approval item before any customer-facing reply.</li>
          <li>Reopen ticket if customer responds after resolution.</li>
          <li>Flag repeat issues and churn risk.</li>
        </ul>
      </STSection>
      <STSection title="Integrations">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>CRM · Customer Success · Complaints/Refunds · Delivery · Customer Voice · Approval Queue · Command Centre · Manuals</li>
        </ul>
      </STSection>
    </STLayout>
  );
}