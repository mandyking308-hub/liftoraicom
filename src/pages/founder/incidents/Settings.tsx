import { INCLayout, INCSection } from "./_shared";

export default function IncidentsSettings() {
  return (
    <INCLayout title="Settings" subtitle="Operating rules for the Incident, Outage and Continuity engine.">
      <INCSection title="Safety guarantees">
        <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
          <li>Internal incident logging, triage, draft notices and postmortems run live.</li>
          <li>Customer notifications, regulator notifications and public statements require founder approval before sending.</li>
          <li>Payment-provider mutations (refunds, holds, chargebacks) are never auto-executed from this module.</li>
          <li>Every state transition is appended to the timeline log.</li>
        </ul>
      </INCSection>
      <INCSection title="Incident sources">
        <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
          <li>Runtime failures via Runtime Health and AI Gateway error spikes.</li>
          <li>Security signals from Access Governance and Privacy breach events.</li>
          <li>Customer-impacting bugs detected by Support SLA and Complaints engines.</li>
          <li>Manual reports raised by the founder.</li>
        </ul>
      </INCSection>
      <INCSection title="Integrates with">
        <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
          <li>Runtime Health, AI Gateway, Security and Privacy modules feed detections.</li>
          <li>Support and Complaints modules consume customer-impact context.</li>
          <li>Approval Queue gates all external messages and provider mutations.</li>
          <li>Command Centre surfaces live posture; Manuals capture corrective actions.</li>
        </ul>
      </INCSection>
    </INCLayout>
  );
}