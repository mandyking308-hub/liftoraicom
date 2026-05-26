import { useQuery } from "@tanstack/react-query";
import { CommsLayout, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { summariseCommunications, listFlags, listThreads } from "@/lib/communicationsLedger";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function CommsOverview() {
  const { data: s } = useQuery({ queryKey: ["comm-summary"], queryFn: summariseCommunications, refetchInterval: 60000 });
  const { data: flags = [] } = useQuery({ queryKey: ["comm-flags-recent"], queryFn: () => listFlags(20) });
  const { data: threads = [] } = useQuery({ queryKey: ["comm-threads-recent"], queryFn: () => listThreads(10) });
  return (
    <CommsLayout title="Unified Communications Ledger" subtitle="One trail across email, voice, SMS, WhatsApp, social, support, seller, partner and adviser channels. External sends are blocked until approved.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Records" value={s?.total ?? 0} />
        <Stat label="Drafts" value={s?.drafts ?? 0} tone={s?.drafts ? "warn" : undefined} />
        <Stat label="Awaiting approval" value={s?.awaitingApproval ?? 0} tone={s?.awaitingApproval ? "warn" : undefined} />
        <Stat label="Blocked" value={s?.blocked ?? 0} tone={s?.blocked ? "bad" : undefined} />
        <Stat label="Waiting reply" value={s?.waitingReply ?? 0} tone={s?.waitingReply ? "warn" : undefined} />
        <Stat label="Inbound" value={s?.inbound ?? 0} />
        <Stat label="Outbound" value={s?.outbound ?? 0} />
        <Stat label="Safety flags" value={s?.flagsTotal ?? 0} tone={s?.flagsCritical ? "bad" : undefined} />
        <Stat label="DNC flags" value={s?.dncFlags ?? 0} tone={s?.dncFlags ? "warn" : undefined} />
        <Stat label="High/Critical" value={s?.flagsCritical ?? 0} tone={s?.flagsCritical ? "bad" : undefined} />
      </div>

      <Card className="tech-card p-4">
        <h2 className="text-sm font-semibold mb-2">Watch items</h2>
        {(s?.watchItems?.length ?? 0) === 0
          ? <p className="text-xs text-muted-foreground">No watch items. Ledger nominal.</p>
          : <ul className="text-xs space-y-1 text-yellow-300">{s!.watchItems.map((w, i) => <li key={i}>• {w}</li>)}</ul>}
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="tech-card p-4">
          <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold">Recent safety flags</h3><Link to="/founder/communications/ledger" className="text-[11px] text-primary hover:underline">Open ledger</Link></div>
          {flags.length === 0 ? <p className="text-xs text-muted-foreground">No flags.</p> :
            <ul className="text-xs space-y-1">{flags.slice(0, 8).map(f => (
              <li key={f.id} className="flex items-center justify-between border-b border-border/30 pb-1">
                <span className="capitalize">{f.flag_type.replace(/_/g," ")} <span className="text-muted-foreground">— {f.flag_summary ?? ""}</span></span>
                <Badge variant="outline" className="text-[10px] capitalize">{f.severity}</Badge>
              </li>
            ))}</ul>}
        </Card>
        <Card className="tech-card p-4">
          <h3 className="text-sm font-semibold mb-2">Recent threads</h3>
          {threads.length === 0 ? <p className="text-xs text-muted-foreground">No threads yet.</p> :
            <ul className="text-xs space-y-1">{threads.map(t => (
              <li key={t.id} className="flex justify-between border-b border-border/30 pb-1">
                <span>{t.thread_title}</span>
                <span className="text-muted-foreground capitalize">{t.thread_status.replace(/_/g," ")}</span>
              </li>
            ))}</ul>}
        </Card>
      </div>
    </CommsLayout>
  );
}
