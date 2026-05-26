import { RALayout, RASection } from "./_shared";

export default function RolesSettings() {
  return (
    <RALayout title="Access Settings" subtitle="Defaults for delegation, expiry and review cadence.">
      <RASection title="Defaults">
        <ul className="text-xs space-y-1">
          <li>· Founder/admin: full access. Final approver for all external actions.</li>
          <li>· Adviser: read-only to selected packs unless founder grants otherwise.</li>
          <li>· VA/operator: business/module scoped. Cannot trigger external actions.</li>
          <li>· External-action permission cannot be delegated unless founder explicitly grants it.</li>
          <li>· No raw secrets are exposed to any role.</li>
          <li>· No user invitations are sent automatically.</li>
          <li>· Periodic review cadence: 90 days. Expiry warning window: 30 days.</li>
        </ul>
      </RASection>
      <RASection title="Delegation Agent">
        <p className="text-xs text-muted-foreground">
          Recommends who can handle which work, flags over-permissioned users, flags expired/stale access
          and creates access-review work items in the Master Work Queue. Operates internally only.
        </p>
      </RASection>
    </RALayout>
  );
}