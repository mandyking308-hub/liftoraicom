import { COLayout, COSection } from "./_shared";

export default function CustomerOnboardingSettings() {
  return (
    <COLayout title="Settings" subtitle="Customer Onboarding Engine safety configuration.">
      <COSection title="Safety protocol" description="Hard rules enforced by the engine.">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>Internal onboarding planning and task creation run live.</li>
          <li>Welcome emails, forms, portal invites and external shares require founder approval (or explicit pre-approved rule).</li>
          <li>Account setup messages require approval before send.</li>
          <li>The Onboarding Agent never externally messages without approval.</li>
          <li>Onboarding is only marked complete when required checklist items are done.</li>
        </ul>
      </COSection>
      <COSection title="Automation hooks" description="What the engine does automatically (internal only).">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>On confirmed sale or delivery order → create an onboarding_record.</li>
          <li>Generate checklist items from the matching product template.</li>
          <li>Prepare welcome pack and portal invite internally.</li>
          <li>Create an approval item before any customer-facing send.</li>
          <li>Warn if a customer is stuck waiting for info.</li>
          <li>Warn if onboarding is overdue.</li>
          <li>Trigger support / customer success handoff once complete.</li>
        </ul>
      </COSection>
      <COSection title="Integrations">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>Delivery & Fulfilment · CRM · Customer Success · Support SLA · Approval Queue · Command Centre · Manuals</li>
        </ul>
      </COSection>
    </COLayout>
  );
}