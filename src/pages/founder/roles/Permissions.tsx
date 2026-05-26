import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RALayout, RASection } from "./_shared";
import { fetchRoles, fetchPermissions, SENSITIVE_MODULES, type PermissionRow, type RoleDefinition } from "@/lib/roleAccessEngine";

export default function RolesPermissions() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  useEffect(() => { Promise.all([fetchRoles(), fetchPermissions()]).then(([r, p]) => { setRoles(r); setPerms(p); }); }, []);
  const roleById = useMemo(() => new Map(roles.map(r => [r.id, r])), [roles]);
  const sensitive = useMemo(() => new Set(SENSITIVE_MODULES.map(s => s.module)), []);
  const flag = (b: boolean) => b ? <span className="text-emerald-400">✓</span> : <span className="text-muted-foreground">·</span>;
  return (
    <RALayout title="Permission Matrix" subtitle="Role × module permission flags. External-action permission is highlighted — it routes to founder approval.">
      <RASection title={`Permissions (${perms.length})`}>
        {perms.length === 0 ? <p className="text-xs text-muted-foreground">No per-module permissions defined yet. Founder/admin has full access by default; other roles inherit their default_permissions until an explicit row is added here.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="text-center">View</TableHead>
                <TableHead className="text-center">Edit</TableHead>
                <TableHead className="text-center">Approve</TableHead>
                <TableHead className="text-center">Export</TableHead>
                <TableHead className="text-center">Delete</TableHead>
                <TableHead className="text-center">External action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perms.map(p => {
                const r = roleById.get(p.role_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{r?.role_name ?? p.role_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">
                      {p.module_name} {sensitive.has(p.module_name) && <Badge variant="outline" className="ml-1 text-[10px] bg-orange-500/15 text-orange-300 border-orange-500/30">sensitive</Badge>}
                    </TableCell>
                    <TableCell className="text-center">{flag(p.can_view)}</TableCell>
                    <TableCell className="text-center">{flag(p.can_edit)}</TableCell>
                    <TableCell className="text-center">{flag(p.can_approve)}</TableCell>
                    <TableCell className="text-center">{flag(p.can_export)}</TableCell>
                    <TableCell className="text-center">{flag(p.can_delete)}</TableCell>
                    <TableCell className="text-center">
                      {p.can_trigger_external_action
                        ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">granted</Badge>
                        : <span className="text-muted-foreground">·</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </RASection>
    </RALayout>
  );
}