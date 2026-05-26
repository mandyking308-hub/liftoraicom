import { NCLayout, NCSection } from "./_shared";

export default function NotificationsSettings() {
  return (
    <NCLayout title="Notification Settings" subtitle="External channels (email, SMS, push) are off by default and require founder approval before activation.">
      <NCSection title="Channels">
        <ul className="text-xs space-y-1">
          <li>· Internal UI inbox — <span className="text-emerald-400">Live</span></li>
          <li>· Founder mobile push — <span className="text-yellow-300">Locked (requires founder activation)</span></li>
          <li>· Email — <span className="text-yellow-300">Locked (approval-gated)</span></li>
          <li>· SMS — <span className="text-yellow-300">Locked (approval-gated)</span></li>
          <li>· Slack / Teams — <span className="text-yellow-300">Locked (approval-gated)</span></li>
        </ul>
      </NCSection>
      <NCSection title="Notification Agent">
        <p className="text-xs text-muted-foreground">
          Gathers alerts across Liftor, deduplicates noisy alerts, ranks by severity and value,
          escalates serious items, and creates master work items where needed. Operates internally only.
        </p>
      </NCSection>
    </NCLayout>
  );
}