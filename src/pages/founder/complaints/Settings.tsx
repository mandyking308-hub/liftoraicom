import { CMPLayout, CMPSection } from "./_shared";

export default function ComplaintsSettings() {
  return (
    <CMPLayout title="Settings" subtitle="Safety protocols and integration hooks for the Complaints, Refunds + Disputes Engine.">
      <CMPSection title="Safety protocols" description="These rules are hard-coded and cannot be bypassed by the Complaints Agent.">
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          <li>Every refund creates a founder approval item. No automatic payment-provider mutation.</li>
          <li>Every customer-facing reply, credit and account change is approval-gated.</li>
          <li>Never make legal/compliance admissions without approval.</li>
          <li>Repeat issues and churn signals flagged for review.</li>
          <li>Ticket reopens automatically if customer responds after resolution.</li>
        </ul>
      </CMPSection>
      <CMPSection title="Integrations" description="Wired so the Complaints Engine receives signals and writes back into the operating loop.">
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          <li>Support SLA — converts a ticket to a complaint case when severity or sentiment crosses threshold.</li>
          <li>Quote-to-Cash — flags refund requests against invoices/payments.</li>
          <li>Delivery & Fulfilment — links delivery proof as evidence.</li>
          <li>CRM — attaches case history to the contact and customer record.</li>
          <li>Finance Pack — reflects approved refunds in confirmed revenue and ledger.</li>
          <li>Compliance — escalates legal/regulatory complaints to the Legal Console.</li>
          <li>Approval Queue — every refund, credit, customer message and legal response routed here.</li>
          <li>Command Centre — surfaces critical, escalated and pending-approval cases.</li>
          <li>Manuals — Complaints SOP, refund policy and dispute response playbook live in the Founder Manual.</li>
        </ul>
      </CMPSection>
      <CMPSection title="Policy match checker" description="The agent matches each complaint against the configured refund policy and flags mismatches before recommending action.">
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          <li>match — within policy, recommend approve.</li>
          <li>partial — partial refund or credit recommended.</li>
          <li>out_of_policy — escalate for founder decision.</li>
          <li>no_policy — block action and request policy update.</li>
        </ul>
      </CMPSection>
    </CMPLayout>
  );
}