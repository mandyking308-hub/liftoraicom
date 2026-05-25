import { DLLayout, DLSection } from "./_shared";

export default function DeliverySettings() {
  return (
    <DLLayout title="Settings" subtitle="Delivery and Fulfilment Engine safety configuration.">
      <DLSection title="Safety protocol" description="Hard rules enforced by the engine.">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>Internal fulfilment planning and task creation run live.</li>
          <li>Customer-facing delivery messages require founder approval (or explicit pre-approved rule).</li>
          <li>Portal invites are approval-gated.</li>
          <li>External file sharing is approval-gated.</li>
          <li>Paid/provider mutations require approval.</li>
          <li>The Delivery Agent never externally messages without approval.</li>
        </ul>
      </DLSection>
      <DLSection title="Automation hooks" description="What the engine does automatically (internal only).">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>On revenue confirmation in Quote-to-Cash → create a delivery_order.</li>
          <li>Generate delivery_tasks from the product/service template.</li>
          <li>Warn when delivery due date is at risk.</li>
          <li>Warn when business is over capacity.</li>
          <li>Trigger customer onboarding internally if required.</li>
          <li>Trigger support / customer success after delivery.</li>
        </ul>
      </DLSection>
      <DLSection title="Integrations">
        <ul className="text-xs space-y-1 list-disc pl-4">
          <li>Quote-to-Cash · Customer Onboarding · CRM · Customer Success · Support SLA · Finance Pack · Command Centre · Manuals</li>
        </ul>
      </DLSection>
    </DLLayout>
  );
}