import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock } from "lucide-react";
import { fetchRoles, fetchAssignments, fetchPermissions, fetchRequests, fetchReviewEvents, summarize, type RoleAccessSummary } from "@/lib/roleAccessEngine";

export default function RoleAccessCard() {
  const [sum, setSum] = useState<RoleAccessSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchRoles(), fetchAssignments(), fetchPermissions(), fetchRequests(), fetchReviewEvents()])
      .then(([r, a, p, q, v]) => setSum(summarize(r, a, p, q, v))).catch(() => setSum(null));
  }, []);
  const tone = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad = (n: number) => n > 0 ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Role-Based Access & Delegation
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> No invites / no grants
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">
          Live role mapping, delegation recommendations and access reviews. Inviting users,
          changing roles or sharing externally always requires founder/admin action.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <Tile to="/founder/roles/users" label="Active" value={sum?.active_users} />
          <Tile to="/founder/roles/users" label="Proposed" value={sum?.proposed} />
          <Tile to="/founder/roles/access-requests" label="Pending req." value={sum?.pending_requests} cls={tone(sum?.pending_requests ?? 0)} />
          <Tile to="/founder/roles/users" label="Expiring 30d" value={sum?.expiring_30d} cls={tone(sum?.expiring_30d ?? 0)} />
          <Tile to="/founder/roles/users" label="Expired" value={sum?.expired} cls={bad(sum?.expired ?? 0)} />
          <Tile to="/founder/roles/permissions" label="Over-permd" value={sum?.over_permissioned} cls={bad(sum?.over_permissioned ?? 0)} />
          <Tile to="/founder/roles/permissions" label="Ext. grants" value={sum?.external_action_grants} cls={tone(sum?.external_action_grants ?? 0)} />
        </div>
        {sum?.top_action && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top recommended action</p>
            <p className="text-sm font-medium">{sum.top_action}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/roles" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/roles/users" className="text-primary hover:underline">Users</Link>
          <Link to="/founder/roles/permissions" className="text-primary hover:underline">Permissions</Link>
          <Link to="/founder/roles/delegation" className="text-primary hover:underline">Delegation</Link>
          <Link to="/founder/roles/access-requests" className="text-primary hover:underline">Requests</Link>
          <Link to="/founder/roles/audit" className="text-primary hover:underline">Audit</Link>
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