import { useQuery } from "@tanstack/react-query";
import { CommsLayout, ChannelBadge, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listRecords } from "@/lib/communicationsLedger";

export default function CommsReceived() {
  const { data: rows = [] } = useQuery({ queryKey: ["comm-received"], queryFn: () => listRecords({ direction: "inbound", limit: 300 }) });
  return (
    <CommsLayout title="Received messages" subtitle="Inbound messages logged from webhooks and provider events. Routing to support / sales / seller modules happens via the Event Bus, not from this page.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">Received</th><th className="text-left p-2">Channel</th><th className="text-left p-2">Subject</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Status</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No inbound messages.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.received_at ?? r.created_at).toLocaleString()}</td>
                <td className="p-2"><ChannelBadge channel={r.channel} /></td>
                <td className="p-2 max-w-[260px] truncate">{r.subject ?? "—"}</td>
                <td className="p-2 max-w-[360px] truncate text-muted-foreground">{r.summary ?? "—"}</td>
                <td className="p-2"><StatusBadge status={r.communication_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </CommsLayout>
  );
}
