import { useQuery } from "@tanstack/react-query";
import { CommsLayout, ChannelBadge, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listRecords } from "@/lib/communicationsLedger";

export default function CommsByContact() {
  const { data: rows = [] } = useQuery({ queryKey: ["comm-by-contact"], queryFn: () => listRecords({ limit: 500 }) });
  const groups: Record<string, typeof rows> = {};
  for (const r of rows) {
    const key = r.identity_profile_id ?? r.contact_id ?? r.customer_id ?? r.seller_id ?? r.partner_id ?? "unlinked";
    (groups[key] ??= []).push(r);
  }
  return (
    <CommsLayout title="By contact" subtitle="Timelines grouped by identity profile or contact reference.">
      {Object.entries(groups).map(([k, list]) => (
        <Card key={k} className="tech-card p-3">
          <div className="text-xs font-semibold mb-2">Contact: <span className="text-primary">{k}</span> <span className="text-muted-foreground">({list.length} msg)</span></div>
          <ul className="text-xs space-y-1">
            {list.slice(0, 12).map(r => (
              <li key={r.id} className="flex items-center gap-2 border-b border-border/30 pb-1">
                <span className="text-muted-foreground w-32 shrink-0">{new Date(r.created_at).toLocaleString()}</span>
                <ChannelBadge channel={r.channel} />
                <span className="capitalize text-muted-foreground">{r.direction}</span>
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
