import { Card } from "@/components/ui/card";

const ANCHORS: { id: string; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'sec-customer-journey', label: 'Journey' },
  { id: 'sec-next-actions', label: "Today's Actions" },
  { id: 'sec-agents', label: 'Agents' },
  { id: 'sec-handovers', label: 'Handovers' },
  { id: 'sec-crm', label: 'CRM' },
  { id: 'sec-outbound', label: 'Outbound' },
  { id: 'sec-engagement', label: 'Engagement' },
  { id: 'sec-marketing', label: 'Marketing' },
  { id: 'sec-approvals', label: 'Approvals' },
  { id: 'sec-commercial', label: 'Proposals/Demos' },
  { id: 'sec-finance', label: 'Finance' },
  { id: 'sec-delivery', label: 'Suppliers' },
  { id: 'sec-autonomy', label: 'Autonomy' },
  { id: 'sec-monitoring', label: 'Monitoring' },
  { id: 'sec-manual', label: 'Manual' },
  { id: 'sec-legacy', label: 'Legacy' },
];

export default function CommandCentreStickyNav() {
  return (
    <Card className="sticky top-2 z-30 bg-card/95 backdrop-blur border-border/50">
      <div className="flex gap-1 overflow-x-auto p-2 text-xs">
        {ANCHORS.map(a => (
          <a key={a.id} href={`#${a.id}`} className="shrink-0 px-2 py-1 rounded border border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition">
            {a.label}
          </a>
        ))}
      </div>
    </Card>
  );
}