import { PRLayout, PRSection, NoAutoActionsBanner } from "./_shared";

export default function PrivacySettings() {
  return (
    <PRLayout title="Privacy settings" subtitle="Module defaults, integration hooks and approval policy for data protection operations.">
      <NoAutoActionsBanner />
      <PRSection title="Safety protocol">
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Identity must be verified before any export, deletion or correction is executed.</li>
          <li>Every DSAR response, deletion and export creates an approval item before going out.</li>
          <li>Regulator and customer breach notices require founder/legal approval.</li>
          <li>Marketing and call outreach is blocked when consent is unknown or withdrawn.</li>
          <li>Processors without a DPA are surfaced until one is in place.</li>
        </ul>
      </PRSection>
      <PRSection title="Integrations">
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>CRM — contact lookup and consent enforcement.</li>
          <li>Voice / Sales Consent — recording opt-in verification.</li>
          <li>Vendor Management — sub-processor list and DPA status.</li>
          <li>Access / Secrets — credential rotation after a breach.</li>
          <li>Approval Queue — every deletion, export and notice goes here.</li>
          <li>Command Centre — surfaced DSAR and breach alerts.</li>
          <li>Manuals — privacy SOPs and runbooks.</li>
        </ul>
      </PRSection>
      <PRSection title="Default deadlines">
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>DSAR response: 30 calendar days from receipt.</li>
          <li>Breach assessment to regulator notice (where required): within 72 hours of awareness.</li>
          <li>Customer breach notification (high risk): without undue delay after assessment.</li>
        </ul>
      </PRSection>
    </PRLayout>
  );
}