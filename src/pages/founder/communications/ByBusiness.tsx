import { useQuery } from "@tanstack/react-query";
import { CommsLayout, ChannelBadge, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listRecords } from "@/lib/communicationsLedger";

export default function CommsByBusiness() {
  const { data: rows = [] } = useQuery({ queryKey: ["comm-by-business"], queryFn: () => listRecords({ limit: 500 }) });
  const groups: Record<string, typeof rows> = {};
  for (const r of rows) (groups[r.business_id ?? "unassigned"] ??= []).push(r);
  return (
    <CommsLayout title="By business" subtitle="Communication activity grouped by business tenant.">
      {Object.entries(groups).map(([k, list]) => (
        <Card key={k} className="tech-card p-3">
          <div className="text-xs font-semibold mb-2">Business: <span className="text-primary">{k}</span> <span className="text-muted-foreground">({list.length} msg)</span></div>
          <ul className="text-xs space-y-1">
            {list.slice(0, 10).map(r => (
              <li key={r.id} className="flex items-center gap-2 border-b border-border/30 pb-1">
                <ChannelBadge channel={r.channel} />
                <span className="flex-1 truncate">{r.subject ?? r.summary ?? "—"}</span>
                <StatusBadge status={r.communication_status} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {rows.length === 0 && <Card className="tech-card p-6 text-center text-xs text-muted-foreground">No communications logged.</Card>}
    </CommsLayout>
  );
}
