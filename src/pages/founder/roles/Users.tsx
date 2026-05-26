import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection } from "./_shared";
import { fetchAssignments, fetchRoles, STATUS_META, SENSITIVITY_META, type UserRoleAssignment, type RoleDefinition } from "@/lib/roleAccessEngine";

export default function RolesUsers() {
  const [assigns, setAssigns] = useState<UserRoleAssignment[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  useEffect(() => {
    Promise.all([fetchAssignments(), fetchRoles()]).then(([a, r]) => { setAssigns(a); setRoles(r); });
  }, []);
  const roleById = useMemo(() => new Map(roles.map(r => [r.id, r])), [roles]);
  const active = assigns.filter(a => a.access_status === "active");
  const proposed = assigns.filter(a => ["proposed","requested"].includes(a.access_status));
  const offboard = assigns.filter(a => ["expired","suspended","revoked"].includes(a.access_status));
  const block = (title: string, list: UserRoleAssignment[]) => (
    <RASection title={`${title} (${list.length})`}>
      {list.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
        <div className="space-y-2 text-xs">
          {list.map(a => {
            const r = a.role_id ? roleById.get(a.role_id) : null;
            const sm = STATUS_META[a.access_status] ?? STATUS_META.proposed;
            const sens = r ? SENSITIVITY_META[r.sensitivity_level] : null;
            const expSoon = a.expires_at && Date.parse(a.expires_at) < Date.now() + 30*24*3600*1000;
            return (
              <div key={a.id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
                  {sens && <Badge variant="outline" className={`text-[10px] ${sens.cls}`}>{sens.label}</Badge>}
                  <Badge variant="outline" className="text-[10px]">{a.assignment_scope}</Badge>
                  {a.is_test_data && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {a.expires_at ? <span className={expSoon ? "text-yellow-300" : ""}>Expires {new Date(a.expires_at).toLocaleDateString()}</span> : "No expiry"}
                  </span>
                </div>
                <p className="font-medium">{a.display_name ?? a.email ?? "Unnamed"} {r ? `· ${r.role_name}` : ""}</p>
                <p className="text-muted-foreground">{a.email ?? "—"} {a.business_id ? `· business ${a.business_id.slice(0, 8)}` : ""}</p>
              </div>
            );
          })}
        </div>
      )}
    </RASection>
  );
  return (
    <RALayout title="Users & Assignments" subtitle="Proposed and active assignments. Inviting or activating a user requires founder/admin action.">
      {block("Active", active)}
      {block("Proposed / requested", proposed)}
      {block("Offboarding / revoked / expired", offboard)}
    </RALayout>
  );
}