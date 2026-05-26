import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection } from "./_shared";
import { fetchRequests, fetchRoles, type AccessRequest, type RoleDefinition } from "@/lib/roleAccessEngine";

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/50",
  pending_founder: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  expired: "bg-muted text-muted-foreground border-border/50",
  revoked: "bg-muted text-muted-foreground border-border/50",
};

export default function RolesAccessRequests() {
  const [rows, setRows] = useState<AccessRequest[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  useEffect(() => { Promise.all([fetchRequests(), fetchRoles()]).then(([r, ro]) => { setRows(r); setRoles(ro); }); }, []);
  const roleById = useMemo(() => new Map(roles.map(r => [r.id, r])), [roles]);
  const pending = rows.filter(r => r.request_status === "draft" || r.request_status === "pending_founder");
  const closed = rows.filter(r => !["draft","pending_founder"].includes(r.request_status));
  const render = (r: AccessRequest) => {
    const role = r.requested_role_id ? roleById.get(r.requested_role_id) : null;
    return (
      <div key={r.id} className="border border-border/50 rounded p-2 text-xs space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${TONE[r.request_status]}`}>{r.request_status}</Badge>
          {role && <Badge variant="outline" className="text-[10px]">{role.role_name}</Badge>}
          {r.founder_approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">founder approval</Badge>}
          {r.is_test_data && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
          <span className="ml-auto text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
        </div>
        <p className="font-medium">{r.requester_name ?? r.requester_email ?? "Unnamed"}</p>
        {r.reason && <p className="text-muted-foreground">{r.reason}</p>}
        {r.requested_scope && <p className="text-[11px] text-muted-foreground">Scope: {r.requested_scope}</p>}
      </div>
    );
  };
  return (
    <RALayout title="Access Requests" subtitle="Founder approval is required for every grant. No invitations are sent automatically.">
      <RASection title={`Pending (${pending.length})`}>
        {pending.length === 0 ? <p className="text-xs text-muted-foreground">No pending requests.</p> : <div className="space-y-2">{pending.map(render)}</div>}
      </RASection>
      <RASection title={`Closed (${closed.length})`}>
        {closed.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : <div className="space-y-2">{closed.map(render)}</div>}
      </RASection>
    </RALayout>
  );
}