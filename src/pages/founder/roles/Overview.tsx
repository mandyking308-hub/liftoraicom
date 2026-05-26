import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection, RAStat } from "./_shared";
import { fetchRoles, fetchAssignments, fetchPermissions, fetchRequests, fetchReviewEvents, summarize, SENSITIVITY_META, SENSITIVE_MODULES, type RoleDefinition, type UserRoleAssignment, type PermissionRow, type AccessRequest, type AccessReviewEvent, type RoleAccessSummary } from "@/lib/roleAccessEngine";

export default function RolesOverview() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [assigns, setAssigns] = useState<UserRoleAssignment[]>([]);
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [reviews, setReviews] = useState<AccessReviewEvent[]>([]);
  const [sum, setSum] = useState<RoleAccessSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchRoles(), fetchAssignments(), fetchPermissions(), fetchRequests(), fetchReviewEvents()])
      .then(([r, a, p, q, v]) => {
        setRoles(r); setAssigns(a); setPerms(p); setRequests(q); setReviews(v);
        setSum(summarize(r, a, p, q, v));
      });
  }, []);
  return (
    <RALayout title="Role-Based Access & Delegation"
      subtitle="Internal role mapping, permission checks, access recommendations and delegation planning run live. Granting real access, inviting users, changing roles or exposing secrets requires founder/admin approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <RAStat label="Active users" value={sum?.active_users} />
        <RAStat label="Proposed" value={sum?.proposed} />
        <RAStat label="Requested" value={sum?.requested} />
        <RAStat label="Expiring 30d" value={sum?.expiring_30d} tone={(sum?.expiring_30d ?? 0) > 0 ? "warn" : "ok"} />
        <RAStat label="Expired" value={sum?.expired} tone={(sum?.expired ?? 0) > 0 ? "bad" : "ok"} />
        <RAStat label="Pending requests" value={sum?.pending_requests} tone={(sum?.pending_requests ?? 0) > 0 ? "warn" : "ok"} />
        <RAStat label="Over-permissioned" value={sum?.over_permissioned} tone={(sum?.over_permissioned ?? 0) > 0 ? "bad" : "ok"} />
        <RAStat label="External action grants" value={sum?.external_action_grants} tone={(sum?.external_action_grants ?? 0) > 0 ? "warn" : "ok"} />
        <RAStat label="Reviews pending" value={sum?.pending_reviews} />
        <RAStat label="Test rows" value={sum?.test_records} hint="excluded from KPIs" />
      </div>
      {sum?.top_action && (
        <div className="border border-primary/30 rounded p-3 bg-primary/5 text-sm">
          <span className="text-[10px] uppercase text-muted-foreground mr-2">Top recommended action</span>
          {sum.top_action}
        </div>
      )}
      <RASection title={`Role library (${roles.length})`} description="Sensitivity drives which modules a role may touch. External-action permission stays with founder/admin unless explicitly delegated.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {roles.map(r => {
            const sm = SENSITIVITY_META[r.sensitivity_level] ?? SENSITIVITY_META.medium;
            return (
              <div key={r.id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.role_code}</Badge>
                  {!r.active && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Inactive</Badge>}
                </div>
                <p className="font-medium">{r.role_name}</p>
                {r.role_description && <p className="text-muted-foreground">{r.role_description}</p>}
              </div>
            );
          })}
        </div>
      </RASection>
      <RASection title="Sensitive modules" description="Elevated roles only. External-action permission cannot be delegated unless the founder explicitly grants it.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {SENSITIVE_MODULES.map(s => (
            <div key={s.module} className="border border-border/50 rounded p-2">
              <p className="font-medium">{s.module}</p>
              <p className="text-[11px] text-muted-foreground">{s.reason}</p>
            </div>
          ))}
        </div>
      </RASection>
    </RALayout>
  );
}