import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, Lock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchPortalProfiles, fetchPortalUsers, fetchPortalInvites, fetchPortalEvents, summarize, type PortalSummary } from "@/lib/portalsEngine";

export default function PortalsCard() {
  const [sum, setSum] = useState<PortalSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchPortalProfiles(), fetchPortalUsers(), fetchPortalInvites(), fetchPortalEvents()])
      .then(([p,u,i,e]) => setSum(summarize(p,u,i,e)))
      .catch(() => setSum(null));
  }, []);
  const tone = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DoorOpen size={14} className="text-primary" />
          External Portals Architecture
          <Badge variant="outline" className="ml-auto text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">Internal only</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Invites approval-gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Customer, seller, partner, adviser and upload portals are scaffolded but not public. No invites send and no documents share until you approve.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/portals"          label="Profiles"         value={sum?.total_profiles} />
          <Tile to="/founder/portals"          label="Live"             value={sum?.live} />
          <Tile to="/founder/portals"          label="Internal only"    value={sum?.internal_only} />
          <Tile to="/founder/portals"          label="Active users"     value={sum?.active_users} />
          <Tile to="/founder/portals"          label="Approval pending" value={sum?.approval_pending} cls={tone(sum?.approval_pending ?? 0)} />
          <Tile to="/founder/portals/access"   label="Suspicious"       value={sum?.suspicious_events}  cls={bad(sum?.suspicious_events ?? 0)} />
        </div>
        {(sum?.risk_warnings.length ?? 0) > 0 && (
          <div className="border border-red-500/30 rounded p-2 bg-red-500/5 space-y-1">
            <div className="flex items-center gap-2"><AlertTriangle size={12} className="text-red-400" /><p className="text-[10px] uppercase text-muted-foreground">Risk warnings</p></div>
            {sum!.risk_warnings.slice(0, 3).map((w, i) => <p key={i} className="text-[11px] text-red-300">• {w}</p>)}
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/portals" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/portals/customer" className="text-primary hover:underline">Customer</Link>
          <Link to="/founder/portals/seller" className="text-primary hover:underline">Seller</Link>
          <Link to="/founder/portals/adviser" className="text-primary hover:underline">Adviser</Link>
          <Link to="/founder/portals/access" className="text-primary hover:underline">Access events</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}