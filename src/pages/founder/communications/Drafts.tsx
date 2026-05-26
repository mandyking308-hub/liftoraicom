import { useQuery } from "@tanstack/react-query";
import { CommsLayout, ChannelBadge, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRecords } from "@/lib/communicationsLedger";

export default function CommsDrafts() {
  const { data: drafts = [] } = useQuery({ queryKey: ["comm-drafts"], queryFn: () => listRecords({ status: "draft", limit: 200 }) });
  const { data: pending = [] } = useQuery({ queryKey: ["comm-approval"], queryFn: () => listRecords({ status: "approval_required", limit: 200 }) });
  return (
    <CommsLayout title="Drafts awaiting approval" subtitle="Outbound messages stay in draft / approval_required until a founder or admin approves. No external provider is contacted from this page.">
      <Card className="tech-card p-3">
        <div className="text-xs font-semibold mb-2 flex items-center gap-2">Approval required <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{pending.length}</Badge></div>
        {pending.length === 0 ? <p className="text-xs text-muted-foreground">Nothing waiting.</p> :
          <ul className="text-xs space-y-1">{pending.map(r => (
            <li key={r.id} className="flex items-center gap-2 border-b border-border/30 pb-1">
              <ChannelBadge channel={r.channel} />
              <span className="flex-1 truncate">{r.subject ?? r.summary}</span>
              <StatusBadge status={r.communication_status} />
            </li>
          ))}</ul>}
      </Card>
      <Card className="tech-card p-3">
        <div className="text-xs font-semibold mb-2">Drafts ({drafts.length})</div>
        {drafts.length === 0 ? <p className="text-xs text-muted-foreground">No drafts.</p> :
          <ul className="text-xs space-y-1">{drafts.map(r => (
            <li key={r.id} className="flex items-center gap-2 border-b border-border/30 pb-1">
              <ChannelBadge channel={r.channel} />
              <span className="flex-1 truncate">{r.subject ?? r.summary}</span>
              <StatusBadge status={r.communication_status} />
            </li>
          ))}</ul>}
      </Card>
    </CommsLayout>
  );
}
