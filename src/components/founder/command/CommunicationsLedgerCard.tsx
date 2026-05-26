import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessagesSquare, ArrowRight } from "lucide-react";
import { summariseCommunications } from "@/lib/communicationsLedger";

export default function CommunicationsLedgerCard() {
  const { data: s } = useQuery({ queryKey: ["comm-card"], queryFn: summariseCommunications, refetchInterval: 60000 });
  const watch = (s?.awaitingApproval ?? 0) + (s?.blocked ?? 0) + (s?.flagsCritical ?? 0) + (s?.dncFlags ?? 0);
  const tone = watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessagesSquare size={14} className="text-primary" /> Communications Ledger
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Send needs approval</Badge>
          <Link to="/founder/communications" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Records" value={s?.total ?? 0} />
          <Stat label="Drafts" value={s?.drafts ?? 0} tone={s?.drafts ? "warn" : undefined} />
          <Stat label="Approval" value={s?.awaitingApproval ?? 0} tone={s?.awaitingApproval ? "warn" : undefined} />
          <Stat label="Blocked" value={s?.blocked ?? 0} tone={s?.blocked ? "bad" : undefined} />
          <Stat label="Flags H/C" value={s?.flagsCritical ?? 0} tone={s?.flagsCritical ? "bad" : undefined} />
          <Stat label="DNC" value={s?.dncFlags ?? 0} tone={s?.dncFlags ? "warn" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w, i) => <div key={i}>• {w}</div>)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
