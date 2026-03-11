import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
  Shield, Users, Key, ScrollText, Plus, Search, Edit, CheckCircle2,
} from "lucide-react";

const ALL_PERMISSIONS = [
  { key: "view_systems", label: "View Systems" },
  { key: "manage_systems", label: "Manage Systems" },
  { key: "view_automations", label: "View Automations" },
  { key: "manage_automations", label: "Manage Automations" },
  { key: "view_analytics", label: "View Analytics" },
  { key: "manage_users", label: "Manage Users" },
  { key: "manage_roles", label: "Manage Roles" },
  { key: "view_audit_log", label: "View Audit Log" },
  { key: "manage_organisations", label: "Manage Organisations" },
  { key: "view_knowledge", label: "View Knowledge" },
  { key: "manage_knowledge", label: "Manage Knowledge" },
];

const accessLevelClass = (l: string) => {
  if (l === "platform") return "bg-primary/20 text-primary";
  if (l === "organisation") return "bg-blue-500/20 text-blue-400";
  return "bg-muted text-muted-foreground";
};

const AccessControl = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleDialog, setRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", access_level: "organisation" });
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [permDialog, setPermDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", role_id: "", organisation_id: "" });

  const { data: roles = [] } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_roles").select("*").order("created_at");
      return data ?? [];
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data } = await supabase.from("role_permissions").select("*");
      return data ?? [];
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-platform-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_platform_roles").select("*, platform_roles(name, access_level), profiles:user_id(full_name, company_name), organisations(name)");
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const { data: organisations = [] } = useQuery({
    queryKey: ["organisations-list"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("id, name");
      return data ?? [];
    },
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ["access-audit-log"],
    queryFn: async () => {
      const { data } = await supabase.from("access_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const getPermsForRole = (roleId: string) => permissions.filter((p: any) => p.role_id === roleId).map((p: any) => p.permission);

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) { toast.error("Role name required"); return; }
    const { error } = await supabase.from("platform_roles").insert(roleForm);
    if (error) { toast.error(error.message); return; }
    toast.success("Role created");
    setRoleForm({ name: "", description: "", access_level: "organisation" });
    setRoleDialog(false);
    qc.invalidateQueries({ queryKey: ["platform-roles"] });
  };

  const openPermEditor = (role: any) => {
    setEditRole(role);
    setEditPerms(getPermsForRole(role.id));
    setPermDialog(true);
  };

  const togglePerm = (perm: string) => {
    setEditPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const savePermissions = async () => {
    if (!editRole) return;
    // Delete existing then insert new
    await supabase.from("role_permissions").delete().eq("role_id", editRole.id);
    if (editPerms.length > 0) {
      const rows = editPerms.map(p => ({ role_id: editRole.id, permission: p }));
      const { error } = await supabase.from("role_permissions").insert(rows);
      if (error) { toast.error(error.message); return; }
    }
    // Log the change
    await supabase.from("access_audit_log").insert({ action: "permissions_updated", details: `Permissions updated for role: ${editRole.name}`, user_name: "Founder" });
    toast.success("Permissions saved");
    setPermDialog(false);
    qc.invalidateQueries({ queryKey: ["role-permissions"] });
    qc.invalidateQueries({ queryKey: ["access-audit-log"] });
  };

  const handleAssignRole = async () => {
    if (!assignForm.user_id || !assignForm.role_id) { toast.error("User and role required"); return; }
    const { error } = await supabase.from("user_platform_roles").insert({
      user_id: assignForm.user_id,
      role_id: assignForm.role_id,
      organisation_id: assignForm.organisation_id || null,
    });
    if (error) { toast.error(error.message); return; }
    const roleName = roles.find((r: any) => r.id === assignForm.role_id)?.name;
    const userName = profiles.find((p: any) => p.user_id === assignForm.user_id)?.full_name;
    await supabase.from("access_audit_log").insert({ user_id: assignForm.user_id, action: "role_assigned", details: `${userName || "User"} assigned role: ${roleName}`, user_name: userName || "" });
    toast.success("Role assigned");
    setAssignDialog(false);
    setAssignForm({ user_id: "", role_id: "", organisation_id: "" });
    qc.invalidateQueries({ queryKey: ["user-platform-roles"] });
    qc.invalidateQueries({ queryKey: ["access-audit-log"] });
  };

  const handleRemoveAssignment = async (id: string, userName: string, roleName: string) => {
    const { error } = await supabase.from("user_platform_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("access_audit_log").insert({ action: "role_removed", details: `${userName} removed from role: ${roleName}`, user_name: userName });
    toast.success("Role removed");
    qc.invalidateQueries({ queryKey: ["user-platform-roles"] });
    qc.invalidateQueries({ queryKey: ["access-audit-log"] });
  };

  const filteredAudit = auditLog.filter((e: any) =>
    !search || e.action?.toLowerCase().includes(search.toLowerCase()) || e.user_name?.toLowerCase().includes(search.toLowerCase()) || e.details?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield size={24} className="text-primary" /> Role & Access Control</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage platform roles, permissions, and user access</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Roles Defined", value: roles.length, icon: Key },
            { label: "Users Assigned", value: userRoles.length, icon: Users },
            { label: "Permissions", value: permissions.length, icon: CheckCircle2 },
            { label: "Audit Events", value: auditLog.length, icon: ScrollText },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5">
                <s.icon size={18} className="text-primary mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="roles">
          <TabsList>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="users">User Assignments</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
                <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> New Role</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Role Name *</Label><Input value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>Description</Label><Input value={roleForm.description} onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))} /></div>
                    <div>
                      <Label>Access Level</Label>
                      <Select value={roleForm.access_level} onValueChange={v => setRoleForm(p => ({ ...p, access_level: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="platform">Platform</SelectItem>
                          <SelectItem value="organisation">Organisation</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateRole} className="w-full">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {roles.map((role: any) => {
                const perms = getPermsForRole(role.id);
                const assignedCount = userRoles.filter((ur: any) => ur.role_id === role.id).length;
                return (
                  <Card key={role.id} className="bg-card border-border/50">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold">{role.name}</p>
                            <Badge variant="secondary" className={accessLevelClass(role.access_level)}>{role.access_level}</Badge>
                            <span className="text-xs text-muted-foreground">{assignedCount} users</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{role.description || "—"}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {perms.map((p: string) => (
                              <Badge key={p} variant="outline" className="text-xs">{p.replace(/_/g, " ")}</Badge>
                            ))}
                            {perms.length === 0 && <span className="text-xs text-muted-foreground">No permissions</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openPermEditor(role)}><Edit size={14} className="mr-1" /> Permissions</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Permission Editor Dialog */}
            <Dialog open={permDialog} onOpenChange={setPermDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Edit Permissions — {editRole?.name}</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {ALL_PERMISSIONS.map(p => (
                    <div key={p.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                      <Checkbox checked={editPerms.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} id={p.key} />
                      <label htmlFor={p.key} className="text-sm cursor-pointer flex-1">{p.label}</label>
                    </div>
                  ))}
                </div>
                <Button onClick={savePermissions} className="w-full mt-2">Save Permissions</Button>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* User Assignments Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogTrigger asChild><Button><Plus size={16} className="mr-2" /> Assign Role</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign Role to User</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>User</Label>
                      <Select value={assignForm.user_id} onValueChange={v => setAssignForm(p => ({ ...p, user_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                        <SelectContent>
                          {profiles.map((p: any) => (
                            <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.company_name || p.user_id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select value={assignForm.role_id} onValueChange={v => setAssignForm(p => ({ ...p, role_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          {roles.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Organisation (optional)</Label>
                      <Select value={assignForm.organisation_id} onValueChange={v => setAssignForm(p => ({ ...p, organisation_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {organisations.map((o: any) => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAssignRole} className="w-full">Assign</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No role assignments.</TableCell></TableRow>
                    ) : userRoles.map((ur: any) => (
                      <TableRow key={ur.id}>
                        <TableCell className="font-medium">{(ur.profiles as any)?.full_name || "—"}</TableCell>
                        <TableCell>{(ur.platform_roles as any)?.name || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className={`text-xs ${accessLevelClass((ur.platform_roles as any)?.access_level)}`}>{(ur.platform_roles as any)?.access_level}</Badge></TableCell>
                        <TableCell>{(ur.organisations as any)?.name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(ur.assigned_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveAssignment(ur.id, (ur.profiles as any)?.full_name || "", (ur.platform_roles as any)?.name || "")}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search audit log..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>

            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudit.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No audit events.</TableCell></TableRow>
                    ) : filteredAudit.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), "MMM d, h:mm a")}</TableCell>
                        <TableCell className="font-medium">{e.user_name || "System"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.action.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{e.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
};

export default AccessControl;
